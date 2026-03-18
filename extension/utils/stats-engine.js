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

  globalThis.AozStatsEngine = {
    computeDailyBiasAverages,
    computeBiasLabel,
    computeEmotionalLabel,
    computeBiasDistribution,
    computeTopSources,
    computeStreak,
    getSourceBiasLabel,
  };
})();
