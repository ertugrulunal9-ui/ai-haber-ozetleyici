import { HttpError } from "./errors.ts";
import { DbClient, LimitBucketState, LimitState, UsageBucket } from "./types.ts";

const SUMMARY_DAILY_LIMIT = 10;
const SUMMARY_IP_DAILY_LIMIT = 40;
const ASSISTANT_DAILY_LIMIT = 10;
const ASSISTANT_IP_DAILY_LIMIT = 40;

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
  const deviceResult = await db.from("usage").upsert(
    {
      device_id: keys.deviceKey,
      date: today,
      count: deviceCount,
    },
    { onConflict: "device_id,date" },
  );

  if (deviceResult.error) {
    throw new HttpError(500, { error: "db_error" });
  }

  const ipCount = current.ipCount + 1;
  const ipResult = await db.from("usage").upsert(
    {
      device_id: keys.ipKey,
      date: today,
      count: ipCount,
    },
    { onConflict: "device_id,date" },
  );

  if (ipResult.error) {
    throw new HttpError(500, { error: "db_error" });
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
