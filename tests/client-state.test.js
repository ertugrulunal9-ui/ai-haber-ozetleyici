import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const code = readFileSync(
  resolve(__dirname, "../extension/utils/client-state.js"),
  "utf-8",
);

let store;

beforeEach(() => {
  store = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async (key) => (key in store ? { [key]: store[key] } : {}),
        set: async (items) => Object.assign(store, items),
        remove: async (key) => {
          delete store[key];
        },
      },
    },
  };
  // Load the IIFE — it registers globalThis.AozClientState
  new Function(code)();
});

describe("summary cache", () => {
  const url = "https://example.com/news/1";

  it("returns a cached summary for the same url and language", async () => {
    const state = globalThis.AozClientState;
    await state.setCachedSummary(url, "tr", { summary: "Türkçe özet" });

    const cached = await state.getCachedSummary(url, "tr");
    expect(cached.summary).toBe("Türkçe özet");
  });

  it("does not return a summary cached in another language", async () => {
    const state = globalThis.AozClientState;
    await state.setCachedSummary(url, "tr", { summary: "Türkçe özet" });

    expect(await state.getCachedSummary(url, "en")).toBeNull();
  });

  it("keeps separate entries per language", async () => {
    const state = globalThis.AozClientState;
    await state.setCachedSummary(url, "tr", { summary: "Türkçe özet" });
    await state.setCachedSummary(url, "en", { summary: "English summary" });

    expect((await state.getCachedSummary(url, "tr")).summary).toBe("Türkçe özet");
    expect((await state.getCachedSummary(url, "en")).summary).toBe("English summary");
  });
});
