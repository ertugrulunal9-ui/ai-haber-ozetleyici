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

  async function summarizeArticle({ article, lang, deviceId }) {
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
      sources,
      article,
    };

    await clientState.setLastResult(historyItem);
    await clientState.saveToHistory(historyItem);

    return { ...result, historyItem };
  }

  async function askQuestion({ article, lang, deviceId, question }) {
    return requestApi({
      action: "ask",
      text: article.text,
      title: article.title,
      url: article.url,
      lang,
      deviceId,
      question,
    });
  }

  async function analyzeArticle({ article, lang, deviceId }) {
    return requestApi({
      action: "analyze",
      text: article.text,
      title: article.title,
      url: article.url,
      lang,
      deviceId,
    });
  }

  async function getVotes({ url, deviceId }) {
    return requestApi({ action: "getvotes", url, deviceId });
  }

  async function submitVote({ url, deviceId, is_clickbait }) {
    return requestApi({ action: "vote", url, deviceId, is_clickbait });
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
    summarizeArticle,
    askQuestion,
    analyzeArticle,
    getVotes,
    submitVote,
  };
})();
