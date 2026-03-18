import { HttpError } from "./errors.ts";
import { Action, ParsedRequest } from "./types.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_LENGTH = 12_000;

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, { error: "bad_request" });
  }
}

export function parseRawBody(raw: string): unknown {
  if (raw.length > MAX_BODY_LENGTH) {
    throw new HttpError(413, { error: "payload_too_large" });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, { error: "bad_request" });
  }
}

export function parseRequest(body: unknown): ParsedRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, { error: "bad_request" });
  }

  const record = body as Record<string, unknown>;
  const action = parseAction(record.action);
  const deviceId = readRequiredString(record.deviceId, 64);

  if (!UUID_REGEX.test(deviceId)) {
    throw new HttpError(400, { error: "bad_request" });
  }

  return {
    action,
    deviceId,
    lang: record.lang === "en" ? "en" : "tr",
    title: readOptionalString(record.title, 500),
    text: readOptionalString(record.text, 5000),
    question: readOptionalString(record.question, 500),
    url: readOptionalString(record.url, 2048),
    isClickbait: typeof record.is_clickbait === "boolean" ? record.is_clickbait : null,
  };
}

function parseAction(value: unknown): Action {
  const action = typeof value === "string" && value ? value : "summarize";
  if (
    action === "usage" ||
    action === "summarize" ||
    action === "ask" ||
    action === "analyze" ||
    action === "vote" ||
    action === "getvotes"
  ) {
    return action;
  }

  throw new HttpError(400, { error: "bad_request" });
}

function readRequiredString(value: unknown, maxLength: number): string {
  const parsed = readOptionalString(value, maxLength);
  if (!parsed) {
    throw new HttpError(400, { error: "bad_request" });
  }

  return parsed;
}

function readOptionalString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
