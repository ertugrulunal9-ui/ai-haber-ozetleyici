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
import { parseAnalyzeOutput, runOpenAi } from "./openai.ts";
import {
  Action,
  ActionHandler,
  HandlerContext,
  HandlerResult,
  ParsedRequest,
  UsageBucket,
} from "./types.ts";
import { handleGetVotes, handleVote } from "./votes.ts";

export const actionHandlers: Record<Action, ActionHandler> = {
  usage: handleUsage,
  getvotes: handleGetVotes,
  vote: handleVote,
  feedback: handleFeedback,
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

  return await withReservedUsage(ctx, "summary", async () => {
    const output = await runOpenAi(buildPrompt(input, "summarize"));
    const { summary, keywords } = parseSummaryOutput(output);
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
    const output = await runOpenAi(buildPrompt(input, "ask"));
    return { answer: output };
  });
}

async function handleAnalyze(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  requireNonEmptyString(input.text);
  assertAiRequestAllowed(ctx.limits, "assistant");
  await assertAiBurstRateLimit(ctx.db, ctx.limits.clientIp, ctx.userId, "assistant");

  return await withReservedUsage(ctx, "assistant", async () => {
    const output = await runOpenAi(buildPrompt(input, "analyze"));
    return parseAnalyzeOutput(output);
  });
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

function parseSummaryOutput(output: string): { summary: string; keywords: string[] } {
  const keywordMatch = output.match(/KEYWORDS:\s*(.+)/i);
  if (!keywordMatch) {
    return { summary: output.trim(), keywords: [] };
  }

  const summary = output.slice(0, keywordMatch.index).trim();
  const keywords = keywordMatch[1]
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  return { summary, keywords };
}

function requireNonEmptyString(value: string): void {
  if (!value) {
    throw new HttpError(400, { error: "bad_request" });
  }
}
