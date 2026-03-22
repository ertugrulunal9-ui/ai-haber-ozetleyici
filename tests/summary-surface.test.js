import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

beforeAll(() => {
  globalThis.AozUi = {
    getBiasDisplay: () => ({}),
    getClickbaitDisplay: () => ({}),
  };

  const code = readFileSync(
    resolve(__dirname, "../extension/utils/summary-surface.js"),
    "utf-8",
  );
  new Function(code)();
});

describe("toSafeExternalUrl", () => {
  const toSafeExternalUrl = () => globalThis.AozSummarySurface.toSafeExternalUrl;

  it("allows https urls", () => {
    expect(toSafeExternalUrl()("https://example.com/news")).toBe("https://example.com/news");
  });

  it("rejects javascript urls", () => {
    expect(toSafeExternalUrl()("javascript:alert(1)")).toBe("");
  });

  it("rejects malformed urls", () => {
    expect(toSafeExternalUrl()("not-a-url")).toBe("");
  });
});
