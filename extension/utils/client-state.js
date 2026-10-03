(() => {
  // Safe wrappers — prevent "Extension context invalidated" errors
  // when the extension is reloaded while old content scripts are still alive.
  async function _storageGet(keys) {
    try { return await chrome.storage.local.get(keys); }
    catch { return {}; }
  }
  async function _storageSet(items) {
    try { await chrome.storage.local.set(items); }
    catch { /* context invalidated */ }
  }
  async function _storageRemove(keys) {
    try { await chrome.storage.local.remove(keys); }
    catch { /* context invalidated */ }
  }

  async function getDeviceId() {
    const { deviceId } = await _storageGet("deviceId");
    if (deviceId) return deviceId;

    const newId = crypto.randomUUID();
    await _storageSet({ deviceId: newId });
    return newId;
  }

  async function getLang() {
    const { lang } = await _storageGet("lang");
    return lang || "tr";
  }

  async function setLang(lang) {
    await _storageSet({ lang });
  }

  async function saveToHistory(item, maxItems = 10) {
    const { summaryHistory = [] } = await _storageGet("summaryHistory");
    const updated = [item, ...summaryHistory].slice(0, maxItems);
    await _storageSet({ summaryHistory: updated });
  }

  async function getHistory() {
    const { summaryHistory = [] } = await _storageGet("summaryHistory");
    return summaryHistory;
  }

  async function getLastResult() {
    const { lastResult } = await _storageGet("lastResult");
    return lastResult || null;
  }

  async function setLastResult(lastResult) {
    await _storageSet({ lastResult });
  }

  async function clearLastResult() {
    await _storageRemove("lastResult");
  }

  // Summaries are language-specific, so the cache is keyed by lang + url.
  function summaryCacheKey(url, lang) {
    return `${lang}|${url}`;
  }

  async function getCachedSummary(url, lang) {
    const { summaryCache = {} } = await _storageGet("summaryCache");
    return summaryCache[summaryCacheKey(url, lang)] || null;
  }

  async function setCachedSummary(url, lang, item) {
    const { summaryCache = {} } = await _storageGet("summaryCache");
    const keys = Object.keys(summaryCache);
    if (keys.length >= 50) {
      delete summaryCache[keys[0]];
    }
    summaryCache[summaryCacheKey(url, lang)] = { ...item, cachedAt: Date.now() };
    await _storageSet({ summaryCache });
  }

  // ── Stats Infrastructure (Phase 1) ──────────────────────────────────

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  async function getDailyStats(date) {
    const key = date || todayKey();
    const { dailyStats = {} } = await _storageGet("dailyStats");
    return dailyStats[key] || null;
  }

  async function _updateDailyStats(updater) {
    const { dailyStats = {} } = await _storageGet("dailyStats");
    const key = todayKey();
    const today = dailyStats[key] || {
      articlesRead: 0,
      questionsAsked: 0,
      biasAnalyses: 0,
      clickbaitVotes: 0,
      avgPoliticalBias: null,
      avgEmotionalBias: null,
      biasReadings: [],
      sources: {},
    };
    updater(today);
    dailyStats[key] = today;
    await _storageSet({ dailyStats });
  }

  async function recordDailyAction(actionType) {
    await _updateDailyStats((today) => {
      const map = {
        summary: "articlesRead",
        question: "questionsAsked",
        analysis: "biasAnalyses",
        vote: "clickbaitVotes",
      };
      const field = map[actionType];
      if (field) today[field]++;
    });
  }

  async function recordBiasReading({ url, title, source, political, emotional }) {
    await _updateDailyStats((today) => {
      today.biasReadings.push({
        url, title, source,
        political: Number(political),
        emotional: Number(emotional),
        timestamp: Date.now(),
      });
      const readings = today.biasReadings;
      const len = readings.length;
      today.avgPoliticalBias = readings.reduce((s, r) => s + r.political, 0) / len;
      today.avgEmotionalBias = readings.reduce((s, r) => s + r.emotional, 0) / len;
    });
  }

  async function recordSourceRead(hostname) {
    await _updateDailyStats((today) => {
      today.sources[hostname] = (today.sources[hostname] || 0) + 1;
    });
  }

  async function updateStreak() {
    const { streak = { current: 0, longest: 0, lastActiveDate: null } } =
      await _storageGet("streak");
    const today = todayKey();

    if (streak.lastActiveDate === today) {
      await _storageSet({ streak });
      return streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    if (streak.lastActiveDate === yesterdayKey) {
      streak.current++;
    } else {
      streak.current = 1;
    }

    streak.lastActiveDate = today;
    if (streak.current > streak.longest) {
      streak.longest = streak.current;
    }

    await _storageSet({ streak });
    return streak;
  }

  async function getStreak() {
    const { streak = { current: 0, longest: 0, lastActiveDate: null } } =
      await _storageGet("streak");

    const today = todayKey();
    if (streak.lastActiveDate === today) return streak;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    if (streak.lastActiveDate !== yesterdayKey) {
      return { current: 0, longest: streak.longest, lastActiveDate: streak.lastActiveDate };
    }
    return streak;
  }

  async function getWeeklyStats() {
    const { dailyStats = {} } = await _storageGet("dailyStats");
    const result = {
      totalArticles: 0,
      totalAnalyses: 0,
      totalQuestions: 0,
      totalVotes: 0,
      sources: {},
      biasReadings: [],
    };

    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = dailyStats[key];
      if (!day) continue;
      result.totalArticles += day.articlesRead;
      result.totalAnalyses += day.biasAnalyses;
      result.totalQuestions += day.questionsAsked;
      result.totalVotes += day.clickbaitVotes;
      for (const [src, count] of Object.entries(day.sources || {})) {
        result.sources[src] = (result.sources[src] || 0) + count;
      }
      result.biasReadings.push(...(day.biasReadings || []));
    }

    return result;
  }

  async function getSourceProfiles() {
    const { sourceProfiles = {} } = await _storageGet("sourceProfiles");
    return sourceProfiles;
  }

  async function updateSourceProfile({ hostname, political, emotional }) {
    const { sourceProfiles = {} } = await _storageGet("sourceProfiles");
    const profile = sourceProfiles[hostname] || {
      totalReads: 0,
      totalBiasAnalyses: 0,
      avgPoliticalBias: 0,
      avgEmotionalBias: 0,
      lastRead: null,
      biasHistory: [],
    };

    profile.totalBiasAnalyses++;
    profile.biasHistory.push({
      political: Number(political),
      emotional: Number(emotional),
      date: todayKey(),
    });
    if (profile.biasHistory.length > 20) {
      profile.biasHistory = profile.biasHistory.slice(-20);
    }

    const len = profile.biasHistory.length;
    profile.avgPoliticalBias = profile.biasHistory.reduce((s, r) => s + r.political, 0) / len;
    profile.avgEmotionalBias = profile.biasHistory.reduce((s, r) => s + r.emotional, 0) / len;
    profile.lastRead = todayKey();

    sourceProfiles[hostname] = profile;
    await _storageSet({ sourceProfiles });
  }

  async function incrementSourceReads(hostname) {
    const { sourceProfiles = {} } = await _storageGet("sourceProfiles");
    const profile = sourceProfiles[hostname] || {
      totalReads: 0,
      totalBiasAnalyses: 0,
      avgPoliticalBias: 0,
      avgEmotionalBias: 0,
      lastRead: null,
      biasHistory: [],
    };
    profile.totalReads++;
    profile.lastRead = todayKey();
    sourceProfiles[hostname] = profile;
    await _storageSet({ sourceProfiles });
  }

  async function pruneOldStats(keepDays = 90) {
    const { dailyStats = {} } = await _storageGet("dailyStats");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    let changed = false;
    for (const key of Object.keys(dailyStats)) {
      if (key < cutoffKey) {
        delete dailyStats[key];
        changed = true;
      }
    }
    if (changed) {
      await _storageSet({ dailyStats });
    }
  }

  globalThis.AozClientState = {
    getDeviceId,
    getLang,
    setLang,
    saveToHistory,
    getHistory,
    getLastResult,
    setLastResult,
    clearLastResult,
    getCachedSummary,
    setCachedSummary,
    recordDailyAction,
    recordBiasReading,
    recordSourceRead,
    updateStreak,
    getStreak,
    getDailyStats,
    getWeeklyStats,
    getSourceProfiles,
    updateSourceProfile,
    incrementSourceReads,
    pruneOldStats,
  };
})();
