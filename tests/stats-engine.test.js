import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

beforeAll(() => {
  const code = readFileSync(
    resolve(__dirname, "../extension/utils/stats-engine.js"),
    "utf-8",
  );
  new Function(code)();
});

describe("computeBiasLabel", () => {
  const fn = () => globalThis.AozStatsEngine.computeBiasLabel;

  it("returns empty string for null", () => {
    expect(fn()(null, "tr")).toBe("");
  });

  it("far left for -80", () => {
    expect(fn()(-80, "tr")).toBe("Güçlü Sol");
    expect(fn()(-80, "en")).toBe("Far Left");
  });

  it("left for -40", () => {
    expect(fn()(-40, "tr")).toBe("Sol");
    expect(fn()(-40, "en")).toBe("Left");
  });

  it("center-left for -15", () => {
    expect(fn()(-15, "tr")).toBe("Merkez-Sol");
  });

  it("center for 0", () => {
    expect(fn()(0, "tr")).toBe("Merkez");
    expect(fn()(0, "en")).toBe("Center");
  });

  it("center-right for 20", () => {
    expect(fn()(20, "tr")).toBe("Merkez-Sağ");
  });

  it("right for 50", () => {
    expect(fn()(50, "tr")).toBe("Sağ");
    expect(fn()(50, "en")).toBe("Right");
  });

  it("far right for 80", () => {
    expect(fn()(80, "tr")).toBe("Güçlü Sağ");
    expect(fn()(80, "en")).toBe("Far Right");
  });
});

describe("computeEmotionalLabel", () => {
  const fn = () => globalThis.AozStatsEngine.computeEmotionalLabel;

  it("returns empty string for null", () => {
    expect(fn()(null, "tr")).toBe("");
  });

  it("objective for low values", () => {
    expect(fn()(20, "tr")).toBe("Nesnel");
    expect(fn()(20, "en")).toBe("Objective");
  });

  it("moderate for mid values", () => {
    expect(fn()(50, "tr")).toBe("Orta");
    expect(fn()(50, "en")).toBe("Moderate");
  });

  it("sensational for high values", () => {
    expect(fn()(80, "tr")).toBe("Sansasyonel");
    expect(fn()(80, "en")).toBe("Sensational");
  });
});

describe("computeDailyBiasAverages", () => {
  const fn = () => globalThis.AozStatsEngine.computeDailyBiasAverages;

  it("returns empty entries for missing days", () => {
    const result = fn()({}, 3);
    expect(result).toHaveLength(3);
    result.forEach((d) => {
      expect(d.count).toBe(0);
      expect(d.avgPolitical).toBeNull();
    });
  });

  it("calculates averages correctly", () => {
    const today = new Date().toISOString().slice(0, 10);
    const stats = {
      [today]: {
        biasReadings: [
          { political: 20, emotional: 40 },
          { political: -10, emotional: 60 },
        ],
      },
    };
    const result = fn()(stats, 1);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
    expect(result[0].avgPolitical).toBe(5);
    expect(result[0].avgEmotional).toBe(50);
  });
});

describe("computeBiasDistribution", () => {
  const fn = () => globalThis.AozStatsEngine.computeBiasDistribution;

  it("returns zeros for empty array", () => {
    const result = fn()([]);
    expect(result).toEqual({ farLeft: 0, left: 0, center: 0, right: 0, farRight: 0 });
  });

  it("distributes correctly", () => {
    const readings = [
      { political: -80 },
      { political: -40 },
      { political: 0 },
      { political: 40 },
      { political: 80 },
    ];
    const result = fn()(readings);
    expect(result.farLeft).toBe(1);
    expect(result.left).toBe(1);
    expect(result.center).toBe(1);
    expect(result.right).toBe(1);
    expect(result.farRight).toBe(1);
  });
});

describe("computeTopSources", () => {
  const fn = () => globalThis.AozStatsEngine.computeTopSources;

  it("sorts by count descending", () => {
    const sources = { "a.com": 5, "b.com": 10, "c.com": 3 };
    const result = fn()(sources, 2);
    expect(result).toEqual([
      { name: "b.com", count: 10 },
      { name: "a.com", count: 5 },
    ]);
  });

  it("returns empty for null", () => {
    expect(fn()(null, 5)).toEqual([]);
  });
});

describe("computeTopTopics", () => {
  const fn = () => globalThis.AozStatsEngine.computeTopTopics;

  it("sorts topics by count descending", () => {
    const topics = { ekonomi: 2, politika: 5, teknoloji: 3 };
    const result = fn()(topics, 2);
    expect(result).toEqual([
      { name: "politika", count: 5 },
      { name: "teknoloji", count: 3 },
    ]);
  });

  it("sorts equal counts alphabetically", () => {
    const topics = { zeta: 2, alfa: 2 };
    const result = fn()(topics, 2);
    expect(result).toEqual([
      { name: "alfa", count: 2 },
      { name: "zeta", count: 2 },
    ]);
  });

  it("returns empty for missing topics", () => {
    expect(fn()(undefined, 5)).toEqual([]);
  });
});

describe("computeStreak", () => {
  const fn = () => globalThis.AozStatsEngine.computeStreak;

  it("returns 0 for empty stats", () => {
    expect(fn()({}, new Date())).toBe(0);
  });

  it("counts consecutive days", () => {
    const today = new Date();
    const stats = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      stats[d.toISOString().slice(0, 10)] = { articlesRead: 1 };
    }
    expect(fn()(stats, today)).toBe(5);
  });

  it("breaks on gap", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Skip yesterday
    const stats = {
      [today.toISOString().slice(0, 10)]: { articlesRead: 2 },
    };
    expect(fn()(stats, today)).toBe(1);
  });
});

describe("getSourceBiasLabel", () => {
  const fn = () => globalThis.AozStatsEngine.getSourceBiasLabel;

  it("returns null for insufficient data", () => {
    expect(fn()({ totalBiasAnalyses: 2 }, "tr")).toBeNull();
  });

  it("returns labels for sufficient data", () => {
    const profile = {
      totalBiasAnalyses: 5,
      avgPoliticalBias: 15,
      avgEmotionalBias: 45,
    };
    const result = fn()(profile, "tr");
    expect(result).not.toBeNull();
    expect(result.political).toBe("Merkez-Sağ");
    expect(result.emotional).toBe("Orta");
    expect(result.emotionalValue).toBe(45);
  });
});

describe("computeSourceDiversityScore", () => {
  const fn = () => globalThis.AozStatsEngine.computeSourceDiversityScore;

  it("returns 0 for no sources", () => {
    expect(fn()({}, 0)).toBe(0);
  });

  it("keeps single-source diets low", () => {
    expect(fn()({ "a.com": 5 }, 5)).toBe(20);
  });

  it("rewards broader balanced source mixes", () => {
    const narrow = fn()({ "a.com": 8, "b.com": 2 }, 10);
    const broad = fn()({ "a.com": 2, "b.com": 2, "c.com": 2, "d.com": 2, "e.com": 2 }, 10);
    expect(broad).toBeGreaterThan(narrow);
    expect(broad).toBeGreaterThanOrEqual(90);
  });
});

describe("computeMediaDietSummary", () => {
  const fn = () => globalThis.AozStatsEngine.computeMediaDietSummary;

  it("summarizes empty media diet", () => {
    const result = fn()({ totalArticles: 0, sources: {}, biasReadings: [] }, "en");
    expect(result.totalArticles).toBe(0);
    expect(result.uniqueSources).toBe(0);
    expect(result.emotionalExposure).toBe("unknown");
    expect(result.summaryText).toContain("Summarize");
  });

  it("summarizes weekly source and emotional exposure", () => {
    const result = fn()({
      totalArticles: 4,
      sources: { "a.com": 3, "b.com": 1 },
      clickbaitYes: 3,
      clickbaitNo: 1,
      biasReadings: [
        { emotional: 80 },
        { emotional: 70 },
      ],
    }, "tr");

    expect(result.uniqueSources).toBe(2);
    expect(result.topSource).toEqual({ name: "a.com", count: 3 });
    expect(result.emotionalExposure).toBe("high");
    expect(result.emotionalExposureLabel).toBe("Yüksek duygusal maruziyet");
    expect(result.clickbait.ratio).toBe(0.75);
    expect(result.clickbaitExposureLabel).toContain("Yüksek clickbait");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.summaryText).toContain("4 haber");
  });
});

describe("computeClickbaitExposure", () => {
  const fn = () => globalThis.AozStatsEngine.computeClickbaitExposure;

  it("returns null ratio without votes", () => {
    expect(fn()({ clickbaitYes: 0, clickbaitNo: 0 })).toEqual({
      yes: 0,
      no: 0,
      total: 0,
      ratio: null,
    });
  });

  it("computes yes ratio", () => {
    expect(fn()({ clickbaitYes: 3, clickbaitNo: 1 })).toEqual({
      yes: 3,
      no: 1,
      total: 4,
      ratio: 0.75,
    });
  });
});

describe("getMediaDietRecommendations", () => {
  const fn = () => globalThis.AozStatsEngine.getMediaDietRecommendations;

  it("nudges empty users to build signal", () => {
    const result = fn()({
      totalArticles: 0,
      uniqueSources: 0,
      sourceDiversityScore: 0,
      emotionalExposure: "unknown",
      topSource: null,
      lang: "en",
    });

    expect(result[0]).toContain("at least 3 articles");
  });

  it("recommends alternatives for narrow high-emotion diets", () => {
    const result = fn()({
      totalArticles: 5,
      uniqueSources: 1,
      sourceDiversityScore: 20,
      emotionalExposure: "high",
      clickbait: { ratio: 0.2 },
      topSource: { name: "a.com", count: 5 },
      lang: "tr",
    });

    expect(result).toHaveLength(3);
    expect(result.join(" ")).toContain("alternatif kaynak");
    expect(result.join(" ")).toContain("Duygusal ton yüksek");
    expect(result.join(" ")).toContain("a.com");
  });

  it("recommends headline comparison for high clickbait exposure", () => {
    const result = fn()({
      totalArticles: 5,
      uniqueSources: 3,
      sourceDiversityScore: 60,
      emotionalExposure: "moderate",
      clickbait: { ratio: 0.8 },
      topSource: { name: "a.com", count: 2 },
      lang: "tr",
    });

    expect(result.join(" ")).toContain("Clickbait maruziyeti yüksek");
  });

  it("recognizes healthy source variety", () => {
    const result = fn()({
      totalArticles: 5,
      uniqueSources: 5,
      sourceDiversityScore: 90,
      emotionalExposure: "moderate",
      clickbait: { ratio: 0.1 },
      topSource: { name: "a.com", count: 1 },
      lang: "tr",
    });

    expect(result[0]).toContain("kaynak çeşitliliğin sağlıklı");
  });
});

describe("buildMediaDietShareText", () => {
  const fn = () => globalThis.AozStatsEngine.buildMediaDietShareText;

  it("builds a compact weekly share text in English", () => {
    const result = fn()({
      totalArticles: 3,
      sources: { "a.com": 2, "b.com": 1 },
      topics: { economy: 2, policy: 1 },
      clickbaitYes: 1,
      clickbaitNo: 1,
      biasReadings: [{ emotional: 50 }],
    }, "en");

    expect(result).toContain("My Weekly Media Diet");
    expect(result).toContain("3 articles, 2 sources");
    expect(result).toContain("Top topics: economy, policy");
  });
});
