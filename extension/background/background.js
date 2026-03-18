// Bridges popup/content scripts to the active tab and remote APIs.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/onboarding.html") });
  }
});

const CONFIG = Object.freeze({
  EDGE_URL: "https://rvcvocdrcymiagulguvo.supabase.co/functions/v1/summarize",
  RSS_BASE: "https://news.google.com/rss/search?hl=tr&gl=TR&ceid=TR:tr&q=",
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getArticle") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) {
        sendResponse(null);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "extract" }, (result) => {
        if (chrome.runtime.lastError) {
          sendResponse(null);
          return;
        }

        sendResponse(result || null);
      });
    });
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
      .catch(() => sendResponse({ ok: false, status: 0, data: { error: "network" } }));
    return true;
  }
});

function getRequestHeaders() {
  return {
    "Content-Type": "application/json",
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
    items.push({
      title: match[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "",
      link: match[2]?.trim() || "",
      source: match[3]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "",
    });
  }

  return items;
}

async function requestApi(payload) {
  const bodyString = JSON.stringify(payload);

  const response = await fetch(CONFIG.EDGE_URL, {
    method: "POST",
    headers: getRequestHeaders(),
    body: bodyString,
  });

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
