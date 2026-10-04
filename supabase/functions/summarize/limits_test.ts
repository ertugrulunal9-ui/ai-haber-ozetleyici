import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "./errors.ts";
import { withReservedUsage } from "./handlers.ts";
import { handleRelatedSources } from "./semantic.ts";
import {
  assertAiBurstRateLimit,
  assertLightweightRateLimit,
  releaseUsage,
  reserveUsage,
} from "./limits.ts";
import { DbClient, LimitBucketState, LimitState } from "./types.ts";

const TODAY = "2026-10-03";
const USER = "11111111-1111-1111-1111-111111111111";
const IP = "203.0.113.7";

// Mirrors the consume_usage / refund_usage SQL functions in memory.
function createFakeDb(options: { failRpc?: boolean } = {}) {
  const counts = new Map<string, number>();
  const db = {
    rpc(fn: string, args: Record<string, unknown>) {
      if (options.failRpc) {
        return Promise.resolve({ data: null, error: { message: "boom" } });
      }

      const key = `${args.p_key}|${args.p_date}`;
      const current = counts.get(key) ?? 0;

      if (fn === "consume_usage") {
        const limit = Number(args.p_limit);
        if (limit <= 0 || current >= limit) {
          return Promise.resolve({ data: null, error: null });
        }
        counts.set(key, current + 1);
        return Promise.resolve({ data: current + 1, error: null });
      }

      if (fn === "refund_usage") {
        if (counts.has(key)) counts.set(key, Math.max(0, current - 1));
        return Promise.resolve({ data: null, error: null });
      }

      throw new Error(`unexpected rpc ${fn}`);
    },
  };

  return {
    db: db as unknown as DbClient,
    count: (key: string, date = TODAY) => counts.get(`${key}|${date}`) ?? 0,
    set: (key: string, value: number, date = TODAY) => counts.set(`${key}|${date}`, value),
  };
}

function bucketState(deviceRemaining: number): LimitBucketState {
  return {
    deviceCount: 10 - deviceRemaining,
    deviceRemaining,
    ipKey: "",
    ipCount: 0,
    ipRemaining: 40,
  };
}

function createLimits(summaryRemaining = 10): LimitState {
  return {
    clientIp: IP,
    summary: bucketState(summaryRemaining),
    assistant: bucketState(10),
  };
}

function usageParams(db: DbClient, bucket: "summary" | "assistant" = "summary") {
  return { db, today: TODAY, limits: createLimits(), deviceId: USER, bucket };
}

async function rejectsWith(fn: () => Promise<unknown>, status: number, body: Record<string, unknown>) {
  const error = await assertRejects(fn, HttpError);
  assertEquals(error.status, status);
  assertEquals(error.body, body);
}

Deno.test("reserveUsage: consumes device and ip counters and reports remaining", async () => {
  const fake = createFakeDb();
  const next = await reserveUsage(usageParams(fake.db));

  assertEquals(fake.count(USER), 1);
  assertEquals(fake.count(`ip_${IP}`), 1);
  assertEquals(next.summary.deviceRemaining, 9);
});

Deno.test("reserveUsage: rejects at the device limit without touching the ip counter", async () => {
  const fake = createFakeDb();
  fake.set(USER, 10);

  await rejectsWith(() => reserveUsage(usageParams(fake.db)), 429, { error: "limit", remaining: 0 });
  assertEquals(fake.count(USER), 10);
  assertEquals(fake.count(`ip_${IP}`), 0);
});

Deno.test("reserveUsage: refunds the device counter when the ip limit is hit", async () => {
  const fake = createFakeDb();
  fake.set(`assistant:ip_${IP}`, 40);

  await rejectsWith(
    () => reserveUsage(usageParams(fake.db, "assistant")),
    429,
    { error: "assistant_limit", remaining: 10 },
  );
  assertEquals(fake.count(`assistant:${USER}`), 0);
});

Deno.test("reserveUsage: concurrent requests never exceed the daily limit", async () => {
  const fake = createFakeDb();
  const results = await Promise.allSettled(
    Array.from({ length: 25 }, () => reserveUsage(usageParams(fake.db))),
  );

  assertEquals(results.filter((r) => r.status === "fulfilled").length, 10);
  assertEquals(fake.count(USER), 10);
});

Deno.test("releaseUsage: gives back the reserved unit", async () => {
  const fake = createFakeDb();
  await reserveUsage(usageParams(fake.db));
  await releaseUsage(usageParams(fake.db));

  assertEquals(fake.count(USER), 0);
  assertEquals(fake.count(`ip_${IP}`), 0);
});

Deno.test("reserveUsage: database errors surface as 500", async () => {
  const fake = createFakeDb({ failRpc: true });
  await rejectsWith(() => reserveUsage(usageParams(fake.db)), 500, { error: "db_error" });
});

Deno.test("assertAiBurstRateLimit: blocks the request after the window limit", async () => {
  const fake = createFakeDb();
  const now = new Date("2026-10-03T12:04:00Z");

  for (let i = 0; i < 30; i++) {
    await assertAiBurstRateLimit(fake.db, IP, USER, "summary", now);
  }

  await rejectsWith(
    () => assertAiBurstRateLimit(fake.db, IP, USER, "summary", now),
    429,
    { error: "rate_limited" },
  );
});

Deno.test("assertAiBurstRateLimit: refunds the device counter when the ip is limited", async () => {
  const fake = createFakeDb();
  const now = new Date("2026-10-03T12:04:00Z");
  fake.set(`ip_burst:summary:${IP}:2026-10-03T12:04`, 120);

  await rejectsWith(
    () => assertAiBurstRateLimit(fake.db, IP, USER, "summary", now),
    429,
    { error: "rate_limited" },
  );
  assertEquals(fake.count(`assistant:burst:summary:${USER}:2026-10-03T12:04`), 0);
});

Deno.test("assertLightweightRateLimit: allows up to the per-ip limit", async () => {
  const fake = createFakeDb();
  fake.set(`feedback:ip_${IP}`, 29);

  await assertLightweightRateLimit(fake.db, TODAY, IP, "feedback");
  await rejectsWith(
    () => assertLightweightRateLimit(fake.db, TODAY, IP, "feedback"),
    429,
    { error: "rate_limited" },
  );
});

function handlerContext(db: DbClient) {
  return { db, today: TODAY, limits: createLimits(), userId: USER, deviceId: USER };
}

Deno.test("withReservedUsage: keeps the unit and returns remaining on success", async () => {
  const fake = createFakeDb();
  const result = await withReservedUsage(handlerContext(fake.db), "summary", () =>
    Promise.resolve({ summary: "ok" }));

  assertEquals(result, { body: { summary: "ok" }, remaining: 9 });
  assertEquals(fake.count(USER), 1);
});

Deno.test("withReservedUsage: refunds the unit when the AI call fails", async () => {
  const fake = createFakeDb();

  await rejectsWith(
    () =>
      withReservedUsage(handlerContext(fake.db), "summary", () =>
        Promise.reject(new HttpError(502, { error: "ai_error" }))),
    502,
    { error: "ai_error" },
  );
  assertEquals(fake.count(USER), 0);
  assertEquals(fake.count(`ip_${IP}`), 0);
});

Deno.test("handleRelatedSources: daily per-ip cap blocks before any embedding call", async () => {
  const fake = createFakeDb();
  fake.set(`relatedsources:ip_${IP}`, 40);
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls++;
    return Promise.reject(new Error("unexpected fetch"));
  };

  try {
    await rejectsWith(
      () =>
        handleRelatedSources(handlerContext(fake.db), {
          action: "relatedsources",
          deviceId: USER,
          lang: "tr",
          title: "Title",
          text: "Body",
          question: "",
          url: "https://example.com/news/1",
          isClickbait: null,
          rating: null,
        }),
      429,
      { error: "rate_limited" },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assertEquals(fetchCalls, 0);
});
