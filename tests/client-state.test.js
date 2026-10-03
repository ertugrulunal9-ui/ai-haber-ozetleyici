import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── In-memory chrome.storage mock ────────────────────────────────────

let _localStore = {};
let _syncStore = {};

function resetStorage() {
  _localStore = {};
  _syncStore = {};
}

globalThis.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        if (typeof keys === "string") return { [keys]: _localStore[keys] };
        if (Array.isArray(keys))
          return Object.fromEntries(keys.map((k) => [k, _localStore[k]]));
        return { ..._localStore };
      },
      set: async (items) => {
        Object.assign(_localStore, items);
      },
      remove: async (keys) => {
        const ks = Array.isArray(keys) ? keys : [keys];
        ks.forEach((k) => delete _localStore[k]);
      },
    },
    sync: {
      get: async (keys) => {
        if (typeof keys === "string") return { [keys]: _syncStore[keys] };
        return { ..._syncStore };
      },
      set: async (items) => {
        Object.assign(_syncStore, items);
      },
    },
  },
};

let _uuidCounter = 0;
// crypto is a read-only getter on globalThis in Node.js — spy on the existing object
vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
  () => `mock-uuid-${++_uuidCounter}`,
);

// ── Load module ───────────────────────────────────────────────────────

beforeAll(() => {
  const code = readFileSync(
    resolve(__dirname, "../extension/utils/client-state.js"),
    "utf-8",
  );
  new Function(code)();
});

beforeEach(() => {
  resetStorage();
  _uuidCounter = 0;
});

// ── Shorthand accessor ────────────────────────────────────────────────

const cs = () => globalThis.AozClientState;

// ── getDeviceId ───────────────────────────────────────────────────────

describe("getDeviceId", () => {
  it("generates and persists a new UUID on first call", async () => {
    const id = await cs().getDeviceId();
    expect(id).toBe("mock-uuid-1");
    expect(_localStore.deviceId).toBe("mock-uuid-1");
  });

  it("returns the same ID on repeated calls", async () => {
    const id1 = await cs().getDeviceId();
    const id2 = await cs().getDeviceId();
    expect(id1).toBe(id2);
  });

  it("recovers ID from sync storage when local is cleared", async () => {
    _syncStore.deviceId = "synced-id";
    const id = await cs().getDeviceId();
    expect(id).toBe("synced-id");
    expect(_localStore.deviceId).toBe("synced-id");
  });

  it("also writes the new ID to sync storage", async () => {
    await cs().getDeviceId();
    expect(_syncStore.deviceId).toBe("mock-uuid-1");
  });
});

// ── getLang / setLang ─────────────────────────────────────────────────

describe("getLang / setLang", () => {
  it("defaults to 'tr' when nothing is stored", async () => {
    expect(await cs().getLang()).toBe("tr");
  });

  it("returns the stored lang after setLang", async () => {
    await cs().setLang("en");
    expect(await cs().getLang()).toBe("en");
  });
});

// ── saveToHistory / getHistory ─────────────────────────────────────────

describe("saveToHistory / getHistory", () => {
  it("prepends item so newest is first", async () => {
    await cs().saveToHistory({ title: "A" });
    await cs().saveToHistory({ title: "B" });
    const h = await cs().getHistory();
    expect(h[0].title).toBe("B");
    expect(h[1].title).toBe("A");
  });

  it("respects maxItems — oldest entry is dropped", async () => {
    for (let i = 0; i < 5; i++) {
      await cs().saveToHistory({ title: `Item ${i}` }, 3);
    }
    const h = await cs().getHistory();
    expect(h).toHaveLength(3);
    expect(h[0].title).toBe("Item 4");
  });

  it("getHistory returns [] when storage is empty", async () => {
    expect(await cs().getHistory()).toEqual([]);
  });

  it("getHistory restores compact items from sync when local is cleared", async () => {
    // Simulate a prior session writing to sync
    _syncStore.summaryHistorySync = [
      { url: "https://a.com", title: "A", savedAt: 1000 },
    ];
    const h = await cs().getHistory();
    expect(h).toHaveLength(1);
    expect(h[0].title).toBe("A");
    // Also restored to local
    expect(_localStore.summaryHistory).toBeDefined();
  });

  it("saveToHistory writes a compact backup to sync", async () => {
    await cs().saveToHistory({ article: { url: "https://a.com", title: "Art" }, summary: "S" });
    // Allow the fire-and-forget void promise to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(Array.isArray(_syncStore.summaryHistorySync)).toBe(true);
    expect(_syncStore.summaryHistorySync[0].url).toBe("https://a.com");
    // Full summary text is NOT stored in sync (compact only)
    expect(_syncStore.summaryHistorySync[0].summary).toBeUndefined();
  });
});

// ── saveArticle / getSavedArticles / isArticleSaved ───────────────────

describe("saveArticle / getSavedArticles / isArticleSaved", () => {
  it("saves an article with a savedAt timestamp", async () => {
    await cs().saveArticle({ article: { url: "https://a.com" }, title: "T" });
    const saved = await cs().getSavedArticles();
    expect(saved).toHaveLength(1);
    expect(saved[0].article.url).toBe("https://a.com");
    expect(saved[0].savedAt).toBeTypeOf("number");
  });

  it("deduplicates by URL — second save replaces first", async () => {
    await cs().saveArticle({ article: { url: "https://a.com" }, title: "Old" });
    await cs().saveArticle({ article: { url: "https://a.com" }, title: "New" });
    const saved = await cs().getSavedArticles();
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe("New");
  });

  it("respects maxItems limit", async () => {
    for (let i = 0; i < 5; i++) {
      await cs().saveArticle(
        { article: { url: `https://a.com/${i}` }, title: `T${i}` },
        3,
      );
    }
    expect(await cs().getSavedArticles()).toHaveLength(3);
  });

  it("returns [] for a falsy item without throwing", async () => {
    expect(await cs().saveArticle(null)).toEqual([]);
  });

  it("isArticleSaved returns false for unsaved URL", async () => {
    expect(await cs().isArticleSaved({ url: "https://a.com" })).toBe(false);
  });

  it("isArticleSaved returns true for saved URL", async () => {
    await cs().saveArticle({ article: { url: "https://a.com" } });
    expect(
      await cs().isArticleSaved({ article: { url: "https://a.com" } }),
    ).toBe(true);
  });

  it("isArticleSaved returns false when item has no URL", async () => {
    expect(await cs().isArticleSaved(null)).toBe(false);
  });

  it("getSavedArticles restores compact items from sync when local is cleared", async () => {
    _syncStore.savedArticlesSync = [
      { url: "https://b.com", title: "B", savedAt: 2000 },
    ];
    const saved = await cs().getSavedArticles();
    expect(saved).toHaveLength(1);
    expect(saved[0].url).toBe("https://b.com");
    expect(_localStore.savedArticles).toBeDefined();
  });

  it("saveArticle writes a compact backup to sync", async () => {
    await cs().saveArticle({ article: { url: "https://b.com", title: "B" }, summary: "S" });
    await new Promise((r) => setTimeout(r, 0));
    expect(Array.isArray(_syncStore.savedArticlesSync)).toBe(true);
    expect(_syncStore.savedArticlesSync[0].url).toBe("https://b.com");
    expect(_syncStore.savedArticlesSync[0].summary).toBeUndefined();
  });
});

// ── getLastResult / setLastResult / clearLastResult ───────────────────

describe("getLastResult / setLastResult / clearLastResult", () => {
  it("round-trips a result through storage", async () => {
    await cs().setLastResult({ summary: "hello" });
    expect(await cs().getLastResult()).toEqual({ summary: "hello" });
  });

  it("returns null when nothing is stored", async () => {
    expect(await cs().getLastResult()).toBeNull();
  });

  it("clearLastResult makes getLastResult return null", async () => {
    await cs().setLastResult({ summary: "hello" });
    await cs().clearLastResult();
    expect(await cs().getLastResult()).toBeNull();
  });
});

// ── getCachedSummary / setCachedSummary ───────────────────────────────

describe("getCachedSummary / setCachedSummary", () => {
  it("stores and retrieves a summary with a cachedAt timestamp", async () => {
    await cs().setCachedSummary("https://a.com", "tr", { summary: "s" });
    const cached = await cs().getCachedSummary("https://a.com", "tr");
    expect(cached.summary).toBe("s");
    expect(cached.cachedAt).toBeTypeOf("number");
  });

  it("returns null for an uncached URL", async () => {
    expect(await cs().getCachedSummary("https://missing.com", "tr")).toBeNull();
  });

  it("does not return a summary cached in another language", async () => {
    await cs().setCachedSummary("https://a.com", "tr", { summary: "Türkçe özet" });
    expect(await cs().getCachedSummary("https://a.com", "en")).toBeNull();
  });

  it("keeps separate entries per language", async () => {
    await cs().setCachedSummary("https://a.com", "tr", { summary: "Türkçe özet" });
    await cs().setCachedSummary("https://a.com", "en", { summary: "English summary" });
    expect((await cs().getCachedSummary("https://a.com", "tr")).summary).toBe("Türkçe özet");
    expect((await cs().getCachedSummary("https://a.com", "en")).summary).toBe("English summary");
  });

  it("evicts the oldest entry when the cache reaches 50 items", async () => {
    for (let i = 0; i < 50; i++) {
      await cs().setCachedSummary(`https://a.com/${i}`, "tr", { i });
    }
    await cs().setCachedSummary("https://a.com/new", "tr", { i: 99 });
    expect(await cs().getCachedSummary("https://a.com/0", "tr")).toBeNull();
    expect(await cs().getCachedSummary("https://a.com/new", "tr")).not.toBeNull();
  });
});

// ── recordDailyAction ─────────────────────────────────────────────────

describe("recordDailyAction", () => {
  it("increments articlesRead for 'summary'", async () => {
    await cs().recordDailyAction("summary");
    await cs().recordDailyAction("summary");
    expect((await cs().getDailyStats()).articlesRead).toBe(2);
  });

  it("increments questionsAsked for 'question'", async () => {
    await cs().recordDailyAction("question");
    expect((await cs().getDailyStats()).questionsAsked).toBe(1);
  });

  it("increments biasAnalyses for 'analysis'", async () => {
    await cs().recordDailyAction("analysis");
    expect((await cs().getDailyStats()).biasAnalyses).toBe(1);
  });

  it("increments clickbaitVotes for 'vote'", async () => {
    await cs().recordDailyAction("vote");
    expect((await cs().getDailyStats()).clickbaitVotes).toBe(1);
  });

  it("silently ignores unknown action types", async () => {
    await cs().recordDailyAction("bogus");
    const stats = await cs().getDailyStats();
    expect(stats.articlesRead).toBe(0);
  });
});

// ── recordClickbaitVote ───────────────────────────────────────────────

describe("recordClickbaitVote", () => {
  it("increments clickbaitVotes and clickbaitYes for a 'yes' vote", async () => {
    await cs().recordClickbaitVote(true);
    const stats = await cs().getDailyStats();
    expect(stats.clickbaitVotes).toBe(1);
    expect(stats.clickbaitYes).toBe(1);
    expect(stats.clickbaitNo).toBe(0);
  });

  it("increments clickbaitNo for a 'no' vote", async () => {
    await cs().recordClickbaitVote(false);
    const stats = await cs().getDailyStats();
    expect(stats.clickbaitNo).toBe(1);
    expect(stats.clickbaitYes).toBe(0);
  });
});

// ── recordBiasReading ─────────────────────────────────────────────────

describe("recordBiasReading", () => {
  it("appends a reading and updates running averages", async () => {
    await cs().recordBiasReading({
      url: "https://a.com", title: "A", source: "a", political: 20, emotional: 40,
    });
    await cs().recordBiasReading({
      url: "https://b.com", title: "B", source: "b", political: 60, emotional: 80,
    });
    const stats = await cs().getDailyStats();
    expect(stats.biasReadings).toHaveLength(2);
    expect(stats.avgPoliticalBias).toBe(40);
    expect(stats.avgEmotionalBias).toBe(60);
  });
});

// ── recordTopics ──────────────────────────────────────────────────────

describe("recordTopics", () => {
  it("records topics and deduplicates before incrementing", async () => {
    await cs().recordTopics(["AI", "Tech", "AI"]);
    const stats = await cs().getDailyStats();
    expect(stats.topics["AI"]).toBe(1); // deduped by normalizeTopics
    expect(stats.topics["Tech"]).toBe(1);
  });

  it("accumulates topic counts across multiple calls", async () => {
    await cs().recordTopics(["AI"]);
    await cs().recordTopics(["AI", "Tech"]);
    const stats = await cs().getDailyStats();
    expect(stats.topics["AI"]).toBe(2);
    expect(stats.topics["Tech"]).toBe(1);
  });

  it("ignores keywords shorter than 2 characters", async () => {
    await cs().recordTopics(["", "a", "ok"]);
    const stats = await cs().getDailyStats();
    expect(Object.keys(stats.topics)).not.toContain("a");
    expect(stats.topics["ok"]).toBe(1);
  });

  it("is a no-op for an empty array — no storage write", async () => {
    await cs().recordTopics([]);
    expect(await cs().getDailyStats()).toBeNull();
  });
});

// ── updateStreak / getStreak ──────────────────────────────────────────

describe("updateStreak / getStreak", () => {
  function setStoredStreak(current, longest, daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    _localStore.streak = {
      current,
      longest,
      lastActiveDate: d.toISOString().slice(0, 10),
    };
  }

  it("starts streak at 1 for a brand-new user", async () => {
    const streak = await cs().updateStreak();
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
  });

  it("does not increment when called twice on the same day", async () => {
    await cs().updateStreak();
    const streak = await cs().updateStreak();
    expect(streak.current).toBe(1);
  });

  it("increments streak for consecutive days", async () => {
    setStoredStreak(3, 5, 1); // last active yesterday
    const streak = await cs().updateStreak();
    expect(streak.current).toBe(4);
    expect(streak.longest).toBe(5); // unchanged because 4 < 5
  });

  it("updates longest when current exceeds it", async () => {
    setStoredStreak(5, 5, 1);
    const streak = await cs().updateStreak();
    expect(streak.current).toBe(6);
    expect(streak.longest).toBe(6);
  });

  it("resets current to 1 when streak is broken (2+ days ago)", async () => {
    setStoredStreak(3, 5, 2);
    const streak = await cs().updateStreak();
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(5); // preserved
  });

  it("getStreak returns 0 current when streak is broken", async () => {
    setStoredStreak(3, 5, 2);
    const streak = await cs().getStreak();
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(5);
  });

  it("getStreak returns stored streak if active today", async () => {
    setStoredStreak(3, 5, 0); // last active today
    const streak = await cs().getStreak();
    expect(streak.current).toBe(3);
  });

  it("getStreak returns stored streak unchanged if active yesterday", async () => {
    setStoredStreak(3, 5, 1); // active yesterday, not yet updated today
    const streak = await cs().getStreak();
    expect(streak.current).toBe(3);
  });
});

// ── pruneOldStats ─────────────────────────────────────────────────────

describe("pruneOldStats", () => {
  it("removes entries older than keepDays", async () => {
    const today = new Date().toISOString().slice(0, 10);
    _localStore.dailyStats = {
      "2020-01-01": { articlesRead: 5 },
      [today]: { articlesRead: 2 },
    };
    await cs().pruneOldStats(90);
    expect(_localStore.dailyStats["2020-01-01"]).toBeUndefined();
    expect(_localStore.dailyStats[today]).toBeDefined();
  });

  it("does not write storage when nothing is pruned", async () => {
    const today = new Date().toISOString().slice(0, 10);
    _localStore.dailyStats = { [today]: { articlesRead: 1 } };
    const snapshot = JSON.stringify(_localStore);
    await cs().pruneOldStats(90);
    expect(JSON.stringify(_localStore)).toBe(snapshot);
  });
});

// ── updateSourceProfile / incrementSourceReads ─────────────────────────

describe("updateSourceProfile / incrementSourceReads", () => {
  it("creates a new profile on first bias reading", async () => {
    await cs().updateSourceProfile({ hostname: "bbc.com", political: 10, emotional: 30 });
    const profiles = await cs().getSourceProfiles();
    expect(profiles["bbc.com"]).toBeDefined();
    expect(profiles["bbc.com"].totalBiasAnalyses).toBe(1);
    expect(profiles["bbc.com"].avgPoliticalBias).toBe(10);
  });

  it("updates running averages across multiple bias readings", async () => {
    await cs().updateSourceProfile({ hostname: "bbc.com", political: 20, emotional: 40 });
    await cs().updateSourceProfile({ hostname: "bbc.com", political: 60, emotional: 80 });
    const profiles = await cs().getSourceProfiles();
    expect(profiles["bbc.com"].totalBiasAnalyses).toBe(2);
    expect(profiles["bbc.com"].avgPoliticalBias).toBe(40);
    expect(profiles["bbc.com"].avgEmotionalBias).toBe(60);
  });

  it("increments totalReads without touching bias averages", async () => {
    await cs().incrementSourceReads("bbc.com");
    await cs().incrementSourceReads("bbc.com");
    const profiles = await cs().getSourceProfiles();
    expect(profiles["bbc.com"].totalReads).toBe(2);
    expect(profiles["bbc.com"].totalBiasAnalyses).toBe(0);
  });
});

// ── Mutex — concurrent write safety ───────────────────────────────────

describe("mutex — concurrent write safety", () => {
  it("two concurrent saveToHistory calls both persist without data loss", async () => {
    await Promise.all([
      cs().saveToHistory({ title: "Alpha" }),
      cs().saveToHistory({ title: "Beta" }),
    ]);
    const h = await cs().getHistory();
    const titles = h.map((x) => x.title);
    expect(titles).toContain("Alpha");
    expect(titles).toContain("Beta");
    expect(h).toHaveLength(2);
  });

  it("concurrent saveArticle calls produce no duplicates and no lost writes", async () => {
    await Promise.all([
      cs().saveArticle({ article: { url: "https://a.com" }, title: "A" }),
      cs().saveArticle({ article: { url: "https://b.com" }, title: "B" }),
    ]);
    expect(await cs().getSavedArticles()).toHaveLength(2);
  });

  it("three concurrent recordDailyAction('summary') produce articlesRead = 3", async () => {
    // Without mutex: all three read articlesRead=0 before any write → all write 1 → total 1
    // With mutex: serialized reads → 0→1→2→3
    await Promise.all([
      cs().recordDailyAction("summary"),
      cs().recordDailyAction("summary"),
      cs().recordDailyAction("summary"),
    ]);
    expect((await cs().getDailyStats()).articlesRead).toBe(3);
  });

  it("concurrent updateStreak calls increment current only once", async () => {
    // Both calls happen on the same day — second should be a no-op
    const [s1, s2] = await Promise.all([
      cs().updateStreak(),
      cs().updateStreak(),
    ]);
    expect(s1.current).toBe(1);
    expect(s2.current).toBe(1);
  });
});
