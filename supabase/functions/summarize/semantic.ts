import { HttpError } from "./errors.ts";
import { assertAiBurstRateLimit } from "./limits.ts";
import { runEmbedding } from "./openai.ts";
import { DbClient, HandlerContext, HandlerResult, ParsedRequest } from "./types.ts";

const RECENT_WINDOW_HOURS = 48;
const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.78;

export type SemanticSource = {
  title: string;
  link: string;
  source: string;
  semanticScore: number;
  semanticKind: "same_event" | "near_event";
};

export async function handleRelatedSources(
  ctx: HandlerContext,
  input: ParsedRequest,
): Promise<HandlerResult> {
  if (!input.title || !input.url) {
    return { body: { sources: [] } };
  }

  await assertAiBurstRateLimit(ctx.db, ctx.limits.clientIp, ctx.userId, "assistant");
  const sources = await upsertArticleEventAndFindMatches(ctx.db, input);
  return { body: { sources } };
}

async function upsertArticleEventAndFindMatches(
  db: DbClient,
  input: ParsedRequest,
): Promise<SemanticSource[]> {
  const urlHash = await hashUrl(input.url);
  const sourceHost = getHostLabel(input.url);
  if (!sourceHost) {
    return [];
  }

  const embeddingText = buildEmbeddingText(input);
  const embedding = await runEmbedding(embeddingText);
  const vector = toPgVector(embedding);

  const now = new Date();
  const since = new Date(now.getTime() - RECENT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { error: upsertError } = await db.from("article_events").upsert(
    {
      url_hash: urlHash,
      lang: input.lang,
      title: input.title,
      url: input.url,
      source_host: sourceHost,
      embedding: vector,
      last_seen_at: now.toISOString(),
    },
    { onConflict: "url_hash,lang" },
  );

  if (upsertError) {
    console.error("article_event_upsert_failed", { message: upsertError.message });
    return [];
  }

  const { data, error } = await db.rpc("match_recent_article_events", {
    query_embedding: vector,
    match_lang: input.lang,
    source_url_hash: urlHash,
    since_time: since,
    match_count: DEFAULT_MATCH_COUNT,
    similarity_threshold: DEFAULT_SIMILARITY_THRESHOLD,
  });

  if (error) {
    console.error("article_event_match_failed", { message: error.message });
    return [];
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) => toSemanticSource(row))
    .filter((source): source is SemanticSource => Boolean(source));
}

function buildEmbeddingText(input: ParsedRequest): string {
  const excerpt = input.text.slice(0, 900);
  return [
    `Title: ${input.title}`,
    excerpt ? `Opening: ${excerpt}` : "",
  ].filter(Boolean).join("\n");
}

function toSemanticSource(row: unknown): SemanticSource | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const record = row as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const link = typeof record.url === "string" ? record.url.trim() : "";
  const source = typeof record.source_host === "string" ? record.source_host.trim() : "";
  const semanticScore = Number(record.similarity);

  if (!title || !link || !source || !Number.isFinite(semanticScore)) {
    return null;
  }

  return {
    title,
    link,
    source,
    semanticScore,
    semanticKind: semanticScore >= 0.86 ? "same_event" : "near_event",
  };
}

function toPgVector(values: number[]): string {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url.trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getHostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    throw new HttpError(400, { error: "bad_request" });
  }
}
