import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPrompt } from "./prompt.ts";
import { ParsedRequest } from "./types.ts";

function makeInput(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
  return {
    action: "summarize",
    deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    lang: "tr",
    title: "Test Başlık",
    text: "Test metin içeriği.",
    question: "",
    url: "",
    isClickbait: null,
    ...overrides,
  };
}

Deno.test("buildPrompt: summarize mode TR", () => {
  const prompt = buildPrompt(makeInput(), "summarize");
  assertStringIncludes(prompt.systemPrompt, "Turkce");
  assertStringIncludes(prompt.userContent, "Test Başlık");
  assertStringIncludes(prompt.userContent, "Test metin içeriği.");
});

Deno.test("buildPrompt: summarize mode EN", () => {
  const prompt = buildPrompt(makeInput({ lang: "en" }), "summarize");
  assertStringIncludes(prompt.systemPrompt, "English");
});

Deno.test("buildPrompt: ask mode includes question", () => {
  const prompt = buildPrompt(
    makeInput({ question: "Ne oldu?" }),
    "ask",
  );
  assertStringIncludes(prompt.userContent, "Soru: Ne oldu?");
  assertStringIncludes(prompt.userContent, "Haber:");
});

Deno.test("buildPrompt: ask mode EN", () => {
  const prompt = buildPrompt(
    makeInput({ lang: "en", question: "What happened?" }),
    "ask",
  );
  assertStringIncludes(prompt.systemPrompt, "English");
  assertStringIncludes(prompt.userContent, "What happened?");
});

Deno.test("buildPrompt: analyze mode returns JSON instruction", () => {
  const prompt = buildPrompt(makeInput(), "analyze");
  assertStringIncludes(prompt.systemPrompt, "political");
  assertStringIncludes(prompt.systemPrompt, "emotional");
  assertStringIncludes(prompt.systemPrompt, "JSON");
});

Deno.test("buildPrompt: analyze mode EN", () => {
  const prompt = buildPrompt(makeInput({ lang: "en" }), "analyze");
  assertStringIncludes(prompt.systemPrompt, "Analyze");
});
