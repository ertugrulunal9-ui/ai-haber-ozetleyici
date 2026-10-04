// Bridges popup/content scripts to the active tab and remote APIs.

try { importScripts("../utils/client-state.js"); } catch { /* unit test environment */ }
try { importScripts("rss-fetcher.js"); } catch { /* unit test environment */ }
try { importScripts("auth-manager.js"); } catch { /* unit test environment */ }
try { importScripts("api-client.js"); } catch { /* unit test environment */ }

// ── Deployment config ─────────────────────────────────────────────────

const CONFIG = Object.freeze({
  EDGE_URL: "https://rvcvocdrcymiagulguvo.supabase.co/functions/v1/summarize",
  RSS_BASE: "https://news.google.com/rss/search?hl=tr&gl=TR&ceid=TR:tr&q=",
  SUPABASE_PUBLISHABLE_KEY: "__SUPABASE_PUBLISHABLE_KEY__",
});

// ── Shared utilities (used by auth-manager and api-client) ────────────

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return { error: response.ok ? "bad_response" : "generic" };
  }
}

function createApiError(code, status = 0, details = null) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

// Logs why a sign-in failed (see describeAuthError in auth-manager.js) and
// replies with the error code so the popup can show a matching message.
function replyAuthFailure(sendResponse, flow) {
  return (err) => {
    console.warn(`${flow}_failed`, describeAuthError(err));
    sendResponse({ ok: false, error: err?.code || "unauthorized" });
  };
}

// ── Chrome alarms ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/onboarding.html") });
  }
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

// ── Message dispatcher ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "signIn") {
    signInWithEmail(msg.email, msg.password)
      .then(async (session) => {
        await setStoredAuthSession(session);
        sendResponse({ ok: true });
      })
      .catch(replyAuthFailure(sendResponse, "email_sign_in"));
    return true;
  }

  if (msg.action === "signUp") {
    signUpWithEmail(msg.email, msg.password)
      .then(async (result) => {
        if (result.needsEmailConfirmation) {
          sendResponse({ ok: true, needsEmailConfirmation: true });
          return;
        }
        await setStoredAuthSession(result);
        sendResponse({ ok: true });
      })
      .catch(replyAuthFailure(sendResponse, "email_sign_up"));
    return true;
  }

  if (msg.action === "signInGoogle") {
    signInWithGoogle()
      .then(async (session) => {
        await setStoredAuthSession(session);
        sendResponse({ ok: true });
      })
      .catch(replyAuthFailure(sendResponse, "google_sign_in"));
    return true;
  }

  if (msg.action === "signOut") {
    signOut()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.action === "getUser") {
    getStoredAuthSession()
      .then((session) => sendResponse({ email: session?.email || "" }))
      .catch(() => sendResponse({ email: "" }));
    return true;
  }

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

  if (msg.action === "searchByKeyword") {
    fetchRelatedSources(msg.keyword)
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

  if (msg.action === "summarizeArticle") {
    startSummarizeArticle(msg.payload)
      .then((response) => sendResponse(response))
      .catch((error) => {
        sendResponse({
          error: error?.code || "generic",
          remaining: typeof error?.remaining === "number" ? error.remaining : null,
        });
      });
    return true;
  }

  if (msg.action === "getSummaryStatus") {
    getSummaryStatus(msg.payload)
      .then((response) => sendResponse(response))
      .catch(() => sendResponse({ status: "idle" }));
    return true;
  }

});

// ── Tab utilities ─────────────────────────────────────────────────────

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

function isSupportedTabUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
