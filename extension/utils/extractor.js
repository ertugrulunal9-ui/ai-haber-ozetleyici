(() => {
  function extractArticle() {
    const jsonLd = extractFromJsonLd();
    const title = jsonLd?.title || getTitle();
    const text = jsonLd?.text || getBodyText();
    if (!text || text.length < 200) return null;
    return { title, text: text.slice(0, 4000), url: window.location.href };
  }

  function extractFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const article = findArticleNode(data);
        if (article?.articleBody && article.articleBody.length > 200) {
          return {
            title: article.headline || "",
            text: cleanText(article.articleBody),
          };
        }
      } catch { /* ignore malformed JSON-LD */ }
    }
    return null;
  }

  function findArticleNode(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const found = findArticleNode(item);
        if (found) return found;
      }
      return null;
    }
    if (!data || typeof data !== "object") return null;
    const type = data["@type"];
    const articleTypes = ["NewsArticle", "Article", "BlogPosting", "ReportageNewsArticle", "OpinionNewsArticle"];
    if (articleTypes.includes(type) && data.articleBody) return data;
    if (data["@graph"]) return findArticleNode(data["@graph"]);
    return null;
  }

  function getTitle() {
    return (
      document.querySelector("h1")?.innerText ||
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="twitter:title"]')?.content ||
      document.title ||
      ""
    ).trim();
  }

  function getBodyText() {
    const selectors = [
      "article",
      '[class*="article-body"]',
      '[class*="article-content"]',
      '[class*="news-content"]',
      '[class*="post-content"]',
      '[class*="story-body"]',
      '[class*="entry-content"]',
      '[class*="post-body"]',
      '[itemprop="articleBody"]',
      '[data-article-body]',
      "main",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;

      const text = extractParagraphs(element);
      if (text.length > 200) return text;
    }

    return scoreParagraphs();
  }

  function extractParagraphs(root) {
    const paragraphs = root.querySelectorAll("p");
    if (paragraphs.length === 0) return cleanText(root.innerText);
    return [...paragraphs]
      .map((p) => p.innerText.trim())
      .filter((t) => t.length > 30)
      .join("\n\n");
  }

  function scoreParagraphs() {
    const paragraphs = [...document.querySelectorAll("p")];
    return paragraphs
      .map((p) => p.innerText.trim())
      .filter((t) => t.length > 50 && !/^(cookie|copyright|©|reklam|advertisement)/i.test(t))
      .join("\n\n");
  }

  function cleanText(raw) {
    return raw.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  globalThis.AozExtractor = {
    extractArticle,
  };
})();
