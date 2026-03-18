(() => {
  function extractArticle() {
    const title = getTitle();
    const text = getBodyText();
    if (!text || text.length < 200) return null;
    return { title, text: text.slice(0, 4000), url: window.location.href };
  }

  function getTitle() {
    return (
      document.querySelector("h1")?.innerText ||
      document.querySelector('meta[property="og:title"]')?.content ||
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
      "main",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;

      const text = cleanText(element.innerText);
      if (text.length > 200) return text;
    }

    return [...document.querySelectorAll("p")]
      .map((paragraph) => paragraph.innerText.trim())
      .filter((text) => text.length > 50)
      .join(" ");
  }

  function cleanText(raw) {
    return raw.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  globalThis.AozExtractor = {
    extractArticle,
  };
})();
