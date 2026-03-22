import { HttpError } from "./errors.ts";
import { DbClient, LightweightAction, LimitBucketState, LimitState, UsageBucket } from "./types.ts";

const SUMMARY_DAILY_LIMIT = 10;
const SUMMARY_IP_DAILY_LIMIT = 40;
const ASSISTANT_DAILY_LIMIT = 10;
const ASSISTANT_IP_DAILY_LIMIT = 40;
const AI_BURST_WINDOW_MINUTES = 10;
const USAGE_BURST_WINDOW_MINUTES = 5;

const AI_BURST_LIMITS: Record<UsageBucket, { device: number; ip: number }> = {
  summary: { device: 3, ip: 12 },
  assistant: { device: 5, ip: 20 },
};

const USAGE_BURST_IP_LIMIT = 60;

const LIGHTWEIGHT_IP_LIMITS: Record<LightweightAction, number> = {
  vote: 60,
  feedback: 30,
  getvotes: 120,
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
  userId: string,
  bucket: UsageBucket,
  now = new Date(),
): Promise<void> {
  const windowId = getWindowId(now, AI_BURST_WINDOW_MINUTES);
  const dateKey = now.toISOString().slice(0, 10);
  const keys = getAiBurstKeys(bucket, userId, clientIp, windowId);
  const [deviceCount, ipCount] = await Promise.all([
    getUsageCount(db, keys.deviceKey, dateKey),
    getUsageCount(db, keys.ipKey, dateKey),
  ]);
  const limits = AI_BURST_LIMITS[bucket];

  if (deviceCount >= limits.device || ipCount >= limits.ip) {
    throw new HttpError(429, { error: "rate_limited" });
  }

  await Promise.all([
    setUsageCount(db, keys.deviceKey, dateKey, deviceCount + 1),
    setUsageCount(db, keys.ipKey, dateKey, ipCount + 1),
  ]);
}

export async function assertUsageBurstRateLimit(
  db: DbClient,
  clientIp: string,
  now = new Date(),
): Promise<void> {
  const windowId = getWindowId(now, USAGE_BURST_WINDOW_MINUTES);
  const dateKey = now.toISOString().slice(0, 10);
  const key = `ip_usage_burst:${clientIp || "unknown"}:${windowId}`;
  const count = await getUsageCount(db, key, dateKey);

  if (count >= USAGE_BURST_IP_LIMIT) {
    throw new HttpError(429, { error: "rate_limited" });
  }

  await setUsageCount(db, key, dateKey, count + 1);
}

export async function assertLightweightRateLimit(
  db: DbClient,
  today: string,
  clientIp: string,
  action: LightweightAction,
): Promise<void> {
  const maxCount = LIGHTWEIGHT_IP_LIMITS[action];
  const key = `${action}:ip_${clientIp || "unknown"}`;
  const count = await getUsageCount(db, key, today);

  if (count >= maxCount) {
    throw new HttpError(429, { error: "rate_limited" });
  }

  await setUsageCount(db, key, today, count + 1);
}

export async function incrementUsage(params: {
  db: DbClient;
  today: string;
  limits: LimitState;
  deviceId: string;
  bucket: UsageBucket;
}): Promise<LimitState> {
  const { db, today, limits, deviceId, bucket } = params;
  const current = limits[bucket];
  const bucketLimits = getBucketLimits(bucket);
  const keys = getUsageKeys(bucket, deviceId, limits.clientIp);

  const deviceCount = current.deviceCount + 1;
  await setUsageCount(db, keys.deviceKey, today, deviceCount);

  const ipCount = current.ipCount + 1;
  await setUsageCount(db, keys.ipKey, today, ipCount);

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

async function setUsageCount(
  db: DbClient,
  deviceId: string,
  today: string,
  count: number,
): Promise<void> {
  const result = await db.from("usage").upsert(
    { device_id: deviceId, date: today, count },
    { onConflict: "device_id,date" },
  );

  if (result.error) {
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
  userId: string,
  clientIp: string,
  windowId: string,
): { deviceKey: string; ipKey: string } {
  return {
    // Prefix these counters so analytics views ignore them.
    deviceKey: `assistant:burst:${bucket}:${userId}:${windowId}`,
    ipKey: `ip_burst:${bucket}:${clientIp || "unknown"}:${windowId}`,
  };
}

function getWindowId(now: Date, windowMinutes: number): string {
  const windowStart = new Date(now);
  windowStart.setUTCSeconds(0, 0);
  windowStart.setUTCMinutes(windowStart.getUTCMinutes() - (windowStart.getUTCMinutes() % windowMinutes));
  return windowStart.toISOString().slice(0, 16);
}
