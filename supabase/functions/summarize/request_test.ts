import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseRequest, parseRawBody } from "./request.ts";
import { HttpError } from "./errors.ts";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function assertHttpError(fn: () => void, status: number) {
  try {
    fn();
    throw new Error("Expected HttpError was not thrown");
  } catch (e) {
    if (!(e instanceof HttpError)) throw e;
    assertEquals(e.status, status);
  }
}

// --- parseRequest ---

Deno.test("parseRequest: valid minimal body", () => {
  const result = parseRequest({ deviceId: VALID_UUID });
  assertEquals(result.action, "summarize");
  assertEquals(result.deviceId, VALID_UUID);
  assertEquals(result.lang, "tr");
  assertEquals(result.title, "");
  assertEquals(result.text, "");
  assertEquals(result.isClickbait, null);
});

Deno.test("parseRequest: valid full body", () => {
  const result = parseRequest({
    action: "ask",
    deviceId: VALID_UUID,
    lang: "en",
    title: "Test Title",
    text: "Some article text",
    question: "What happened?",
    url: "https://example.com/article",
    is_clickbait: true,
  });
  assertEquals(result.action, "ask");
  assertEquals(result.lang, "en");
  assertEquals(result.title, "Test Title");
  assertEquals(result.question, "What happened?");
  assertEquals(result.isClickbait, true);
});

Deno.test("parseRequest: all valid actions", () => {
  for (const action of ["usage", "summarize", "ask", "analyze", "vote", "getvotes"]) {
    const result = parseRequest({ action, deviceId: VALID_UUID });
    assertEquals(result.action, action);
  }
});

Deno.test("parseRequest: missing deviceId throws 400", () => {
  assertHttpError(() => parseRequest({ action: "usage" }), 400);
});

Deno.test("parseRequest: invalid deviceId format throws 400", () => {
  assertHttpError(() => parseRequest({ deviceId: "not-a-uuid" }), 400);
});

Deno.test("parseRequest: null body throws 400", () => {
  assertHttpError(() => parseRequest(null), 400);
});

Deno.test("parseRequest: array body throws 400", () => {
  assertHttpError(() => parseRequest([1, 2, 3]), 400);
});

Deno.test("parseRequest: string body throws 400", () => {
  assertHttpError(() => parseRequest("hello"), 400);
});

Deno.test("parseRequest: unknown action throws 400", () => {
  assertHttpError(() => parseRequest({ action: "delete", deviceId: VALID_UUID }), 400);
});

Deno.test("parseRequest: defaults lang to tr if unknown", () => {
  const result = parseRequest({ deviceId: VALID_UUID, lang: "fr" });
  assertEquals(result.lang, "tr");
});

Deno.test("parseRequest: trims and slices title to 500 chars", () => {
  const longTitle = "A".repeat(600);
  const result = parseRequest({ deviceId: VALID_UUID, title: longTitle });
  assertEquals(result.title.length, 500);
});

Deno.test("parseRequest: non-string title becomes empty", () => {
  const result = parseRequest({ deviceId: VALID_UUID, title: 12345 });
  assertEquals(result.title, "");
});

Deno.test("parseRequest: is_clickbait non-boolean becomes null", () => {
  const result = parseRequest({ deviceId: VALID_UUID, is_clickbait: "yes" });
  assertEquals(result.isClickbait, null);
});

// --- parseRawBody ---

Deno.test("parseRawBody: valid JSON", () => {
  const result = parseRawBody('{"key": "value"}');
  assertEquals((result as Record<string, unknown>).key, "value");
});

Deno.test("parseRawBody: invalid JSON throws 400", () => {
  assertHttpError(() => parseRawBody("not json"), 400);
});

Deno.test("parseRawBody: too large body throws 413", () => {
  const largeBody = "A".repeat(13_000);
  assertHttpError(() => parseRawBody(largeBody), 413);
});
