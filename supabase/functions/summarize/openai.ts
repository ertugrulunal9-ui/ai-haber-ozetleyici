import { getOptionalEnv, getRequiredEnv } from "./env.ts";
import { HttpError } from "./errors.ts";
import { OpenAiPrompt } from "./prompt.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export type SummaryOutput = {
  summary: string;
  keywords: string[];
};

export type AnswerOutput = {
  answer: string;
};

export type AnalyzeOutput = {
  political: number;
  emotional: number;
  note: string;
};

type JsonSchemaResponseFormat = {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
};

function getModel(): string {
  return getOptionalEnv("OPENAI_MODEL") ?? "gpt-4o-mini";
}

function getEmbeddingModel(): string {
  return getOptionalEnv("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
}

export async function runSummaryOpenAi(prompt: OpenAiPrompt): Promise<SummaryOutput> {
  return runStructuredOpenAi(prompt, SUMMARY_RESPONSE_FORMAT, normalizeSummaryOutput);
}

export async function runAnswerOpenAi(prompt: OpenAiPrompt): Promise<AnswerOutput> {
  return runStructuredOpenAi(prompt, ANSWER_RESPONSE_FORMAT, normalizeAnswerOutput);
}

export async function runAnalyzeOpenAi(prompt: OpenAiPrompt): Promise<AnalyzeOutput> {
  return runStructuredOpenAi(prompt, ANALYZE_RESPONSE_FORMAT, normalizeAnalyzeOutput);
}

export async function runEmbedding(input: string): Promise<number[]> {
  const openaiKey = getRequiredEnv("OPENAI_API_KEY");
  let response: Response;
  try {
    response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: getEmbeddingModel(),
        input,
      }),
    });
  } catch {
    throw new HttpError(502, { error: "ai_error" });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, { error: "ai_error" });
  }

  if (!response.ok) {
    console.error("openai_embedding_failed", { status: response.status });
    throw new HttpError(502, { error: "ai_error" });
  }

  const embedding = extractEmbedding(payload);
  if (!embedding.length) {
    throw new HttpError(502, { error: "ai_error" });
  }

  return embedding;
}

async function runStructuredOpenAi<T>(
  prompt: OpenAiPrompt,
  responseFormat: JsonSchemaResponseFormat,
  normalize: (value: unknown) => T,
): Promise<T> {
  const openaiKey = getRequiredEnv("OPENAI_API_KEY");
  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: "system", content: prompt.systemPrompt },
          { role: "user", content: prompt.userContent },
        ],
        max_tokens: 600,
        response_format: responseFormat,
      }),
    });
  } catch {
    throw new HttpError(502, { error: "ai_error" });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, { error: "ai_error" });
  }

  if (!response.ok) {
    console.error("openai_request_failed", { status: response.status });
    throw new HttpError(502, { error: "ai_error" });
  }

  return normalizeStructuredOutput(payload, normalize);
}

// Keeps the existing extension SSE contract while using Structured Outputs.
// The model response is generated as strict JSON first, then emitted as one
// summary chunk plus the typed done payload.
export async function runOpenAiStream(
  prompt: OpenAiPrompt,
  onDone?: (summary: string, keywords: string[]) => void,
  remaining?: number,
): Promise<ReadableStream<Uint8Array>> {
  const { summary, keywords } = await runSummaryOpenAi(prompt);
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const payload: Record<string, unknown> = { done: true, summary, keywords };
      if (typeof remaining === "number") payload.remaining = remaining;

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: summary })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      controller.close();
      if (onDone) Promise.resolve().then(() => onDone(summary, keywords)).catch(() => {});
    },
  });
}

export function normalizeSummaryOutput(value: unknown): SummaryOutput {
  if (!isRecord(value) || typeof value.summary !== "string" || !Array.isArray(value.keywords)) {
    throw new HttpError(502, { error: "parse_error" });
  }

  const summary = value.summary.trim();
  const keywords = value.keywords
    .map((keyword) => typeof keyword === "string" ? keyword.trim() : "")
    .filter(Boolean)
    .slice(0, 8);

  if (!summary) {
    throw new HttpError(502, { error: "parse_error" });
  }

  return { summary, keywords };
}

export function normalizeAnswerOutput(value: unknown): AnswerOutput {
  if (!isRecord(value) || typeof value.answer !== "string" || !value.answer.trim()) {
    throw new HttpError(502, { error: "parse_error" });
  }

  return { answer: value.answer.trim() };
}

export function normalizeAnalyzeOutput(value: unknown): AnalyzeOutput {
  if (!isRecord(value) || typeof value.note !== "string") {
    throw new HttpError(502, { error: "parse_error" });
  }

  const political = Number(value.political);
  const emotional = Number(value.emotional);
  const note = value.note.trim();

  if (!Number.isFinite(political) || !Number.isFinite(emotional) || !note) {
    throw new HttpError(502, { error: "parse_error" });
  }

  return {
    political: Math.max(-100, Math.min(100, Math.round(political))),
    emotional: Math.max(0, Math.min(100, Math.round(emotional))),
    note,
  };
}

function normalizeStructuredOutput<T>(
  payload: unknown,
  normalize: (value: unknown) => T,
): T {
  if (!isRecord(payload)) {
    throw new HttpError(502, { error: "ai_error" });
  }

  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null;

  if (typeof message?.refusal === "string" && message.refusal.trim()) {
    throw new HttpError(502, { error: "ai_refusal" });
  }

  if (typeof message?.content !== "string" || !message.content.trim()) {
    throw new HttpError(502, { error: "ai_error" });
  }

  try {
    return normalize(JSON.parse(message.content));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, { error: "parse_error" });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function extractEmbedding(payload: unknown): number[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  const first = payload.data[0];
  if (!isRecord(first) || !Array.isArray(first.embedding)) {
    return [];
  }

  return first.embedding
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

const SUMMARY_RESPONSE_FORMAT: JsonSchemaResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "news_summary",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "keywords"],
      properties: {
        summary: { type: "string" },
        keywords: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
};

const ANSWER_RESPONSE_FORMAT: JsonSchemaResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "news_answer",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["answer"],
      properties: {
        answer: { type: "string" },
      },
    },
  },
};

const ANALYZE_RESPONSE_FORMAT: JsonSchemaResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "bias_analysis",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["political", "emotional", "note"],
      properties: {
        political: { type: "integer" },
        emotional: { type: "integer" },
        note: { type: "string" },
      },
    },
  },
};
