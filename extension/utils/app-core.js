(() => {
  const clientState = globalThis.AozClientState;

  if (!clientState) {
    throw new Error("AozClientState is not loaded.");
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response ?? null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  async function requestApi(payload) {
    const response = await sendMessage({ action: "requestApi", payload });
    if (!response) {
      return { error: "network", remaining: null };
    }

    if (response.ok) {
      return response.data ?? { remaining: null };
    }

    return {
      error: response.data?.error || (response.status === 429 ? "limit" : "generic"),
      remaining: typeof response.data?.remaining === "number" ? response.data.remaining : null,
    };
  }

  async function getUsage(deviceId) {
    return requestApi({ action: "usage", deviceId });
  }

  async function getArticle() {
    return sendMessage({ action: "getArticle" });
  }

  async function fetchRelatedSources(title) {
    const response = await sendMessage({ action: "fetchRSS", title });
    return response?.ok ? response.data : [];
  }

  async function setPublishableKey(publishableKey) {
    const response = await sendMessage({ action: "setPublishableKey", publishableKey });
    return response?.ok ? { ok: true } : { ok: false };
  }

  async function summarizeArticle({ article, lang, deviceId, skipCache }) {
    if (!skipCache && article.url) {
      const cached = await clientState.getCachedSummary(article.url, lang);
      if (cached) {
        await clientState.setLastResult(cached);
        return { remaining: null, historyItem: cached, fromCache: true };
      }
    }

    const result = await requestApi({
      action: "summarize",
      text: article.text,
      title: article.title,
      url: article.url,
      lang,
      deviceId,
    });

    if (result.error) return result;

    const sources = result.sources?.length ? result.sources : await fetchRelatedSources(article.title);
    const historyItem = {
      title: article.title,
      summary: result.summary,
      keywords: result.keywords || [],
      sources,
      article,
    };
    const storedHistoryItem = toStoredHistoryItem(historyItem);

    await clientState.setLastResult(storedHistoryItem);
    await clientState.saveToHistory(storedHistoryItem);
    if (article.url) {
      await clientState.setCachedSummary(article.url, lang, storedHistoryItem);
    }

    // Stats hooks
    await clientState.recordDailyAction("summary");
    await clientState.updateStreak();
    try {
      const hostname = new URL(article.url).hostname.replace(/^www\./, "");
      await clientState.recordSourceRead(hostname);
      await clientState.incrementSourceReads(hostname);
    } catch { /* invalid URL — skip */ }

    return { ...result, historyItem };
  }

  async function askQuestion({ article, lang, deviceId, question }) {
    const articleForAi = await hydrateArticleForAi(article);
    if (!articleForAi?.text) {
      return { error: "not_article", remaining: null };
    }

    const result = await requestApi({
      action: "ask",
      text: articleForAi.text,
      title: articleForAi.title,
      url: articleForAi.url,
      lang,
      deviceId,
      question,
    });
    if (!result.error) {
      await clientState.recordDailyAction("question");
    }
    return result;
  }

  async function analyzeArticle({ article, lang, deviceId }) {
    const articleForAi = await hydrateArticleForAi(article);
    if (!articleForAi?.text) {
      return { error: "not_article", remaining: null };
    }

    const result = await requestApi({
      action: "analyze",
      text: articleForAi.text,
      title: articleForAi.title,
      url: articleForAi.url,
      lang,
      deviceId,
    });
    if (!result.error && result.political !== undefined) {
      await clientState.recordDailyAction("analysis");
      try {
        const hostname = new URL(article.url).hostname.replace(/^www\./, "");
        await clientState.recordBiasReading({
          url: article.url,
          title: article.title,
          source: hostname,
          political: result.political,
          emotional: result.emotional,
        });
        await clientState.updateSourceProfile({
          hostname,
          political: result.political,
          emotional: result.emotional,
        });
      } catch { /* invalid URL — skip */ }
    }
    return result;
  }

  async function getVotes({ url, deviceId }) {
    return requestApi({ action: "getvotes", url, deviceId });
  }

  async function submitVote({ url, deviceId, is_clickbait }) {
    const result = await requestApi({ action: "vote", url, deviceId, is_clickbait });
    if (!result.error) {
      await clientState.recordDailyAction("vote");
    }
    return result;
  }

  async function submitFeedback({ url, deviceId, rating }) {
    return requestApi({ action: "feedback", url, deviceId, rating });
  }

  async function hydrateArticleForAi(article) {
    if (article?.text) {
      return article;
    }

    const liveArticle = await getArticle();
    if (!liveArticle?.text) {
      return article;
    }

    if (article?.url && liveArticle.url && !sameArticleUrl(article.url, liveArticle.url)) {
      return article;
    }

    return {
      ...article,
      title: article?.title || liveArticle.title,
      text: liveArticle.text,
      url: article?.url || liveArticle.url,
    };
  }

  function sameArticleUrl(left, right) {
    try {
      return new URL(left).toString() === new URL(right).toString();
    } catch {
      return left === right;
    }
  }

  function toStoredHistoryItem(item) {
    return {
      ...item,
      article: toStoredArticle(item.article),
    };
  }

  function toStoredArticle(article) {
    if (!article) {
      return null;
    }

    return {
      title: article.title || "",
      url: article.url || "",
    };
  }

  globalThis.AozAppCore = {
    getDeviceId: clientState.getDeviceId,
    getLang: clientState.getLang,
    setLang: clientState.setLang,
    getHistory: clientState.getHistory,
    getLastResult: clientState.getLastResult,
    setLastResult: clientState.setLastResult,
    clearLastResult: clientState.clearLastResult,
    getUsage,
    getArticle,
    fetchRelatedSources,
    setPublishableKey,
    summarizeArticle,
    askQuestion,
    analyzeArticle,
    getVotes,
    submitVote,
    submitFeedback,
  };
})();
