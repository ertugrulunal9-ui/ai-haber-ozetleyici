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
  summarize: handleSummarize,
  ask: handleAsk,
  analyze: handleAnalyze,
};

async function handleUsage(
  _ctx: HandlerContext,
  _input: ParsedRequest,
): Promise<HandlerResult> {
  return { body: {} };
}

async function handleSummarize(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  assertAiRequestAllowed(ctx.limits, "summary");
  requireNonEmptyString(input.text);

  const output = await runOpenAi(buildPrompt(input, "summarize"));

  return {
    body: { summary: output },
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

function requireNonEmptyString(value: string): void {
  if (!value) {
    throw new HttpError(400, { error: "bad_request" });
  }
}
