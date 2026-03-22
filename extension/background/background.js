// Bridges popup/content scripts to the active tab and remote APIs.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/onboarding.html") });
  }
  // Set up recurring alarms for stats maintenance and daily digest
  chrome.alarms.create("pruneStats", { periodInMinutes: 1440 });
  chrome.alarms.create("dailyDigest", { periodInMinutes: 1440, delayInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pruneStats") {
    const { dailyStats = {} } = await chrome.storage.local.get("dailyStats");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    let changed = false;
    for (const key of Object.keys(dailyStats)) {
      if (key < cutoffKey) {
        delete dailyStats[key];
        changed = true;
      }
    }
    if (changed) await chrome.storage.local.set({ dailyStats });
  }

  if (alarm.name === "dailyDigest") {
    // Check if user was active yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    const { dailyStats = {} } = await chrome.storage.local.get("dailyStats");
    const yStats = dailyStats[yKey];
    if (yStats && yStats.articlesRead > 0) {
      chrome.action.setBadgeText({ text: "NEW" });
      chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
    }
  }
});

const CONFIG = Object.freeze({
  EDGE_URL: "https://rvcvocdrcymiagulguvo.supabase.co/functions/v1/summarize",
  RSS_BASE: "https://news.google.com/rss/search?hl=tr&gl=TR&ceid=TR:tr&q=",
  SUPABASE_PUBLISHABLE_KEY: "__SUPABASE_PUBLISHABLE_KEY__",
});

const AUTH_STORAGE_KEY = "supabaseAuthSession";
const AUTH_CONFIG_STORAGE_KEY = "supabasePublishableKey";
const PUBLISHABLE_KEY_PLACEHOLDER = "__SUPABASE" + "_PUBLISHABLE_KEY__";
const SESSION_REFRESH_BUFFER_SECONDS = 60;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "getArticle") {
    extractArticleFromActiveTab()
      .then((result) => sendResponse(result))
      .catch(() => sendResponse(null));
    return true;
  }

  if (msg.action === "fetchRSS") {
    fetchRelatedSources(msg.title)
      .then((data) => sendResponse({ ok: true, data }))
      .catch(() => sendResponse({ ok: true, data: [] }));
    return true;
  }

  if (msg.action === "requestApi") {
    requestApi(msg.payload)
      .then((response) => sendResponse(response))
      .catch((error) => {
        sendResponse({
          ok: false,
          status: error?.status || 0,
          data: { error: error?.code || "network" },
        });
      });
    return true;
  }

  if (msg.action === "setPublishableKey") {
    setStoredPublishableKey(msg.publishableKey)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

function getRequestHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function fetchRelatedSources(title) {
  const query = encodeURIComponent((title || "").slice(0, 60));
  if (!query) return [];

  const response = await fetch(`${CONFIG.RSS_BASE}${query}`);
  const text = await response.text();
  return parseRssItems(text).slice(0, 4);
}

function parseRssItems(xml) {
  const items = [];
  const regex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?(?:<source[^>]*>([\s\S]*?)<\/source>)?[\s\S]*?<\/item>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const link = match[2]?.trim() || "";

    try {
      const parsed = new URL(link);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        continue;
      }
    } catch {
      continue;
    }

    items.push({
      title: match[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "",
      link,
      source: match[3]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "",
    });
  }

  return items;
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
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return { error: response.ok ? "bad_response" : "generic" };
  }
}

async function extractArticleFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !isSupportedTabUrl(tab.url)) {
    return null;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["utils/extractor.js"],
  });

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => globalThis.AozExtractor?.extractArticle?.() ?? null,
  });

  return result?.result ?? null;
}

async function fetchWithSession(bodyString, accessToken) {
  return fetch(CONFIG.EDGE_URL, {
    method: "POST",
    headers: getRequestHeaders(accessToken),
    body: bodyString,
  });
}

async function ensureSupabaseSession(options = {}) {
  const { forceRefresh = false } = options;
  const currentSession = await getStoredAuthSession();

  if (currentSession && !forceRefresh && !isSessionExpiringSoon(currentSession)) {
    return currentSession;
  }

  if (currentSession?.refreshToken) {
    try {
      const refreshedSession = await refreshSupabaseSession(currentSession.refreshToken);
      await setStoredAuthSession(refreshedSession);
      return refreshedSession;
    } catch {
      await clearStoredAuthSession();
    }
  }

  const newSession = await signInAnonymously();
  await setStoredAuthSession(newSession);
  return newSession;
}

async function signInAnonymously() {
  const response = await fetch(getSupabaseAuthUrl("/signup"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ data: {} }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw createApiError("unauthorized", response.status, payload);
  }

  return normalizeAuthSession(payload);
}

async function refreshSupabaseSession(refreshToken) {
  const response = await fetch(getSupabaseAuthUrl("/token?grant_type=refresh_token"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw createApiError("unauthorized", response.status, payload);
  }

  return normalizeAuthSession(payload);
}

async function getStoredAuthSession() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  try {
    return normalizeStoredAuthSession(stored[AUTH_STORAGE_KEY] ?? null);
  } catch {
    await clearStoredAuthSession();
    return null;
  }
}

async function setStoredAuthSession(session) {
  await chrome.storage.local.set({
    [AUTH_STORAGE_KEY]: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    },
  });
}

async function clearStoredAuthSession() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

async function setStoredPublishableKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) {
    throw createApiError("auth_config");
  }

  await chrome.storage.local.set({ [AUTH_CONFIG_STORAGE_KEY]: key });
  await clearStoredAuthSession();
}

function normalizeStoredAuthSession(session) {
  if (!session || typeof session !== "object") {
    return null;
  }

  const accessToken = typeof session.accessToken === "string" ? session.accessToken.trim() : "";
  const refreshToken = typeof session.refreshToken === "string" ? session.refreshToken.trim() : "";
  const expiresAt = Number(session.expiresAt);

  if (!accessToken || !refreshToken || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw createApiError("unauthorized");
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

function normalizeAuthSession(payload) {
  const session = payload?.session && typeof payload.session === "object" ? payload.session : payload;
  const accessToken = typeof session?.access_token === "string" ? session.access_token.trim() : "";
  const refreshToken = typeof session?.refresh_token === "string" ? session.refresh_token.trim() : "";
  const rawExpiresAt = Number(session?.expires_at);
  const rawExpiresIn = Number(session?.expires_in);
  const expiresAt =
    Number.isFinite(rawExpiresAt) && rawExpiresAt > 0
      ? rawExpiresAt
      : Number.isFinite(rawExpiresIn) && rawExpiresIn > 0
        ? Math.floor(Date.now() / 1000) + rawExpiresIn
        : 0;

  if (!accessToken || !refreshToken || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw createApiError("unauthorized");
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

function isSessionExpiringSoon(session) {
  return session.expiresAt <= Math.floor(Date.now() / 1000) + SESSION_REFRESH_BUFFER_SECONDS;
}

async function getAuthHeaders() {
  const publishableKey = await getPublishableKey();
  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}

async function getPublishableKey() {
  const bundledKey = CONFIG.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (bundledKey && bundledKey !== PUBLISHABLE_KEY_PLACEHOLDER) {
    return bundledKey;
  }

  const stored = await chrome.storage.local.get(AUTH_CONFIG_STORAGE_KEY);
  const storedKey = typeof stored[AUTH_CONFIG_STORAGE_KEY] === "string"
    ? stored[AUTH_CONFIG_STORAGE_KEY].trim()
    : "";

  if (!storedKey) {
    throw createApiError("auth_config");
  }

  return storedKey;
}

function getSupabaseAuthUrl(path) {
  return `${new URL(CONFIG.EDGE_URL).origin}/auth/v1${path}`;
}

function createApiError(code, status = 0, details = null) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

function isSupportedTabUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
