(() => {
  const clientState = globalThis.AozClientState;
  const SUMMARY_POLL_TIMEOUT_MS = 120000;

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

  async function searchByKeyword(keyword) {
    const response = await sendMessage({ action: "searchByKeyword", keyword });
    return response?.ok ? response.data : [];
  }

  async function getSummaryStatus({ article }) {
    const response = await sendMessage({ action: "getSummaryStatus", payload: { article } });
    return response || { status: "idle" };
  }

  async function setPublishableKey(publishableKey) {
    const response = await sendMessage({ action: "setPublishableKey", publishableKey });
    return response?.ok ? { ok: true } : { ok: false };
  }

  async function authWithEmail(mode, email, password) {
    const action = mode === "signup" ? "signUp" : "signIn";
    const response = await sendMessage({ action, email, password });
    if (!response) return { ok: false };
    return response;
  }

  async function signInWithGoogle() {
    const response = await sendMessage({ action: "signInGoogle" });
    if (!response) return { ok: false };
    return response;
  }

  async function signOut() {
    const response = await sendMessage({ action: "signOut" });
    return response?.ok ?? false;
  }

  async function getUser() {
    const response = await sendMessage({ action: "getUser" });
    return response || { email: "" };
  }

  async function summarizeArticle({ article, lang, deviceId, skipCache }) {
    const response = await sendMessage({
      action: "summarizeArticle",
      payload: { article, lang, deviceId, skipCache },
    });

    if (!response) {
      return { error: "network", remaining: null };
    }

    if (response.status === "pending") {
      return waitForSummary(article);
    }

    if (response.status === "error") {
      return { error: response.error || "generic", remaining: response.remaining ?? null };
    }

    return response;
  }

  function waitForSummary(article) {
    return new Promise((resolve) => {
      let done = false;

      function finish(value) {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        clearInterval(pollId);
        chrome.runtime.onMessage.removeListener(onPush);
        resolve(value);
      }

      function onPush(msg) {
        if (msg.action !== "summaryReady") return;
        if (article?.url && msg.articleUrl && msg.articleUrl !== article.url) return;
        finish(msg.result);
      }
      chrome.runtime.onMessage.addListener(onPush);

      const pollId = setInterval(async () => {
        const status = await getSummaryStatus({ article });
        if (status.status === "done" && status.historyItem) {
          finish(status);
        } else if (status.status === "error") {
          finish({ error: status.error || "generic", remaining: status.remaining ?? null });
        }
      }, 3000);

      const timeoutId = setTimeout(
        () => finish({ error: "network", remaining: null }),
        SUMMARY_POLL_TIMEOUT_MS,
      );
    });
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
      await clientState.recordClickbaitVote(Boolean(is_clickbait));
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

  globalThis.AozAppCore = {
    searchByKeyword,
    getDeviceId: clientState.getDeviceId,
    getLang: clientState.getLang,
    setLang: clientState.setLang,
    getHistory: clientState.getHistory,
    saveArticle: clientState.saveArticle,
    getSavedArticles: clientState.getSavedArticles,
    isArticleSaved: clientState.isArticleSaved,
    getLastResult: clientState.getLastResult,
    setLastResult: clientState.setLastResult,
    clearLastResult: clientState.clearLastResult,
    getUsage,
    getArticle,
    fetchRelatedSources,
    getSummaryStatus,
    setPublishableKey,
    summarizeArticle,
    askQuestion,
    analyzeArticle,
    getVotes,
    submitVote,
    submitFeedback,
    authWithEmail,
    signInWithGoogle,
    signOut,
    getUser,
  };
})();
