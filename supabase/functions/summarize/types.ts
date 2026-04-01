export type Action = "usage" | "summarize" | "ask" | "analyze" | "vote" | "getvotes" | "feedback";
export type Lang = "tr" | "en";
export type UsageBucket = "summary" | "assistant";
export type LightweightAction = "vote" | "feedback" | "getvotes";

export type ParsedRequest = {
  action: Action;
  deviceId: string;
  lang: Lang;
  title: string;
  text: string;
  question: string;
  url: string;
  isClickbait: boolean | null;
  rating: boolean | null;
};

export type LimitBucketState = {
  deviceCount: number;
  deviceRemaining: number;
  ipKey: string;
  ipCount: number;
  ipRemaining: number;
};

export type LimitState = {
  clientIp: string;
  summary: LimitBucketState;
  assistant: LimitBucketState;
};

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
export type DbClient = SupabaseClient;

export type HandlerContext = {
  db: DbClient;
  today: string;
  limits: LimitState;
  userId: string;
};

export type HandlerResult = {
  status?: number;
  body: Record<string, unknown>;
  incrementUsageBucket?: UsageBucket;
};

export type ActionHandler = (
  ctx: HandlerContext,
  input: ParsedRequest,
) => Promise<HandlerResult>;
