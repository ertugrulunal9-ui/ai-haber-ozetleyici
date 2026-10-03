// Fetches and parses Google News RSS results for a given query string.
// Returns [] on network error (treated the same as "no results found").

async function fetchRelatedSources(query) {
  const q = encodeURIComponent((query || "").slice(0, 60));
  if (!q) return [];

  let text;
  try {
    const response = await fetch(`${CONFIG.RSS_BASE}${q}`);
    if (!response.ok) return [];
    text = await response.text();
  } catch {
    return [];
  }

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
