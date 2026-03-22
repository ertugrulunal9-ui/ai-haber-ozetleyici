import { HttpError } from "./errors.ts";
import { assertLightweightRateLimit } from "./limits.ts";
import { HandlerContext, HandlerResult, ParsedRequest } from "./types.ts";

export async function handleGetVotes(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  if (!input.url) {
    throw new HttpError(400, { error: "bad_request" });
  }
  await assertLightweightRateLimit(ctx.db, ctx.today, ctx.limits.clientIp, "getvotes");

  const { data, error } = await ctx.db
    .from("article_votes")
    .select("is_clickbait, device_id")
    .eq("url", input.url);

  if (error) {
    throw new HttpError(500, { error: "db_error" });
  }

  const votes = data ?? [];
  const clickbait = votes.filter((vote: { is_clickbait: boolean }) => vote.is_clickbait).length;
  const userVote =
    votes.find((vote: { device_id: string }) => vote.device_id === ctx.userId)?.is_clickbait ?? null;

  return {
    body: {
      total: votes.length,
      clickbait,
      userVote,
    },
  };
}

export async function handleVote(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  if (!input.url || input.isClickbait === null) {
    throw new HttpError(400, { error: "bad_request" });
  }
  await assertLightweightRateLimit(ctx.db, ctx.today, ctx.limits.clientIp, "vote");

  const upsertResult = await ctx.db.from("article_votes").upsert(
    {
      url: input.url,
      device_id: ctx.userId,
      is_clickbait: input.isClickbait,
    },
    { onConflict: "url,device_id" },
  );

  if (upsertResult.error) {
    throw new HttpError(500, { error: "db_error" });
  }

  const { data, error } = await ctx.db
    .from("article_votes")
    .select("is_clickbait")
    .eq("url", input.url);

  if (error) {
    throw new HttpError(500, { error: "db_error" });
  }

  const votes = data ?? [];
  const clickbait = votes.filter((vote: { is_clickbait: boolean }) => vote.is_clickbait).length;

  return {
    body: {
      total: votes.length,
      clickbait,
      userVote: input.isClickbait,
    },
  };
}
