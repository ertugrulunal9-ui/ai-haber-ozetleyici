import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  normalizeAnalyzeOutput,
  normalizeAnswerOutput,
  normalizeSummaryOutput,
} from "./openai.ts";
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

Deno.test("normalizeSummaryOutput: valid structured object", () => {
  const result = normalizeSummaryOutput({
    summary: "News summary.",
    keywords: ["economy", "rates", "policy"],
  });
  assertEquals(result.summary, "News summary.");
  assertEquals(result.keywords, ["economy", "rates", "policy"]);
});

Deno.test("normalizeSummaryOutput: trims keywords and removes invalid entries", () => {
  const result = normalizeSummaryOutput({
    summary: "News summary.",
    keywords: [" economy ", "", 42, "policy"],
  });
  assertEquals(result.keywords, ["economy", "policy"]);
});

Deno.test("normalizeSummaryOutput: empty summary throws 502", () => {
  assertHttpError(
    () => normalizeSummaryOutput({ summary: " ", keywords: [] }),
    502,
  );
});

Deno.test("normalizeAnswerOutput: valid structured object", () => {
  const result = normalizeAnswerOutput({ answer: "Based on the article, this is likely." });
  assertEquals(result.answer, "Based on the article, this is likely.");
});

Deno.test("normalizeAnswerOutput: empty answer throws 502", () => {
  assertHttpError(() => normalizeAnswerOutput({ answer: "" }), 502);
});

Deno.test("normalizeAnalyzeOutput: valid structured object", () => {
  const result = normalizeAnalyzeOutput({
    political: 25,
    emotional: 40,
    note: "Slight right-leaning tone.",
  });
  assertEquals(result.political, 25);
  assertEquals(result.emotional, 40);
  assertEquals(result.note, "Slight right-leaning tone.");
});

Deno.test("normalizeAnalyzeOutput: trims note whitespace", () => {
  const result = normalizeAnalyzeOutput({
    political: 0,
    emotional: 0,
    note: "  Neutral coverage.  ",
  });
  assertEquals(result.note, "Neutral coverage.");
});

Deno.test("normalizeAnalyzeOutput: missing note throws 502", () => {
  assertHttpError(
    () => normalizeAnalyzeOutput({ political: 0, emotional: 0 }),
    502,
  );
});

Deno.test("normalizeAnalyzeOutput: note is number throws 502", () => {
  assertHttpError(
    () => normalizeAnalyzeOutput({ political: 0, emotional: 0, note: 42 }),
    502,
  );
});

Deno.test("normalizeAnalyzeOutput: numeric strings coerced to numbers", () => {
  const result = normalizeAnalyzeOutput({
    political: "30",
    emotional: "70",
    note: "Test.",
  });
  assertEquals(result.political, 30);
  assertEquals(result.emotional, 70);
});

Deno.test("normalizeAnalyzeOutput: values are clamped", () => {
  const result = normalizeAnalyzeOutput({
    political: 500,
    emotional: -20,
    note: "Extreme values.",
  });
  assertEquals(result.political, 100);
  assertEquals(result.emotional, 0);
});
