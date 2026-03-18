import { HttpError } from "./errors.ts";
import { assertAiRequestAllowed } from "./limits.ts";
import { buildPrompt } from "./prompt.ts";
import { parseAnalyzeOutput, runOpenAi } from "./openai.ts";
import {
  Action,
  ActionHandler,
  HandlerContext,
  HandlerResult,
  ParsedRequest,
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
  _ctx: HandlerContext,
  _input: ParsedRequest,
): Promise<HandlerResult> {
  return Promise.resolve({ body: {} });
}

async function handleSummarize(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  assertAiRequestAllowed(ctx.limits, "summary");
  requireNonEmptyString(input.text);

  const output = await runOpenAi(buildPrompt(input, "summarize"));
  const { summary, keywords } = parseSummaryOutput(output);

  return {
    body: { summary, keywords },
    incrementUsageBucket: "summary",
  };
}

async function handleAsk(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  assertAiRequestAllowed(ctx.limits, "assistant");
  requireNonEmptyString(input.text);
  requireNonEmptyString(input.question);

  const output = await runOpenAi(buildPrompt(input, "ask"));

  return {
    body: { answer: output },
    incrementUsageBucket: "assistant",
  };
}

async function handleAnalyze(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  assertAiRequestAllowed(ctx.limits, "assistant");
  requireNonEmptyString(input.text);

  const output = await runOpenAi(buildPrompt(input, "analyze"));

  return {
    body: parseAnalyzeOutput(output),
    incrementUsageBucket: "assistant",
  };
}

async function handleFeedback(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  if (input.rating === null || !input.url) {
    throw new HttpError(400, { error: "bad_request" });
  }

  await ctx.db.from("summary_feedback").upsert(
    {
      url: input.url,
      device_id: input.deviceId,
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
