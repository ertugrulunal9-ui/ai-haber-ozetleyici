import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseAnalyzeOutput } from "./openai.ts";
import { HttpError } from "./errors.ts";

function assertHttpError(fn: () => void, status: number) {
  try {
    fn();
    throw new Error("Expected HttpError was not thrown");
  } catch (e) {
    if (!(e instanceof HttpError)) throw e;
    assertEquals(e.status, status);
  }
}

Deno.test("parseAnalyzeOutput: valid JSON", () => {
  const result = parseAnalyzeOutput(
    '{"political": 25, "emotional": 40, "note": "Slight right-leaning tone."}',
  );
  assertEquals(result.political, 25);
  assertEquals(result.emotional, 40);
  assertEquals(result.note, "Slight right-leaning tone.");
});

Deno.test("parseAnalyzeOutput: JSON wrapped in markdown fences", () => {
  const input = '```json\n{"political": -50, "emotional": 80, "note": "Strong left bias."}\n```';
  const result = parseAnalyzeOutput(input);
  assertEquals(result.political, -50);
  assertEquals(result.emotional, 80);
  assertEquals(result.note, "Strong left bias.");
});

Deno.test("parseAnalyzeOutput: trims note whitespace", () => {
  const result = parseAnalyzeOutput(
    '{"political": 0, "emotional": 0, "note": "  Neutral coverage.  "}',
  );
  assertEquals(result.note, "Neutral coverage.");
});

Deno.test("parseAnalyzeOutput: missing note throws 502", () => {
  assertHttpError(
    () => parseAnalyzeOutput('{"political": 0, "emotional": 0}'),
    502,
  );
});

Deno.test("parseAnalyzeOutput: note is number throws 502", () => {
  assertHttpError(
    () => parseAnalyzeOutput('{"political": 0, "emotional": 0, "note": 42}'),
    502,
  );
});

Deno.test("parseAnalyzeOutput: non-JSON string throws 502", () => {
  assertHttpError(() => parseAnalyzeOutput("This is not JSON at all"), 502);
});

Deno.test("parseAnalyzeOutput: empty string throws 502", () => {
  assertHttpError(() => parseAnalyzeOutput(""), 502);
});

Deno.test("parseAnalyzeOutput: numeric strings coerced to numbers", () => {
  const result = parseAnalyzeOutput(
    '{"political": "30", "emotional": "70", "note": "Test."}',
  );
  assertEquals(result.political, 30);
  assertEquals(result.emotional, 70);
});
