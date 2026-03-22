import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

beforeAll(() => {
  // Load the IIFE — it registers globalThis.AozUi
  const code = readFileSync(
    resolve(__dirname, "../extension/utils/ui-common.js"),
    "utf-8",
  );
  new Function(code)();
});

describe("escapeHtml", () => {
  const escapeHtml = () => globalThis.AozUi.escapeHtml;

  it("escapes < and >", () => {
    expect(escapeHtml()("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;",
    );
  });

  it("escapes & and quotes", () => {
    expect(escapeHtml()('a&b "c"')).toBe("a&amp;b &quot;c&quot;");
  });

  it("returns string for non-string input", () => {
    expect(escapeHtml()(42)).toBe("42");
    expect(escapeHtml()(null)).toBe("null");
  });

  it("handles empty string", () => {
    expect(escapeHtml()("")).toBe("");
  });

  it("passes through safe strings unchanged", () => {
    expect(escapeHtml()("hello world")).toBe("hello world");
  });
});

describe("getErrorMessage", () => {
  const getErrorMessage = () => globalThis.AozUi.getErrorMessage;
  const t = {
    error_network: "network",
    error_ai: "ai",
    error_server: "server",
    error_unauthorized: "unauthorized",
    error_rate_limited: "slow down",
    daily_limit: "daily",
    assistant_limit: "assistant",
    error_generic: "generic",
    not_article: "not article",
  };

  it("maps not_article explicitly", () => {
    expect(getErrorMessage()("not_article", t)).toBe("not article");
  });

  it("maps auth_config to unauthorized text", () => {
    expect(getErrorMessage()("auth_config", t)).toBe("unauthorized");
  });

  it("maps rate_limited explicitly", () => {
    expect(getErrorMessage()("rate_limited", t)).toBe("slow down");
  });
});

describe("getBiasDisplay", () => {
  const getBiasDisplay = () => globalThis.AozUi.getBiasDisplay;
  const t = {
    bias_labels: ["Far left", "Left-leaning", "Center", "Right-leaning", "Far right"],
    bias_emo_labels: ["Objective", "Somewhat emotional", "Emotional"],
  };

  it("strong left (-100)", () => {
    const result = getBiasDisplay()({ political: -100, emotional: 10 }, t);
    expect(result.politicalLabel).toBe("Far left");
    expect(result.politicalLeft).toBe("0.0%");
  });

  it("center (0)", () => {
    const result = getBiasDisplay()({ political: 0, emotional: 50 }, t);
    expect(result.politicalLabel).toBe("Center");
    expect(result.politicalLeft).toBe("50.0%");
  });

  it("strong right (100)", () => {
    const result = getBiasDisplay()({ political: 100, emotional: 90 }, t);
    expect(result.politicalLabel).toBe("Far right");
    expect(result.politicalLeft).toBe("100.0%");
  });

  it("left-leaning (-40)", () => {
    const result = getBiasDisplay()({ political: -40, emotional: 20 }, t);
    expect(result.politicalLabel).toBe("Left-leaning");
  });

  it("right-leaning (40)", () => {
    const result = getBiasDisplay()({ political: 40, emotional: 20 }, t);
    expect(result.politicalLabel).toBe("Right-leaning");
  });

  it("boundary: -60 is far left", () => {
    const result = getBiasDisplay()({ political: -60, emotional: 0 }, t);
    // -60 < -60 is false, so index 1
    expect(result.politicalLabel).toBe("Left-leaning");
  });

  it("boundary: -61 is far left", () => {
    const result = getBiasDisplay()({ political: -61, emotional: 0 }, t);
    expect(result.politicalLabel).toBe("Far left");
  });

  it("emotional: objective (< 35)", () => {
    const result = getBiasDisplay()({ political: 0, emotional: 20 }, t);
    expect(result.emotionalLabel).toContain("Objective");
  });

  it("emotional: somewhat emotional (35-64)", () => {
    const result = getBiasDisplay()({ political: 0, emotional: 50 }, t);
    expect(result.emotionalLabel).toContain("Somewhat emotional");
  });

  it("emotional: emotional (>= 65)", () => {
    const result = getBiasDisplay()({ political: 0, emotional: 80 }, t);
    expect(result.emotionalLabel).toContain("Emotional");
    expect(result.emotionalLabel).not.toContain("Somewhat");
  });

  it("emotionalLeft is percentage string", () => {
    const result = getBiasDisplay()({ political: 0, emotional: 45.5 }, t);
    expect(result.emotionalLeft).toBe("45.5%");
  });
});

describe("getClickbaitDisplay", () => {
  const getClickbaitDisplay = () => globalThis.AozUi.getClickbaitDisplay;
  const t = {
    clickbait_yes: "👎 Clickbait",
    clickbait_no: "👍 Not clickbait",
    clickbait_first: "Be the first to vote",
    clickbait_stats: (yes, no) => `${yes} clickbait · ${no} not clickbait`,
  };

  it("zero votes shows first vote text", () => {
    const result = getClickbaitDisplay()({ total: 0, clickbait: 0 }, t);
    expect(result.statsText).toBe("Be the first to vote");
    expect(result.yesActive).toBe(false);
    expect(result.noActive).toBe(false);
  });

  it("positive votes shows stats", () => {
    const result = getClickbaitDisplay()({ total: 10, clickbait: 3 }, t);
    expect(result.statsText).toBe("3 clickbait · 7 not clickbait");
    expect(result.yesText).toBe("👎 Clickbait (3)");
    expect(result.noText).toBe("👍 Not clickbait (7)");
  });

  it("userVote true activates yes", () => {
    const result = getClickbaitDisplay()({ total: 5, clickbait: 2, userVote: true }, t);
    expect(result.yesActive).toBe(true);
    expect(result.noActive).toBe(false);
  });

  it("userVote false activates no", () => {
    const result = getClickbaitDisplay()({ total: 5, clickbait: 2, userVote: false }, t);
    expect(result.yesActive).toBe(false);
    expect(result.noActive).toBe(true);
  });

  it("userVote null activates neither", () => {
    const result = getClickbaitDisplay()({ total: 5, clickbait: 2, userVote: null }, t);
    expect(result.yesActive).toBe(false);
    expect(result.noActive).toBe(false);
  });

  it("handles missing fields gracefully", () => {
    const result = getClickbaitDisplay()({}, t);
    expect(result.statsText).toBe("Be the first to vote");
    expect(result.yesText).toBe("👎 Clickbait (0)");
    expect(result.noText).toBe("👍 Not clickbait (0)");
  });
});
