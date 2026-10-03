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

describe("source comparison helpers", () => {
  const classifySourceMatch = () => globalThis.AozSummarySurface.classifySourceMatch;
  const computeSourceComparisonSummary = () => globalThis.AozSummarySurface.computeSourceComparisonSummary;
  const detectTitleFrame = () => globalThis.AozSummarySurface.detectTitleFrame;
  const detectSourceFrame = () => globalThis.AozSummarySurface.detectSourceFrame;
  const getSourceFrameNote = () => globalThis.AozSummarySurface.getSourceFrameNote;
  const getTitleSimilarity = () => globalThis.AozSummarySurface.getTitleSimilarity;
  const t = {
    source_signal_same: "Same source",
    source_signal_close: "Close match",
    source_signal_semantic: "Same event",
    source_signal_semantic_near: "Semantic match",
    source_signal_check: "Check framing",
    source_frame_same: "Same source note",
    source_frame_close: "Close match note",
    source_frame_economic: "Economic note",
    source_frame_political: "Political note",
    source_frame_legal: "Legal note",
    source_frame_security: "Security note",
    source_frame_sensational: "Sensational note",
    source_frame_general: "General frame note",
    source_frame_label_economic: "economic",
    source_frame_label_political: "political",
    source_compare_summary: ({ independentCount, closeCount, frames }) =>
      `${independentCount} independent, ${closeCount} close, frames: ${frames.join(",")}`,
  };

  it("marks same host as same source", () => {
    const result = classifySourceMatch()({
      articleTitle: "Central bank announces interest rate decision",
      articleUrl: "https://example.com/news/a",
      sourceTitle: "Central bank announces interest rate decision",
      sourceUrl: "https://example.com/news/b",
    }, t);

    expect(result).toEqual({ kind: "same", label: "Same source" });
  });

  it("marks overlapping titles as close matches", () => {
    const result = classifySourceMatch()({
      articleTitle: "Merkez Bankasi faiz kararini acikladi",
      articleUrl: "https://one.example/news",
      sourceTitle: "Merkez Bankasi faiz karari sonrasi piyasalarda hareketlilik",
      sourceUrl: "https://two.example/news",
    }, t);

    expect(result.kind).toBe("close");
  });

  it("prefers semantic match metadata over title overlap", () => {
    const result = classifySourceMatch()({
      articleTitle: "Central bank announces interest rate decision",
      articleUrl: "https://one.example/news",
      sourceTitle: "Markets move after policy announcement",
      sourceUrl: "https://two.example/news",
      semanticKind: "same_event",
      semanticScore: 0.9,
    }, t);

    expect(result).toEqual({ kind: "semantic", label: "Same event" });
  });

  it("marks weak title overlap as framing check", () => {
    const result = classifySourceMatch()({
      articleTitle: "Merkez Bankasi faiz kararini acikladi",
      articleUrl: "https://one.example/news",
      sourceTitle: "Spor kulubunde transfer gorusmeleri basladi",
      sourceUrl: "https://two.example/news",
    }, t);

    expect(result).toEqual({ kind: "check", label: "Check framing" });
  });

  it("computes title similarity from meaningful tokens", () => {
    expect(getTitleSimilarity()("Ekonomi piyasalarinda yeni karar", "Yeni ekonomi karari aciklandi"))
      .toBeGreaterThan(0);
  });

  it("detects framing signals from source-only headline terms", () => {
    const result = getSourceFrameNote()({
      matchKind: "check",
      articleTitle: "Merkez Bankasi kararini acikladi",
      sourceTitle: "Son dakika: faiz karari piyasalarda kriz yaratti",
    }, t);

    expect(result).toBe("Sensational note");
  });

  it("detects economic headline framing", () => {
    expect(detectTitleFrame()("piyasalarda enflasyon ve faiz etkisi")).toBe("economic");
  });

  it("detects source-only framing against the article title", () => {
    expect(detectSourceFrame()({
      articleTitle: "Merkez Bankasi kararini acikladi",
      sourceTitle: "Merkez Bankasi karari piyasalarda faiz etkisi yaratti",
    })).toBe("economic");
  });

  it("uses close match note when no specific frame is detected", () => {
    const result = getSourceFrameNote()({
      matchKind: "close",
      articleTitle: "Merkez Bankasi faiz kararini acikladi",
      sourceTitle: "Merkez Bankasi faiz karari sonrasi uzmanlar konustu",
    }, t);

    expect(result).toBe("Close match note");
  });

  it("summarizes independent source count and leading frames", () => {
    const result = computeSourceComparisonSummary()({
      articleUrl: "https://main.example/a",
      comparisons: [
        { sourceUrl: "https://main.example/b", matchKind: "same", frame: "" },
        { sourceUrl: "https://finance.example/a", matchKind: "close", frame: "economic" },
        { sourceUrl: "https://semantic.example/a", matchKind: "semantic", frame: "economic" },
        { sourceUrl: "https://policy.example/a", matchKind: "check", frame: "political" },
        { sourceUrl: "https://policy.example/b", matchKind: "check", frame: "political" },
      ],
      t,
    });

    expect(result.independentCount).toBe(3);
    expect(result.closeCount).toBe(1);
    expect(result.semanticCount).toBe(1);
    expect(result.frames).toEqual(["economic", "political"]);
    expect(result.text).toBe("3 independent, 1 close, frames: economic,political");
  });
});
