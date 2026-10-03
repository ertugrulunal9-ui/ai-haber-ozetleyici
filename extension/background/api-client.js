// Edge function API calls, auth session handling, summary job management.
// Depends on globals: CONFIG, parseJson, createApiError, ensureSupabaseSession, fetchRelatedSources

const PENDING_SUMMARY_STORAGE_KEY = "pendingSummary";
const SUMMARY_RESULT_TTL_MS = 5 * 60 * 1000;
const SUMMARY_RESULTS_MAX_SIZE = 50;

// In-memory job state (cleared on service worker restart)
const summaryJobs = new Map();
const summaryResults = new Map(); // LRU cache keyed by article key

function getRequestHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function fetchWithSession(bodyString, accessToken) {
  return fetch(CONFIG.EDGE_URL, {
    method: "POST",
    headers: getRequestHeaders(accessToken),
    body: bodyString,
  });
}

async function requestApi(payload) {
  const bodyString = JSON.stringify(payload);
  let session = await ensureSupabaseSession();
  let response = await fetchWithSession(bodyString, session.accessToken);

  if (response.status === 401) {
    session = await ensureSupabaseSession({ forceRefresh: true });
    response = await fetchWithSession(bodyString, session.accessToken);
  }

  const data = await parseJson(response);
  return { ok: response.ok, status: response.status, data };
}

async function startSummarizeArticle(payload = {}) {
  const article = normalizeArticlePayload(payload.article);
  if (!article?.text) {
    return { error: "not_article", remaining: null };
  }

  const key = getArticleKey(article);
  if (key && summaryJobs.has(key)) {
    return { status: "pending" };
  }

  const lang = payload.lang || "tr";
  const clientState = getClientState();
  if (!payload.skipCache && article.url) {
    const cached = await clientState.getCachedSummary(article.url, lang);
    if (isUsableHistoryItem(cached)) {
      await clientState.setLastResult(cached);
      return { status: "done", remaining: null, historyItem: cached, fromCache: true };
    }
  }

  const job = runSummarizeJob({
    article,
    lang,
    deviceId: payload.deviceId || "",
    key,
  });

  if (key) {
    summaryJobs.set(key, job);
    job
      .then((result) => {
        rememberSummaryResult(key, result);
        chrome.runtime.sendMessage({ action: "summaryReady", articleUrl: article.url, result })
          .catch(() => {});
      })
      .catch((error) => {
        const errResult = {
          error: error?.code || "generic",
          remaining: typeof error?.remaining === "number" ? error.remaining : null,
        };
        rememberSummaryResult(key, errResult);
        chrome.runtime.sendMessage({ action: "summaryReady", articleUrl: article.url, result: errResult })
          .catch(() => {});
      })
      .finally(() => summaryJobs.delete(key));
  }

  return { status: "pending" };
}

async function getSummaryStatus(payload = {}) {
  const article = normalizeArticlePayload(payload.article);
  const key = getArticleKey(article);

  if (article?.url) {
    const cached = await getClientState().getCachedSummary(article.url, payload.lang || "tr");
    if (isUsableHistoryItem(cached)) {
      return { status: "done", historyItem: cached, fromCache: true };
    }
  }

  const remembered = key ? getRememberedSummaryResult(key) : null;
  if (remembered?.historyItem) {
    return { status: "done", ...remembered };
  }

  if (remembered?.error) {
    return { status: "error", ...remembered };
  }

  if (key && summaryJobs.has(key)) {
    return { status: "pending" };
  }

  return { status: "idle" };
}

// ── Streaming-first summarize job ──────────────────────────────────────

async function runSummarizeJob({ article, lang, deviceId, key }) {
  if (key) await setPendingSummary(key, article);

  try {
    const bodyString = JSON.stringify({
      action: "summarize",
      text: article.text,
      title: article.title,
      url: article.url,
      lang,
      deviceId,
      stream: true,
    });

    let session = await ensureSupabaseSession();
    let response = await fetchWithSession(bodyString, session.accessToken);

    if (response.status === 401) {
      session = await ensureSupabaseSession({ forceRefresh: true });
      response = await fetchWithSession(bodyString, session.accessToken);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream")) {
      return await consumeSseStream(response, article, { deviceId, lang });
    }

    // JSON response: cache hit, rate limit error, or streaming not available
    const data = await parseJson(response);
    return await finalizeFromApiResult({ ok: response.ok, status: response.status, data }, article, { deviceId, lang });
  } finally {
    if (key) await clearPendingSummary(key);
  }
}

async function consumeSseStream(response, article, context = {}) {
  if (!response.body) return { error: "network", remaining: null };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.slice(6).trim());
          if (parsed.text) {
            // Forward each chunk to the popup for live streaming display
            chrome.runtime.sendMessage({ action: "summaryChunk", text: parsed.text }).catch(() => {});
          }
          if (parsed.done) {
            donePayload = parsed;
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!donePayload?.summary?.trim()) {
    return { error: "bad_response", remaining: null };
  }

  return await saveJobResult(
    article,
    donePayload.summary,
    donePayload.keywords || [],
    typeof donePayload.remaining === "number" ? donePayload.remaining : null,
    context,
  );
}

async function finalizeFromApiResult(apiResponse, article, context = {}) {
  const result = normalizeApiResult(apiResponse);
  if (result.error) return result;
  if (!result.summary?.trim()) return { error: "bad_response", remaining: result.remaining ?? null };

  return await saveJobResult(
    article,
    result.summary,
    result.keywords || [],
    result.remaining ?? null,
    context,
  );
}

async function saveJobResult(article, summary, keywords, remaining, context = {}) {
  const storedHistoryItem = toStoredHistoryItem({
    title: article.title,
    summary,
    keywords,
    sources: [],
    article,
  });

  const clientState = getClientState();
  await clientState.setLastResult(storedHistoryItem);
  await clientState.saveToHistory(storedHistoryItem);
  if (article.url) await clientState.setCachedSummary(article.url, context.lang || "tr", storedHistoryItem);
  await recordSummaryStats(article, keywords);
  hydrateRelatedSources(article, storedHistoryItem, context).catch(() => {});

  return { summary, keywords, historyItem: storedHistoryItem, remaining };
}

// ── Related sources ────────────────────────────────────────────────────

async function hydrateRelatedSources(article, storedHistoryItem, context = {}) {
  const [semanticSources, rssSources] = await Promise.all([
    fetchSemanticRelatedSources(article, context).catch(() => []),
    fetchRelatedSources(article.title).catch(() => []),
  ]);
  const sources = mergeRelatedSources(
    filterRelatedSources(semanticSources, article.url),
    filterRelatedSources(rssSources, article.url),
  );
  if (!sources.length) return;

  const updated = { ...storedHistoryItem, sources };
  const clientState = getClientState();
  await clientState.setLastResult(updated);
  if (article.url) {
    await clientState.setCachedSummary(article.url, context.lang || "tr", updated);
  }
}

async function fetchSemanticRelatedSources(article, context = {}) {
  if (!article?.title || !article?.url || !article?.text || !context.deviceId) {
    return [];
  }

  const result = await requestApi({
    action: "relatedsources",
    title: article.title,
    text: article.text,
    url: article.url,
    lang: context.lang || "tr",
    deviceId: context.deviceId,
  });

  if (result?.error || !Array.isArray(result.sources)) {
    return [];
  }

  return result.sources;
}

function mergeRelatedSources(primarySources, fallbackSources, maxItems = 6) {
  const merged = [];
  const seen = new Set();

  for (const source of [...primarySources, ...fallbackSources]) {
    const key = normalizeSourceKey(source?.link);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(source);
    if (merged.length >= maxItems) break;
  }

  return merged;
}

function filterRelatedSources(sources, articleUrl) {
  if (!Array.isArray(sources) || !articleUrl) {
    return Array.isArray(sources) ? sources : [];
  }

  return sources.filter((source) => !sameUrl(source?.link, articleUrl));
}

function sameUrl(left, right) {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    leftUrl.hash = "";
    rightUrl.hash = "";
    return leftUrl.toString() === rightUrl.toString();
  } catch {
    return left === right;
  }
}

function normalizeSourceKey(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(value || "").trim();
  }
}

// ── LRU in-memory result cache ─────────────────────────────────────────
// JavaScript Map preserves insertion order, which gives us O(1) LRU via
// delete+re-insert on access and delete-first on eviction.

function rememberSummaryResult(key, result) {
  if (summaryResults.size >= SUMMARY_RESULTS_MAX_SIZE) {
    const oldestKey = summaryResults.keys().next().value;
    summaryResults.delete(oldestKey);
  }
  summaryResults.delete(key); // re-insert at end (most-recently-used position)
  summaryResults.set(key, { result, expiresAt: Date.now() + SUMMARY_RESULT_TTL_MS });
}

function getRememberedSummaryResult(key) {
  const cached = summaryResults.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    summaryResults.delete(key);
    return null;
  }

  // Move to end (LRU touch)
  summaryResults.delete(key);
  summaryResults.set(key, cached);
  return cached.result;
}

// ── Misc helpers ───────────────────────────────────────────────────────

function normalizeApiResult(response) {
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

function getClientState() {
  if (!globalThis.AozClientState) {
    throw createApiError("generic");
  }

  return globalThis.AozClientState;
}

function normalizeArticlePayload(article) {
  if (!article || typeof article !== "object") return null;

  return {
    title: typeof article.title === "string" ? article.title : "",
    text: typeof article.text === "string" ? article.text : "",
    url: typeof article.url === "string" ? article.url : "",
  };
}

function toStoredHistoryItem(item) {
  return { ...item, article: toStoredArticle(item.article) };
}

function isUsableHistoryItem(item) {
  return Boolean(item && typeof item.summary === "string" && item.summary.trim());
}

function toStoredArticle(article) {
  if (!article) return null;
  return { title: article.title || "", url: article.url || "" };
}

async function recordSummaryStats(article, keywords = []) {
  const clientState = getClientState();
  await clientState.recordDailyAction("summary");
  await clientState.recordTopics(keywords);
  await clientState.updateStreak();

  try {
    const hostname = new URL(article.url).hostname.replace(/^www\./, "");
    await clientState.recordSourceRead(hostname);
    await clientState.incrementSourceReads(hostname);
  } catch {
    // Invalid or empty URL: summary still succeeds, source stats are skipped.
  }
}

async function setPendingSummary(key, article) {
  await chrome.storage.local.set({
    [PENDING_SUMMARY_STORAGE_KEY]: {
      key,
      article: toStoredArticle(article),
      startedAt: Date.now(),
    },
  });
}

async function clearPendingSummary(key) {
  const stored = await chrome.storage.local.get(PENDING_SUMMARY_STORAGE_KEY);
  if (!stored[PENDING_SUMMARY_STORAGE_KEY] || stored[PENDING_SUMMARY_STORAGE_KEY].key === key) {
    await chrome.storage.local.remove(PENDING_SUMMARY_STORAGE_KEY);
  }
}

function getArticleKey(article) {
  if (!article) return "";

  const normalizedUrl = normalizeUrlForKey(article.url);
  if (normalizedUrl) {
    return `url:${normalizedUrl}`;
  }

  const basis = `${article.title || ""}\n${(article.text || "").slice(0, 1000)}`;
  return basis.trim() ? `text:${hashString(basis)}` : "";
}

function normalizeUrlForKey(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(url);
  }
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return String(hash);
}
