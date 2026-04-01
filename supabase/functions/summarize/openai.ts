import { getRequiredEnv } from "./env.ts";
import { HttpError } from "./errors.ts";
import { OpenAiPrompt } from "./prompt.ts";

const openaiKey = getRequiredEnv("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function runOpenAi(prompt: OpenAiPrompt): Promise<string> {
  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt.systemPrompt },
          { role: "user", content: prompt.userContent },
        ],
        max_tokens: 600,
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

  const output = extractOpenAiOutput(payload);
  if (!output) {
    throw new HttpError(502, { error: "ai_error" });
  }

  return output;
}

export function parseAnalyzeOutput(
  output: string,
): { political: number; emotional: number; note: string } {
  try {
    const cleaned = output.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      political?: unknown;
      emotional?: unknown;
      note?: unknown;
    };

    const political = Number(parsed.political);
    const emotional = Number(parsed.emotional);

    if (
      typeof parsed.note !== "string" ||
      !Number.isFinite(political) ||
      !Number.isFinite(emotional)
    ) {
      throw new Error("invalid_fields");
    }

    return {
      political: Math.max(-100, Math.min(100, Math.round(political))),
      emotional: Math.max(0, Math.min(100, Math.round(emotional))),
      note: parsed.note.trim(),
    };
  } catch {
    throw new HttpError(502, { error: "parse_error" });
  }
}

function extractOpenAiOutput(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content?.trim() ?? "";
}
