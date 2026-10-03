(() => {
  /**
   * Pure computation functions for stats, bias timeline, and source profiles.
   * No DOM access — fully testable.
   */

  function computeDailyBiasAverages(dailyStats, days = 7) {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = dailyStats[key];
      if (!day || !day.biasReadings || day.biasReadings.length === 0) {
        result.push({ date: key, avgPolitical: null, avgEmotional: null, count: 0 });
        continue;
      }
      const readings = day.biasReadings;
      const len = readings.length;
      result.push({
        date: key,
        avgPolitical: readings.reduce((s, r) => s + r.political, 0) / len,
        avgEmotional: readings.reduce((s, r) => s + r.emotional, 0) / len,
        count: len,
      });
    }
    return result;
  }

  function computeBiasLabel(avgPolitical, lang) {
    if (avgPolitical === null || avgPolitical === undefined) return "";
    const labels = lang === "en"
      ? ["Far Left", "Left", "Center-Left", "Center", "Center-Right", "Right", "Far Right"]
      : ["Güçlü Sol", "Sol", "Merkez-Sol", "Merkez", "Merkez-Sağ", "Sağ", "Güçlü Sağ"];
    const v = Number(avgPolitical);
    if (v < -60) return labels[0];
    if (v < -30) return labels[1];
    if (v < -10) return labels[2];
    if (v <= 10) return labels[3];
    if (v <= 30) return labels[4];
    if (v <= 60) return labels[5];
    return labels[6];
  }

  function computeEmotionalLabel(avgEmotional, lang) {
    if (avgEmotional === null || avgEmotional === undefined) return "";
    const v = Number(avgEmotional);
    if (lang === "en") {
      if (v < 35) return "Objective";
      if (v < 65) return "Moderate";
      return "Sensational";
    }
    if (v < 35) return "Nesnel";
    if (v < 65) return "Orta";
    return "Sansasyonel";
  }

  function computeBiasDistribution(biasReadings) {
    const dist = { farLeft: 0, left: 0, center: 0, right: 0, farRight: 0 };
    if (!biasReadings || biasReadings.length === 0) return dist;
    for (const r of biasReadings) {
      const v = Number(r.political);
      if (v < -60) dist.farLeft++;
      else if (v < -20) dist.left++;
      else if (v <= 20) dist.center++;
      else if (v <= 60) dist.right++;
      else dist.farRight++;
    }
    return dist;
  }

  function computeTopSources(sourcesMap, limit = 5) {
    return Object.entries(sourcesMap || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  function computeTopTopics(topicsMap, limit = 5) {
    return Object.entries(topicsMap || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  function computeStreak(dailyStats, today) {
    let current = 0;
    const d = new Date(today || new Date());
    while (true) {
      const key = d.toISOString().slice(0, 10);
      const day = dailyStats[key];
      if (day && day.articlesRead > 0) {
        current++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return current;
  }

  function getSourceBiasLabel(profile, lang) {
    if (!profile || profile.totalBiasAnalyses < 3) return null;
    return {
      political: computeBiasLabel(profile.avgPoliticalBias, lang),
      emotional: computeEmotionalLabel(profile.avgEmotionalBias, lang),
      emotionalValue: Math.round(profile.avgEmotionalBias),
    };
  }

  function computeMediaDietSummary(weeklyStats, lang) {
    const stats = weeklyStats || {};
    const totalArticles = Number(stats.totalArticles) || 0;
    const sources = stats.sources || {};
    const readings = Array.isArray(stats.biasReadings) ? stats.biasReadings : [];
    const uniqueSources = Object.keys(sources).length;
    const topSource = computeTopSources(sources, 1)[0] || null;
    const sourceDiversityScore = computeSourceDiversityScore(sources, totalArticles);
    const avgEmotional = readings.length
      ? readings.reduce((sum, item) => sum + Number(item.emotional || 0), 0) / readings.length
      : null;
    const emotionalExposure = avgEmotional == null ? "unknown" : avgEmotional >= 65 ? "high" : avgEmotional >= 35 ? "moderate" : "low";
    const clickbait = computeClickbaitExposure(stats);

    return {
      totalArticles,
      uniqueSources,
      topSource,
      sourceDiversityScore,
      sourceDiversityLabel: getSourceDiversityLabel(sourceDiversityScore, lang),
      avgEmotional,
      emotionalExposure,
      emotionalExposureLabel: getEmotionalExposureLabel(emotionalExposure, lang),
      clickbait,
      clickbaitExposureLabel: getClickbaitExposureLabel(clickbait, lang),
      recommendations: getMediaDietRecommendations({
        totalArticles,
        uniqueSources,
        sourceDiversityScore,
        emotionalExposure,
        clickbait,
        topSource,
        lang,
      }),
      summaryText: getMediaDietSummaryText({
        totalArticles,
        uniqueSources,
        sourceDiversityScore,
        emotionalExposure,
        lang,
      }),
    };
  }

  function buildMediaDietShareText(weeklyStats, lang) {
    const diet = computeMediaDietSummary(weeklyStats, lang);
    const topTopics = computeTopTopics(weeklyStats?.topics, 3);
    const topicText = topTopics.length
      ? topTopics.map((topic) => topic.name).join(", ")
      : (lang === "en" ? "not enough topic data" : "konu verisi yetersiz");
    const clickbaitText = diet.clickbait.ratio == null
      ? (lang === "en" ? "no clickbait signal yet" : "clickbait sinyali yok")
      : `%${Math.round(diet.clickbait.ratio * 100)}`;

    if (lang === "en") {
      return [
        "My Weekly Media Diet",
        `${diet.totalArticles} articles, ${diet.uniqueSources} sources`,
        `Source variety: ${diet.sourceDiversityLabel} (${diet.sourceDiversityScore}%)`,
        `Tone: ${diet.emotionalExposureLabel}`,
        `Clickbait exposure: ${clickbaitText}`,
        `Top topics: ${topicText}`,
        "Built with AI News Summarizer",
      ].join("\n");
    }

    return [
      "Haftalik Medya Diyetim",
      `${diet.totalArticles} haber, ${diet.uniqueSources} kaynak`,
      `Kaynak cesitliligi: ${diet.sourceDiversityLabel} (%${diet.sourceDiversityScore})`,
      `Ton: ${diet.emotionalExposureLabel}`,
      `Clickbait maruziyeti: ${clickbaitText}`,
      `Konular: ${topicText}`,
      "AI Haber Ozetleyici ile olusturuldu",
    ].join("\n");
  }

  function computeClickbaitExposure(weeklyStats) {
    const yes = Number(weeklyStats?.clickbaitYes) || 0;
    const no = Number(weeklyStats?.clickbaitNo) || 0;
    const total = yes + no;
    return {
      yes,
      no,
      total,
      ratio: total ? yes / total : null,
    };
  }

  function getClickbaitExposureLabel(clickbait, lang) {
    const ratio = clickbait?.ratio;
    if (ratio == null) {
      return lang === "en" ? "No clickbait signal yet" : "Clickbait sinyali yok";
    }
    const pct = Math.round(ratio * 100);
    if (lang === "en") {
      if (ratio >= 0.6) return `High clickbait exposure (${pct}%)`;
      if (ratio >= 0.3) return `Moderate clickbait exposure (${pct}%)`;
      return `Low clickbait exposure (${pct}%)`;
    }
    if (ratio >= 0.6) return `Yüksek clickbait maruziyeti (%${pct})`;
    if (ratio >= 0.3) return `Orta clickbait maruziyeti (%${pct})`;
    return `Düşük clickbait maruziyeti (%${pct})`;
  }

  function getMediaDietRecommendations({ totalArticles, uniqueSources, sourceDiversityScore, emotionalExposure, clickbait, topSource, lang }) {
    if (!totalArticles) {
      return [
        lang === "en"
          ? "Summarize at least 3 articles this week to unlock better signals."
          : "Daha iyi sinyaller için bu hafta en az 3 haber özetle.",
      ];
    }

    const recs = [];

    if (sourceDiversityScore < 40) {
      recs.push(lang === "en"
        ? "Add 2-3 alternative sources before forming a view."
        : "Bir kanaat oluşturmadan önce 2-3 alternatif kaynak ekle.");
    } else if (sourceDiversityScore >= 70) {
      recs.push(lang === "en"
        ? "Source variety looks healthy this week."
        : "Bu hafta kaynak çeşitliliğin sağlıklı görünüyor.");
    }

    if (emotionalExposure === "high") {
      recs.push(lang === "en"
        ? "High emotional tone: compare with a calmer source."
        : "Duygusal ton yüksek: daha sakin bir kaynakla karşılaştır.");
    } else if (emotionalExposure === "low" && uniqueSources >= 2) {
      recs.push(lang === "en"
        ? "Tone looks calm; keep checking multiple frames."
        : "Ton sakin görünüyor; yine de farklı çerçeveleri kontrol et.");
    }

    if (clickbait?.ratio >= 0.6) {
      recs.push(lang === "en"
        ? "Clickbait exposure is high; compare headlines before sharing."
        : "Clickbait maruziyeti yüksek; paylaşmadan önce başlıkları karşılaştır.");
    }

    if (topSource && totalArticles >= 3 && topSource.count / totalArticles >= 0.6) {
      recs.push(lang === "en"
        ? `${topSource.name} dominates your week; balance it with another source.`
        : `Bu hafta ${topSource.name} baskın; başka bir kaynakla dengele.`);
    }

    if (!recs.length) {
      recs.push(lang === "en"
        ? "Keep building your media diet with a few more articles."
        : "Birkaç haber daha ekleyerek medya diyetini netleştir.");
    }

    return recs.slice(0, 3);
  }

  function computeSourceDiversityScore(sourcesMap, totalArticles) {
    const counts = Object.values(sourcesMap || {}).map(Number).filter((n) => n > 0);
    const total = Number(totalArticles) || counts.reduce((sum, n) => sum + n, 0);
    if (!total || counts.length === 0) return 0;
    if (counts.length === 1) return 20;
    const maxShare = Math.max(...counts) / total;
    const varietyScore = Math.min(1, counts.length / 5) * 60;
    const balanceScore = (1 - maxShare) * 40;
    return Math.round(Math.max(0, Math.min(100, varietyScore + balanceScore)));
  }

  function getSourceDiversityLabel(score, lang) {
    const v = Number(score) || 0;
    if (lang === "en") {
      if (v >= 70) return "Diverse";
      if (v >= 40) return "Mixed";
      return "Narrow";
    }
    if (v >= 70) return "Çeşitli";
    if (v >= 40) return "Karışık";
    return "Dar";
  }

  function getEmotionalExposureLabel(level, lang) {
    if (lang === "en") {
      if (level === "high") return "High emotional exposure";
      if (level === "moderate") return "Moderate emotional exposure";
      if (level === "low") return "Low emotional exposure";
      return "Not enough tone data";
    }
    if (level === "high") return "Yüksek duygusal maruziyet";
    if (level === "moderate") return "Orta duygusal maruziyet";
    if (level === "low") return "Düşük duygusal maruziyet";
    return "Ton verisi yetersiz";
  }

  function getMediaDietSummaryText({ totalArticles, uniqueSources, sourceDiversityScore, emotionalExposure, lang }) {
    if (!totalArticles) {
      return lang === "en"
        ? "Summarize a few articles to build your media diet."
        : "Medya diyetini oluşturmak için birkaç haber özetle.";
    }

    if (lang === "en") {
      const diversity = sourceDiversityScore >= 70 ? "a broad source mix" : sourceDiversityScore >= 40 ? "a moderate source mix" : "a narrow source mix";
      const tone = emotionalExposure === "unknown" ? "not enough tone data yet" : getEmotionalExposureLabel(emotionalExposure, lang).toLowerCase();
      return `This week: ${totalArticles} articles, ${uniqueSources} sources, ${diversity}, ${tone}.`;
    }

    const diversity = sourceDiversityScore >= 70 ? "geniş kaynak dağılımı" : sourceDiversityScore >= 40 ? "orta kaynak dağılımı" : "dar kaynak dağılımı";
    const tone = emotionalExposure === "unknown" ? "ton verisi henüz yetersiz" : getEmotionalExposureLabel(emotionalExposure, lang).toLowerCase();
    return `Bu hafta: ${totalArticles} haber, ${uniqueSources} kaynak, ${diversity}, ${tone}.`;
  }

  globalThis.AozStatsEngine = {
    computeDailyBiasAverages,
    computeBiasLabel,
    computeEmotionalLabel,
    computeBiasDistribution,
    computeTopSources,
    computeTopTopics,
    computeStreak,
    getSourceBiasLabel,
    computeMediaDietSummary,
    computeSourceDiversityScore,
    computeClickbaitExposure,
    getClickbaitExposureLabel,
    getMediaDietRecommendations,
    buildMediaDietShareText,
  };
})();
