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
