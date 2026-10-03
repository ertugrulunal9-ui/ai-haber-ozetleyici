(() => {
  const ui = globalThis.AozUi;

  if (!ui) {
    throw new Error("AozUi is not loaded.");
  }

  const { getBiasDisplay, getClickbaitDisplay } = ui;

  function setUsageText(node, t, remaining) {
    node.textContent =
      typeof remaining === "number"
        ? t.usage_remaining(remaining)
        : remaining === undefined
          ? t.usage_loading
          : t.usage_unavailable;
  }

  function getHistoryPreview(item) {
    const title = item?.title || "";
    if (title) {
      return title;
    }

    const summary = item?.summary || "";
    return summary ? `${summary.slice(0, 60)}...` : "";
  }

  function renderHistoryList(refs, items, onSelect, options = {}) {
    const {
      hiddenClass = "hidden",
      itemTag = "li",
      itemClassName = "",
    } = options;

    refs.historyList.innerHTML = "";

    if (!items.length) {
      refs.historySection.classList.add(hiddenClass);
      return;
    }

    items.forEach((item) => {
      const element = document.createElement(itemTag);
      if (itemClassName) {
        element.className = itemClassName;
      }

      element.title = item.title || item.summary;
      element.textContent = getHistoryPreview(item);
      element.addEventListener("click", () => onSelect(item));
      refs.historyList.appendChild(element);
    });

    refs.historySection.classList.remove(hiddenClass);
  }

  function renderItemList({ section, list, items, onSelect, hiddenClass = "hidden", itemTag = "li", itemClassName = "" }) {
    if (!section || !list) return;
    list.innerHTML = "";

    if (!items.length) {
      section.classList.add(hiddenClass);
      return;
    }

    items.forEach((item) => {
      const element = document.createElement(itemTag);
      if (itemClassName) {
        element.className = itemClassName;
      }
      element.title = item.title || item.summary;
      element.textContent = getHistoryPreview(item);
      element.addEventListener("click", () => onSelect(item));
      list.appendChild(element);
    });

    section.classList.remove(hiddenClass);
  }

  function renderSources(refs, t, sources = [], options = {}) {
    const {
      hiddenClass = "hidden",
      linkClassName = "",
      emptyClassName = "source-empty",
      wrapTag = null,
      articleTitle = "",
      articleUrl = "",
    } = options;
    const sectionNode = refs.sourcesSection || refs.sourcesLabel;

    refs.sourcesList.innerHTML = "";
    refs.sourcesLabel.textContent = t.sources_title;
    if (refs.sourcesHelper) {
      refs.sourcesHelper.textContent = t.sources_helper || "";
    }
    if (refs.sourcesCompareSummary) {
      refs.sourcesCompareSummary.textContent = "";
      refs.sourcesCompareSummary.classList.add(hiddenClass);
    }

    if (!sources.length) {
      const empty = document.createElement("p");
      empty.className = emptyClassName;
      empty.textContent = t.sources_empty || "";
      if (wrapTag) {
        const wrapper = document.createElement(wrapTag);
        wrapper.appendChild(empty);
        refs.sourcesList.appendChild(wrapper);
      } else {
        refs.sourcesList.appendChild(empty);
      }
      sectionNode.classList.remove(hiddenClass);
      return;
    }

    const sourceComparisons = [];

    sources.forEach(({ title, link, source, semanticKind, semanticScore }) => {
      const safeLink = toSafeExternalUrl(link);
      if (!safeLink) {
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = safeLink;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.setAttribute("aria-label", `${t.source_compare_label || t.sources_title}: ${title || source || safeLink}`);

      const titleNode = document.createElement("span");
      titleNode.className = "source-title";
      titleNode.textContent = title || safeLink;

      const metaNode = document.createElement("span");
      metaNode.className = "source-meta";
      metaNode.textContent = getSourceMeta({ source, link: safeLink }, t);

      const signal = classifySourceMatch({
        articleTitle,
        articleUrl,
        sourceTitle: title,
        sourceUrl: safeLink,
        semanticKind,
        semanticScore,
      }, t);
      const frame = detectSourceFrame({ articleTitle, sourceTitle: title });
      sourceComparisons.push({
        sourceUrl: safeLink,
        matchKind: signal.kind,
        frame,
        semanticScore,
      });
      const signalNode = document.createElement("span");
      signalNode.className = `source-signal source-signal-${signal.kind}`;
      signalNode.textContent = signal.label;

      const frameNode = document.createElement("span");
      frameNode.className = "source-frame-note";
      frameNode.textContent = getSourceFrameNote({
        matchKind: signal.kind,
        articleTitle,
        sourceTitle: title,
        frame,
      }, t);

      anchor.append(titleNode, metaNode, signalNode, frameNode);

      if (linkClassName) {
        anchor.className = linkClassName;
      }

      if (!wrapTag) {
        refs.sourcesList.appendChild(anchor);
        return;
      }

      const wrapper = document.createElement(wrapTag);
      wrapper.appendChild(anchor);
      refs.sourcesList.appendChild(wrapper);
    });

    if (refs.sourcesList.childElementCount === 0) {
      sectionNode.classList.add(hiddenClass);
      return;
    }

    renderSourceComparisonSummary(refs, t, {
      articleUrl,
      comparisons: sourceComparisons,
      hiddenClass,
    });
    sectionNode.classList.remove(hiddenClass);
  }

  function renderSourceComparisonSummary(refs, t, { articleUrl, comparisons, hiddenClass }) {
    if (!refs.sourcesCompareSummary) {
      return;
    }

    const summary = computeSourceComparisonSummary({
      articleUrl,
      comparisons,
      t,
    });

    if (!summary.text) {
      refs.sourcesCompareSummary.classList.add(hiddenClass);
      refs.sourcesCompareSummary.textContent = "";
      return;
    }

    refs.sourcesCompareSummary.textContent = summary.text;
    refs.sourcesCompareSummary.classList.remove(hiddenClass);
  }

  function resetResultPanels(refs, t, options = {}) {
    const { hiddenClass = "hidden" } = options;

    refs.biasSection.classList.add(hiddenClass);
    refs.biasNote.classList.add(hiddenClass);
    refs.biasButton.classList.remove(hiddenClass);
    refs.biasButton.textContent = t.bias_btn;
    refs.biasButton.disabled = false;
    if (refs.summaryHelper) {
      refs.summaryHelper.textContent = t.summary_helper || "";
    }
    if (refs.biasHelper) {
      refs.biasHelper.textContent = t.bias_helper || "";
    }
    refs.qaAnswer.classList.add(hiddenClass);
    refs.qaAnswer.textContent = "";
    refs.qaInput.value = "";
  }

  function renderBiasResult(refs, t, result, options = {}) {
    const { hiddenClass = "hidden" } = options;
    const display = getBiasDisplay(result, t);

    refs.politicalDot.style.left = display.politicalLeft;
    refs.emotionalDot.style.left = display.emotionalLeft;
    refs.biasPoliticalValue.textContent = display.politicalLabel;
    refs.biasEmotionalValue.textContent = display.emotionalLabel;
    const note = result.note || "";
    refs.biasNote.textContent = t.bias_disclaimer
      ? [note, t.bias_disclaimer].filter(Boolean).join(" ")
      : note;
    refs.biasNote.classList.remove(hiddenClass);
    refs.biasSection.classList.remove(hiddenClass);
  }

  function renderClickbaitVote(refs, t, votes = {}, options = {}) {
    const {
      yesActiveClass,
      noActiveClass,
    } = options;
    const display = getClickbaitDisplay(votes, t);

    refs.clickbaitLabel.textContent = t.clickbait_title;
    if (refs.clickbaitHelper) {
      refs.clickbaitHelper.textContent = t.clickbait_helper || "";
    }
    refs.voteYesButton.textContent = display.yesText;
    refs.voteNoButton.textContent = display.noText;
    refs.voteStats.textContent = display.statsText;

    if (yesActiveClass) {
      refs.voteYesButton.classList.toggle(yesActiveClass, display.yesActive);
    }

    if (noActiveClass) {
      refs.voteNoButton.classList.toggle(noActiveClass, display.noActive);
    }
  }

  function renderKeywords(refs, keywords = [], options = {}) {
    const { hiddenClass = "hidden", onKeywordClick } = options;
    if (!refs.keywordsContainer) return;
    refs.keywordsContainer.innerHTML = "";
    if (!keywords.length) {
      refs.keywordsContainer.classList.add(hiddenClass);
      return;
    }
    refs.keywordsContainer.classList.remove(hiddenClass);
    keywords.forEach((kw) => {
      const tag = document.createElement("span");
      tag.className = refs.keywordsContainer.dataset.tagClass || "keyword-tag";
      tag.textContent = kw;
      if (onKeywordClick) {
        tag.style.cursor = "pointer";
        tag.setAttribute("role", "button");
        tag.setAttribute("title", kw);
        tag.addEventListener("click", () => onKeywordClick(kw));
      }
      refs.keywordsContainer.appendChild(tag);
    });
  }

  function getShareUrl(summary) {
    const text = encodeURIComponent(`${summary.slice(0, 240)} (AI Ozet)`);
    return `https://twitter.com/intent/tweet?text=${text}`;
  }

  function toSafeExternalUrl(value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "";
      }
      return parsed.toString();
    } catch {
      return "";
    }
  }

  function getSourceMeta({ source, link }, t) {
    const host = getHostLabel(link);
    const sourceLabel = source || host;
    if (sourceLabel && host && sourceLabel.toLowerCase() !== host.toLowerCase()) {
      return `${t.source_compare_label || t.sources_title} · ${sourceLabel} · ${host}`;
    }
    return `${t.source_compare_label || t.sources_title}${sourceLabel ? ` · ${sourceLabel}` : ""}`;
  }

  function classifySourceMatch({ articleTitle, articleUrl, sourceTitle, sourceUrl, semanticKind, semanticScore }, t) {
    if (semanticKind === "same_event" || Number(semanticScore) >= 0.86) {
      return { kind: "semantic", label: t.source_signal_semantic || "Same event" };
    }

    if (semanticKind === "near_event" || Number(semanticScore) >= 0.78) {
      return { kind: "semantic", label: t.source_signal_semantic_near || "Semantic match" };
    }

    if (isSameHost(articleUrl, sourceUrl)) {
      return { kind: "same", label: t.source_signal_same || "Same source" };
    }

    const similarity = getTitleSimilarity(articleTitle, sourceTitle);
    if (similarity >= 0.35) {
      return { kind: "close", label: t.source_signal_close || "Close match" };
    }

    return { kind: "check", label: t.source_signal_check || "Check framing" };
  }

  function getSourceFrameNote({ matchKind, articleTitle, sourceTitle, frame }, t) {
    if (matchKind === "same") {
      return t.source_frame_same || "Same source, so do not count it as an independent perspective.";
    }

    const detectedFrame = frame || detectSourceFrame({ articleTitle, sourceTitle });
    if (detectedFrame) {
      const key = `source_frame_${detectedFrame}`;
      return t[key] || t.source_frame_general || "Check the framing difference.";
    }

    if (matchKind === "close") {
      return t.source_frame_close || "The headline overlaps with the main event; check details or tone differences.";
    }

    return t.source_frame_general || "Check the framing difference.";
  }

  function computeSourceComparisonSummary({ articleUrl, comparisons = [], t }) {
    const validComparisons = comparisons.filter((item) => item?.sourceUrl);
    if (!validComparisons.length) {
      return { independentCount: 0, closeCount: 0, frames: [], text: "" };
    }

    const articleHost = getHostLabel(articleUrl);
    const independentHosts = new Set(
      validComparisons
        .map((item) => getHostLabel(item.sourceUrl))
        .filter((host) => host && host !== articleHost),
    );
    const closeCount = validComparisons.filter((item) => item.matchKind === "close").length;
    const semanticCount = validComparisons.filter((item) => item.matchKind === "semantic").length;
    const frames = [...new Set(validComparisons.map((item) => item.frame).filter(Boolean))]
      .map((frame) => getFrameLabel(frame, t))
      .filter(Boolean)
      .slice(0, 3);
    const data = {
      independentCount: independentHosts.size,
      closeCount,
      semanticCount,
      frames,
    };

    return {
      ...data,
      text: typeof t.source_compare_summary === "function" ? t.source_compare_summary(data) : "",
    };
  }

  function detectSourceFrame({ articleTitle, sourceTitle }) {
    const sourceTokens = tokenizeTitle(sourceTitle);
    const articleTokens = new Set(tokenizeTitle(articleTitle));
    const sourceOnlyTokens = sourceTokens.filter((token) => !articleTokens.has(token));
    const sourceTokenText = sourceTokens.join(" ");
    const sourceOnlyText = sourceOnlyTokens.join(" ");
    return detectTitleFrame(sourceOnlyText || sourceTokenText);
  }

  function getFrameLabel(frame, t) {
    return t[`source_frame_label_${frame}`] || frame;
  }

  function detectTitleFrame(text) {
    const normalized = String(text || "").toLocaleLowerCase("tr");
    for (const [frame, patterns] of Object.entries(FRAME_PATTERNS)) {
      if (patterns.some((pattern) => normalized.includes(pattern))) {
        return frame;
      }
    }
    return "";
  }

  function getTitleSimilarity(left, right) {
    const leftTokens = tokenizeTitle(left);
    const rightTokens = tokenizeTitle(right);
    if (!leftTokens.length || !rightTokens.length) {
      return 0;
    }

    const rightSet = new Set(rightTokens);
    const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
    return overlap / Math.max(leftTokens.length, rightTokens.length);
  }

  function tokenizeTitle(value) {
    return String(value || "")
      .toLocaleLowerCase("tr")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !SOURCE_STOP_WORDS.has(token));
  }

  function isSameHost(left, right) {
    const leftHost = getHostLabel(left);
    const rightHost = getHostLabel(right);
    return Boolean(leftHost && rightHost && leftHost === rightHost);
  }

  function getHostLabel(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  const SOURCE_STOP_WORDS = new Set([
    "bir", "ile", "icin", "için", "son", "sonra", "daha", "olan", "olarak", "gibi", "ama", "fakat", "veya",
    "the", "and", "for", "with", "from", "that", "this", "after", "before", "over", "into",
  ]);

  const FRAME_PATTERNS = {
    sensational: [
      "son dakika", "skandal", "sok", "şok", "bomba", "kriz", "panik", "alarm", "korku", "dehset", "dehşet",
      "breaking", "shocking", "bombshell", "panic", "alarm", "crisis",
    ],
    economic: [
      "ekonomi", "piyasa", "piyasalar", "borsa", "dolar", "euro", "enflasyon", "faiz", "zam", "maas", "maaş",
      "butce", "bütçe", "yatirim", "yatırım", "market", "markets", "inflation", "rate", "economy", "stock",
    ],
    political: [
      "hukumet", "hükümet", "bakan", "meclis", "parti", "secim", "seçim", "muhalefet", "cumhurbaskani",
      "cumhurbaşkanı", "president", "minister", "government", "election", "parliament", "opposition",
    ],
    legal: [
      "mahkeme", "dava", "savci", "savcı", "sorusturma", "soruşturma", "iddianame", "tutuklama", "gozalti",
      "gözaltı", "court", "lawsuit", "investigation", "prosecutor", "arrest", "trial",
    ],
    security: [
      "guvenlik", "güvenlik", "saldiri", "saldırı", "polis", "asker", "ordu", "sinir", "sınır", "tehdit",
      "security", "attack", "police", "military", "border", "threat",
    ],
  };

  globalThis.AozSummarySurface = {
    setUsageText,
    renderHistoryList,
    renderItemList,
    renderSources,
    resetResultPanels,
    renderBiasResult,
    renderClickbaitVote,
    renderKeywords,
    getShareUrl,
    toSafeExternalUrl,
    getSourceMeta,
    classifySourceMatch,
    getSourceFrameNote,
    computeSourceComparisonSummary,
    detectSourceFrame,
    detectTitleFrame,
    getTitleSimilarity,
  };
})();
