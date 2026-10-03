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

  // ── Async mutex ───────────────────────────────────────────────────────
  // Serializes concurrent read-modify-write operations per storage key.
  // Without this, two message handlers awaiting storage.get() at the same
  // time both read stale data and one silently overwrites the other's write.
  // JavaScript Map preserves insertion order: each key holds the tail of
  // the pending-promise chain; new callers append to it.
  const _mutexChains = new Map();

  function _withMutex(key, fn) {
    const prev = _mutexChains.get(key) ?? Promise.resolve();
    let settle;
    const gate = new Promise((r) => { settle = r; });
    _mutexChains.set(key, gate);
    return prev.then(fn).finally(() => {
      settle();
      if (_mutexChains.get(key) === gate) _mutexChains.delete(key);
    });
  }

  async function getDeviceId() {
    const { deviceId } = await _storageGet("deviceId");
    if (deviceId) return deviceId;

    // Local storage was cleared — try sync before generating a new ID.
    // A new ID would reset the server-side daily rate limit for this device.
    try {
      const synced = await chrome.storage.sync.get("deviceId");
      if (synced.deviceId) {
        await _storageSet({ deviceId: synced.deviceId });
        return synced.deviceId;
      }
    } catch { /* sync unavailable in some environments */ }

    const newId = crypto.randomUUID();
    await _storageSet({ deviceId: newId });
    try { await chrome.storage.sync.set({ deviceId: newId }); } catch { /* best-effort */ }
    return newId;
  }

  // ── Sync storage helpers ──────────────────────────────────────────────
  // chrome.storage.sync has strict limits: ~8 KB per key, ~100 KB total.
  // We keep only a compact { url, title, savedAt } representation in sync so
  // the user's list survives a local-storage wipe even if full summaries are lost.
  // On recovery the items show in the list; clicking re-triggers summarization.

  // Max compact entries to persist in sync (each ~150-200 B → stays well under 8 KB)
  const _SYNC_HISTORY_MAX = 20;
  const _SYNC_ARTICLES_MAX = 30;

  function _toCompact(item) {
    return {
      url:     item?.article?.url   || item?.url   || "",
      title:   item?.article?.title || item?.title || "",
      savedAt: item?.savedAt ?? Date.now(),
    };
  }

  async function _writeSyncList(key, items, max) {
    try {
      const compact = items.slice(0, max).map(_toCompact);
      await chrome.storage.sync.set({ [key]: compact });
    } catch { /* quota exceeded or sync unavailable — best effort */ }
  }

  async function _restoreFromSync(localKey, syncKey) {
    try {
      const synced = await chrome.storage.sync.get(syncKey);
      const items = synced[syncKey];
      if (Array.isArray(items) && items.length > 0) {
        await _storageSet({ [localKey]: items });
        return items;
      }
    } catch { /* sync unavailable */ }
    return [];
  }

  async function getLang() {
    const { lang } = await _storageGet("lang");
    return lang || "tr";
  }

  async function setLang(lang) {
    await _storageSet({ lang });
  }

  async function saveToHistory(item, maxItems = 10) {
    return _withMutex("summaryHistory", async () => {
      const { summaryHistory = [] } = await _storageGet("summaryHistory");
      const updated = [item, ...summaryHistory].slice(0, maxItems);
      await _storageSet({ summaryHistory: updated });
      void _writeSyncList("summaryHistorySync", updated, _SYNC_HISTORY_MAX);
    });
  }

  async function getHistory() {
    const { summaryHistory } = await _storageGet("summaryHistory");
    if (summaryHistory?.length) return summaryHistory;
    // Local was cleared — restore compact backup from sync
    return _restoreFromSync("summaryHistory", "summaryHistorySync");
  }

  async function saveArticle(item, maxItems = 50) {
    if (!item) return [];
    return _withMutex("savedArticles", async () => {
      const { savedArticles = [] } = await _storageGet("savedArticles");
      const itemUrl = item.article?.url || item.url || "";
      const withoutDuplicate = savedArticles.filter((saved) => {
        const savedUrl = saved.article?.url || saved.url || "";
        return itemUrl ? savedUrl !== itemUrl : saved.title !== item.title;
      });
      const updated = [{ ...item, savedAt: Date.now() }, ...withoutDuplicate].slice(0, maxItems);
      await _storageSet({ savedArticles: updated });
      void _writeSyncList("savedArticlesSync", updated, _SYNC_ARTICLES_MAX);
      return updated;
    });
  }

  async function getSavedArticles() {
    const { savedArticles } = await _storageGet("savedArticles");
    if (savedArticles?.length) return savedArticles;
    // Local was cleared — restore compact backup from sync
    return _restoreFromSync("savedArticles", "savedArticlesSync");
  }

  async function isArticleSaved(item) {
    const itemUrl = item?.article?.url || item?.url || "";
    if (!itemUrl) return false;
    const saved = await getSavedArticles();
    return saved.some((entry) => (entry.article?.url || entry.url || "") === itemUrl);
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

  async function getCachedSummary(url) {
    const { summaryCache = {} } = await _storageGet("summaryCache");
    return summaryCache[url] || null;
  }

  async function setCachedSummary(url, item) {
    return _withMutex("summaryCache", async () => {
      const { summaryCache = {} } = await _storageGet("summaryCache");
      const keys = Object.keys(summaryCache);
      if (keys.length >= 50) {
        delete summaryCache[keys[0]];
      }
      summaryCache[url] = { ...item, cachedAt: Date.now() };
      await _storageSet({ summaryCache });
    });
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
    return _withMutex("dailyStats", async () => {
      const { dailyStats = {} } = await _storageGet("dailyStats");
      const key = todayKey();
      const today = dailyStats[key] || {
        articlesRead: 0,
        questionsAsked: 0,
        biasAnalyses: 0,
        clickbaitVotes: 0,
        clickbaitYes: 0,
        clickbaitNo: 0,
        avgPoliticalBias: null,
        avgEmotionalBias: null,
        biasReadings: [],
        sources: {},
        topics: {},
      };
      updater(today);
      dailyStats[key] = today;
      await _storageSet({ dailyStats });
    });
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

  async function recordClickbaitVote(isClickbait) {
    await _updateDailyStats((today) => {
      today.clickbaitVotes = (today.clickbaitVotes || 0) + 1;
      if (isClickbait) {
        today.clickbaitYes = (today.clickbaitYes || 0) + 1;
      } else {
        today.clickbaitNo = (today.clickbaitNo || 0) + 1;
      }
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

  async function recordTopics(keywords = []) {
    const normalized = normalizeTopics(keywords);
    if (!normalized.length) return;

    await _updateDailyStats((today) => {
      today.topics = today.topics || {};
      normalized.forEach((topic) => {
        today.topics[topic] = (today.topics[topic] || 0) + 1;
      });
    });
  }

  function normalizeTopics(keywords = []) {
    return Array.from(new Set(
      (Array.isArray(keywords) ? keywords : [])
        .map((keyword) => String(keyword || "").trim())
        .filter((keyword) => keyword.length >= 2)
        .slice(0, 8),
    ));
  }

  async function updateStreak() {
    return _withMutex("streak", async () => {
      const { streak = { current: 0, longest: 0, lastActiveDate: null } } =
        await _storageGet("streak");
      const today = todayKey();

      if (streak.lastActiveDate === today) {
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
    });
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
      clickbaitYes: 0,
      clickbaitNo: 0,
      sources: {},
      topics: {},
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
      result.clickbaitYes += day.clickbaitYes || 0;
      result.clickbaitNo += day.clickbaitNo || 0;
      for (const [src, count] of Object.entries(day.sources || {})) {
        result.sources[src] = (result.sources[src] || 0) + count;
      }
      for (const [topic, count] of Object.entries(day.topics || {})) {
        result.topics[topic] = (result.topics[topic] || 0) + count;
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
    return _withMutex("sourceProfiles", async () => {
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
    });
  }

  async function incrementSourceReads(hostname) {
    return _withMutex("sourceProfiles", async () => {
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
    });
  }

  async function pruneOldStats(keepDays = 90) {
    return _withMutex("dailyStats", async () => {
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
    });
  }

  globalThis.AozClientState = {
    getDeviceId,
    getLang,
    setLang,
    saveToHistory,
    getHistory,
    saveArticle,
    getSavedArticles,
    isArticleSaved,
    getLastResult,
    setLastResult,
    clearLastResult,
    getCachedSummary,
    setCachedSummary,
    recordDailyAction,
    recordClickbaitVote,
    recordBiasReading,
    recordSourceRead,
    recordTopics,
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
