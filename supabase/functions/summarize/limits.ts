import { HttpError } from "./errors.ts";
import { DbClient, LightweightAction, LimitBucketState, LimitState, UsageBucket } from "./types.ts";

const SUMMARY_DAILY_LIMIT = 100;
const SUMMARY_IP_DAILY_LIMIT = 400;
const ASSISTANT_DAILY_LIMIT = 100;
const ASSISTANT_IP_DAILY_LIMIT = 400;
const AI_BURST_WINDOW_MINUTES = 1;
const USAGE_BURST_WINDOW_MINUTES = 5;

const AI_BURST_LIMITS: Record<UsageBucket, { device: number; ip: number }> = {
  summary: { device: 30, ip: 120 },
  assistant: { device: 30, ip: 120 },
};

const USAGE_BURST_IP_LIMIT = 60;

const LIGHTWEIGHT_IP_LIMITS: Record<LightweightAction, number> = {
  vote: 60,
  feedback: 30,
  getvotes: 120,
  // One embedding per summary, so this matches SUMMARY_IP_DAILY_LIMIT.
  relatedsources: 400,
};

export async function getLimitState(
  db: DbClient,
  deviceId: string,
  today: string,
  clientIp: string,
): Promise<LimitState> {
  const [summary, assistant] = await Promise.all([
    getBucketLimitState(db, "summary", deviceId, today, clientIp),
    getBucketLimitState(db, "assistant", deviceId, today, clientIp),
  ]);

  return {
    clientIp,
    summary,
    assistant,
  };
}

export function assertAiRequestAllowed(limits: LimitState, bucket: UsageBucket): void {
  const current = limits[bucket];
  const errorCode = bucket === "summary" ? "limit" : "assistant_limit";

  if (current.deviceRemaining <= 0) {
    throw new HttpError(429, { error: errorCode, remaining: limits.summary.deviceRemaining });
  }

  if (current.ipRemaining <= 0) {
    throw new HttpError(429, { error: errorCode, remaining: limits.summary.deviceRemaining });
  }
}

export async function assertAiBurstRateLimit(
  db: DbClient,
  clientIp: string,
  deviceId: string,
  bucket: UsageBucket,
  now = new Date(),
): Promise<void> {
  const windowId = getWindowId(now, AI_BURST_WINDOW_MINUTES);
  const dateKey = now.toISOString().slice(0, 10);
  const keys = getAiBurstKeys(bucket, deviceId, clientIp, windowId);
  const limits = AI_BURST_LIMITS[bucket];

  if (!(await consumeUsage(db, keys.deviceKey, dateKey, limits.device))) {
    throw new HttpError(429, { error: "rate_limited" });
  }

  if (!(await consumeUsage(db, keys.ipKey, dateKey, limits.ip))) {
    await refundUsage(db, keys.deviceKey, dateKey);
    throw new HttpError(429, { error: "rate_limited" });
  }
}

export async function assertUsageBurstRateLimit(
  db: DbClient,
  clientIp: string,
  now = new Date(),
): Promise<void> {
  const windowId = getWindowId(now, USAGE_BURST_WINDOW_MINUTES);
  const dateKey = now.toISOString().slice(0, 10);
  const key = `ip_usage_burst:${clientIp || "unknown"}:${windowId}`;

  if (!(await consumeUsage(db, key, dateKey, USAGE_BURST_IP_LIMIT))) {
    throw new HttpError(429, { error: "rate_limited" });
  }
}

export async function assertLightweightRateLimit(
  db: DbClient,
  today: string,
  clientIp: string,
  action: LightweightAction,
): Promise<void> {
  const key = `${action}:ip_${clientIp || "unknown"}`;

  if (!(await consumeUsage(db, key, today, LIGHTWEIGHT_IP_LIMITS[action]))) {
    throw new HttpError(429, { error: "rate_limited" });
  }
}

type UsageParams = {
  db: DbClient;
  today: string;
  limits: LimitState;
  deviceId: string;
  bucket: UsageBucket;
};

// Atomically reserves one unit of the daily quota before the AI call, so
// concurrent requests cannot overshoot the limit. Pair with releaseUsage
// when the AI call fails.
export async function reserveUsage(params: UsageParams): Promise<LimitState> {
  const { db, today, limits, deviceId, bucket } = params;
  const bucketLimits = getBucketLimits(bucket);
  const keys = getUsageKeys(bucket, deviceId, limits.clientIp);
  const errorCode = bucket === "summary" ? "limit" : "assistant_limit";

  const deviceCount = await consumeUsage(db, keys.deviceKey, today, bucketLimits.device);
  if (deviceCount === null) {
    const remaining = bucket === "summary" ? 0 : limits.summary.deviceRemaining;
    throw new HttpError(429, { error: errorCode, remaining });
  }

  const ipCount = await consumeUsage(db, keys.ipKey, today, bucketLimits.ip);
  if (ipCount === null) {
    await refundUsage(db, keys.deviceKey, today);
    throw new HttpError(429, { error: errorCode, remaining: limits.summary.deviceRemaining });
  }

  const nextBucketState: LimitBucketState = {
    deviceCount,
    deviceRemaining: Math.max(0, bucketLimits.device - deviceCount),
    ipKey: keys.ipKey,
    ipCount,
    ipRemaining: Math.max(0, bucketLimits.ip - ipCount),
  };

  return {
    ...limits,
    [bucket]: nextBucketState,
  } as LimitState;
}

export async function releaseUsage(params: UsageParams): Promise<void> {
  const { db, today, limits, deviceId, bucket } = params;
  const keys = getUsageKeys(bucket, deviceId, limits.clientIp);

  await refundUsage(db, keys.deviceKey, today);
  await refundUsage(db, keys.ipKey, today);
}

async function getUsageCount(
  db: DbClient,
  deviceId: string,
  today: string,
): Promise<number> {
  const { data, error } = await db
    .from("usage")
    .select("count")
    .eq("device_id", deviceId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, { error: "db_error" });
  }

  return Number(data?.count ?? 0);
}

// Increments the counter in a single statement (see the consume_usage SQL
// function). Returns the new count, or null when the limit is already reached.
async function consumeUsage(
  db: DbClient,
  key: string,
  date: string,
  limit: number,
): Promise<number | null> {
  const { data, error } = await db.rpc("consume_usage", {
    p_key: key,
    p_date: date,
    p_limit: limit,
  });

  if (error) {
    throw new HttpError(500, { error: "db_error" });
  }

  return data === null || data === undefined ? null : Number(data);
}

async function refundUsage(
  db: DbClient,
  key: string,
  date: string,
): Promise<void> {
  const { error } = await db.rpc("refund_usage", { p_key: key, p_date: date });

  if (error) {
    throw new HttpError(500, { error: "db_error" });
  }
}

async function getBucketLimitState(
  db: DbClient,
  bucket: UsageBucket,
  deviceId: string,
  today: string,
  clientIp: string,
): Promise<LimitBucketState> {
  const bucketLimits = getBucketLimits(bucket);
  const keys = getUsageKeys(bucket, deviceId, clientIp);
  const deviceCount = await getUsageCount(db, keys.deviceKey, today);
  const ipCount = await getUsageCount(db, keys.ipKey, today);

  return {
    deviceCount,
    deviceRemaining: Math.max(0, bucketLimits.device - deviceCount),
    ipKey: keys.ipKey,
    ipCount,
    ipRemaining: Math.max(0, bucketLimits.ip - ipCount),
  };
}

function getBucketLimits(bucket: UsageBucket): { device: number; ip: number } {
  if (bucket === "summary") {
    return { device: SUMMARY_DAILY_LIMIT, ip: SUMMARY_IP_DAILY_LIMIT };
  }

  return { device: ASSISTANT_DAILY_LIMIT, ip: ASSISTANT_IP_DAILY_LIMIT };
}

function getUsageKeys(bucket: UsageBucket, deviceId: string, clientIp: string): { deviceKey: string; ipKey: string } {
  const ip = clientIp || `unknown_${deviceId}`;

  if (bucket === "summary") {
    return {
      deviceKey: deviceId,
      ipKey: `ip_${ip}`,
    };
  }

  return {
    deviceKey: `assistant:${deviceId}`,
    ipKey: `assistant:ip_${ip}`,
  };
}

function getAiBurstKeys(
  bucket: UsageBucket,
  deviceId: string,
  clientIp: string,
  windowId: string,
): { deviceKey: string; ipKey: string } {
  return {
    // Prefix these counters so analytics views ignore them.
    deviceKey: `assistant:burst:${bucket}:${deviceId}:${windowId}`,
    ipKey: `ip_burst:${bucket}:${clientIp || "unknown"}:${windowId}`,
  };
}

function getWindowId(now: Date, windowMinutes: number): string {
  const windowStart = new Date(now);
  windowStart.setUTCSeconds(0, 0);
  windowStart.setUTCMinutes(windowStart.getUTCMinutes() - (windowStart.getUTCMinutes() % windowMinutes));
  return windowStart.toISOString().slice(0, 16);
}
