import { HttpError } from "./errors.ts";
import {
  assertAiBurstRateLimit,
  assertAiRequestAllowed,
  assertLightweightRateLimit,
  assertUsageBurstRateLimit,
  releaseUsage,
  reserveUsage,
} from "./limits.ts";
import { buildPrompt } from "./prompt.ts";
import { runAnalyzeOpenAi, runAnswerOpenAi, runSummaryOpenAi } from "./openai.ts";
import {
  Action,
  ActionHandler,
  DbClient,
  HandlerContext,
  HandlerResult,
  Lang,
  ParsedRequest,
  UsageBucket,
} from "./types.ts";
import { handleGetVotes, handleVote } from "./votes.ts";
import { handleRelatedSources } from "./semantic.ts";

export const actionHandlers: Record<Action, ActionHandler> = {
  usage: handleUsage,
  getvotes: handleGetVotes,
  vote: handleVote,
  feedback: handleFeedback,
  relatedsources: handleRelatedSources,
  summarize: handleSummarize,
  ask: handleAsk,
  analyze: handleAnalyze,
};

function handleUsage(
  ctx: HandlerContext,
  _input: ParsedRequest,
): Promise<HandlerResult> {
  return assertUsageBurstRateLimit(ctx.db, ctx.limits.clientIp).then(() => ({ body: {} }));
}

async function handleSummarize(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  requireNonEmptyString(input.text);
  assertAiRequestAllowed(ctx.limits, "summary");
  await assertAiBurstRateLimit(ctx.db, ctx.limits.clientIp, ctx.userId, "summary");

  if (input.url) {
    const cached = await getArticleCache(ctx.db, input.url, input.lang);
    if (cached) {
      return { body: { summary: cached.summary, keywords: cached.keywords, cached: true } };
    }
  }

  return await withReservedUsage(ctx, "summary", async () => {
    const { summary, keywords } = await runSummaryOpenAi(buildPrompt(input, "summarize"));

    if (input.url) {
      storeArticleCache(ctx.db, input.url, input.lang, summary, keywords).catch(() => {});
    }

    return { summary, keywords };
  });
}

async function handleAsk(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  requireNonEmptyString(input.text);
  requireNonEmptyString(input.question);
  assertAiRequestAllowed(ctx.limits, "assistant");
  await assertAiBurstRateLimit(ctx.db, ctx.limits.clientIp, ctx.userId, "assistant");

  return await withReservedUsage(ctx, "assistant", async () => {
    const { answer } = await runAnswerOpenAi(buildPrompt(input, "ask"));
    return { answer };
  });
}

async function handleAnalyze(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  requireNonEmptyString(input.text);
  assertAiRequestAllowed(ctx.limits, "assistant");
  await assertAiBurstRateLimit(ctx.db, ctx.limits.clientIp, ctx.userId, "assistant");

  return await withReservedUsage(ctx, "assistant", () => runAnalyzeOpenAi(buildPrompt(input, "analyze")));
}

// Reserves one unit of the daily quota before running the AI call and gives
// it back if the call fails, so users are not charged for errors.
export async function withReservedUsage(
  ctx: HandlerContext,
  bucket: UsageBucket,
  run: () => Promise<Record<string, unknown>>,
): Promise<HandlerResult> {
  const usageParams = {
    db: ctx.db,
    today: ctx.today,
    limits: ctx.limits,
    deviceId: ctx.userId,
    bucket,
  };
  const reserved = await reserveUsage(usageParams);

  try {
    const body = await run();
    return { body, remaining: reserved.summary.deviceRemaining };
  } catch (error) {
    try {
      await releaseUsage(usageParams);
    } catch (releaseError) {
      // Keep the original error; a failed refund only costs the user one unit.
      console.error("usage_release_failed", releaseError);
    }
    throw error;
  }
}

async function handleFeedback(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  if (input.rating === null || !input.url) {
    throw new HttpError(400, { error: "bad_request" });
  }
  await assertLightweightRateLimit(ctx.db, ctx.today, ctx.limits.clientIp, "feedback");

  await ctx.db.from("summary_feedback").upsert(
    {
      url: input.url,
      device_id: ctx.userId,
      rating: input.rating,
      created_at: new Date().toISOString(),
    },
    { onConflict: "url,device_id" },
  );

  return { body: { ok: true } };
}

// ── Server-side summary cache ──────────────────────────────────────────

export async function getArticleCache(
  db: DbClient,
  url: string,
  lang: Lang,
): Promise<{ summary: string; keywords: string[] } | null> {
  const urlHash = await hashUrl(url);
  const { data } = await db
    .from("article_summaries")
    .select("summary, keywords")
    .eq("url_hash", urlHash)
    .eq("lang", lang)
    .maybeSingle();

  if (!data) return null;
  return {
    summary: String(data.summary),
    keywords: Array.isArray(data.keywords) ? (data.keywords as unknown[]).map(String) : [],
  };
}

export async function storeArticleCache(
  db: DbClient,
  url: string,
  lang: Lang,
  summary: string,
  keywords: string[],
): Promise<void> {
  const urlHash = await hashUrl(url);
  await db.from("article_summaries").upsert(
    { url_hash: urlHash, lang, summary, keywords },
    { onConflict: "url_hash,lang", ignoreDuplicates: true },
  );
}

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url.trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function requireNonEmptyString(value: string): void {
  if (!value) {
    throw new HttpError(400, { error: "bad_request" });
  }
}
