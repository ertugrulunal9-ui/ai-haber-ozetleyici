(() => {
const appCore = globalThis.AozAppCore;
const { getTranslations, getErrorMessage, getLimitResetText } = globalThis.AozUi;
const surface = globalThis.AozSummarySurface;
const sidebarUi = globalThis.AozSidebarUi;
const { extractArticle } = globalThis.AozExtractor;

function createSidebarState(baseArticle, shell, deviceId, lang) {
  return {
    baseArticle,
    refs: shell.refs,
    deviceId,
    lang,
    t: getTranslations(lang, "sidebar"),
    currentItem: null,
    currentRemaining: undefined,
  };
}

function setRemaining(state, nextRemaining) {
  if (typeof nextRemaining === "number") {
    state.currentRemaining = nextRemaining;
  } else if (nextRemaining === null) {
    state.currentRemaining = null;
  }

  surface.setUsageText(state.refs.usageText, state.t, state.currentRemaining);
}

function renderClickbait(state, votes = {}) {
  surface.renderClickbaitVote(state.refs, state.t, votes, {
    yesActiveClass: "aoz-vote-active-yes",
    noActiveClass: "aoz-vote-active-no",
  });
}

function renderResult(state, item) {
  state.currentItem = {
    ...item,
    article: item.article || state.baseArticle,
    sources: item.sources || [],
  };

  state.refs.summaryText.textContent = state.currentItem.summary;
  surface.resetResultPanels(state.refs, state.t, { hiddenClass: "aoz-hidden" });
  surface.renderKeywords(state.refs, state.currentItem.keywords || [], { hiddenClass: "aoz-hidden" });
  surface.renderSources(state.refs, state.t, state.currentItem.sources, {
    hiddenClass: "aoz-hidden",
    linkClassName: "aoz-source-item",
  });
  renderClickbait(state);
  sidebarUi.showSidebarView(state.refs, "result");
  void loadVotes(state);
}

async function loadVotes(state) {
  if (!state.currentItem?.article?.url) {
    return;
  }

  const data = await appCore.getVotes({
    url: state.currentItem.article.url,
    deviceId: state.deviceId,
  });

  if (typeof data?.remaining === "number") {
    setRemaining(state, data.remaining);
  }

  if (!data?.error) {
    renderClickbait(state, data);
  }
}

async function refreshUsage(state) {
  const usage = await appCore.getUsage(state.deviceId);
  setRemaining(state, usage.remaining);
  return usage;
}

async function loadHistory(state) {
  const history = await appCore.getHistory();
  surface.renderHistoryList(
    state.refs,
    history,
    (item) => renderResult(state, item),
    {
      hiddenClass: "aoz-hidden",
      itemTag: "div",
      itemClassName: "aoz-history-item",
    },
  );
  return history;
}

function handleSidebarClose(state) {
  state.refs.sidebar.classList.add("aoz-hidden");
  state.refs.tab.classList.remove("aoz-hidden");
}

function handleSidebarOpen(state) {
  state.refs.sidebar.classList.remove("aoz-hidden");
  state.refs.tab.classList.add("aoz-hidden");
}

async function handleSidebarLangToggle(state) {
  state.lang = state.lang === "tr" ? "en" : "tr";
  await appCore.setLang(state.lang);
  state.t = getTranslations(state.lang, "sidebar");
  sidebarUi.applySidebarTranslations(state.refs, state.t, state.lang, state.currentRemaining);
  renderClickbait(state);
  await loadHistory(state);

  if (state.currentItem) {
    renderResult(state, state.currentItem);
  }
}

async function handleSidebarBackClick(state) {
  await appCore.clearLastResult();
  state.currentItem = null;
  const history = await loadHistory(state);
  sidebarUi.showSidebarView(state.refs, state.currentRemaining === 0 && history.length === 0 ? "limit" : "main");
}

async function handleSidebarSummarize(state) {
  if (state.currentRemaining === 0) {
    sidebarUi.showSidebarView(state.refs, "limit");
    return;
  }

  sidebarUi.showSidebarView(state.refs, "loading");
  state.refs.loadingText.textContent = state.t.summarizing;

  const result = await appCore.summarizeArticle({
    article: state.baseArticle,
    lang: state.lang,
    deviceId: state.deviceId,
  });

  setRemaining(state, result.remaining);

  if (result.error === "limit") {
    sidebarUi.showSidebarView(state.refs, "limit");
    return;
  }

  if (result.error || !result.historyItem) {
    sidebarUi.showSidebarView(state.refs, "main");
    state.refs.summarizeButton.textContent = getErrorMessage(result.error, state.t);
    setTimeout(() => {
      state.refs.summarizeButton.textContent = state.t.summarize;
    }, 3000);
    return;
  }

  renderResult(state, result.historyItem);
}

async function handleSidebarCopyClick(state) {
  if (!state.currentItem?.summary) {
    return;
  }

  await navigator.clipboard.writeText(state.currentItem.summary);
  state.refs.copyButton.textContent = state.t.copied_action;
  setTimeout(() => {
    state.refs.copyButton.textContent = state.t.copy_action;
  }, 2000);
}

function handleSidebarShareClick(state) {
  if (!state.currentItem?.summary) {
    return;
  }

  window.open(surface.getShareUrl(state.currentItem.summary), "_blank");
}

async function handleSidebarQaSubmit(state) {
  const question = state.refs.qaInput.value.trim();
  if (!question || !state.currentItem?.article) {
    return;
  }

  state.refs.qaButton.disabled = true;
  state.refs.qaButton.textContent = "...";

  const result = await appCore.askQuestion({
    article: state.currentItem.article,
    lang: state.lang,
    deviceId: state.deviceId,
    question,
  });

  setRemaining(state, result.remaining);
  state.refs.qaButton.disabled = false;
  state.refs.qaButton.textContent = "->";

  if (result.error) {
    state.refs.qaAnswer.textContent = getErrorMessage(result.error, state.t);
  } else {
    state.refs.qaAnswer.textContent = result.answer;
  }

  state.refs.qaAnswer.classList.remove("aoz-hidden");
}

function handleSidebarQaKeydown(state, event) {
  if (event.key === "Enter") {
    state.refs.qaButton.click();
  }
}

async function handleSidebarBiasClick(state) {
  if (!state.currentItem?.article) {
    return;
  }

  state.refs.biasButton.disabled = true;
  state.refs.biasButton.textContent = state.t.bias_loading;

  const result = await appCore.analyzeArticle({
    article: state.currentItem.article,
    lang: state.lang,
    deviceId: state.deviceId,
  });

  setRemaining(state, result.remaining);
  state.refs.biasButton.disabled = false;

  if (result.error || result.political === undefined) {
    state.refs.biasButton.textContent = getErrorMessage(result.error, state.t);
    setTimeout(() => {
      state.refs.biasButton.textContent = state.t.bias_btn;
    }, 3000);
    return;
  }

  state.refs.biasButton.classList.add("aoz-hidden");
  surface.renderBiasResult(state.refs, state.t, result, { hiddenClass: "aoz-hidden" });
}

async function handleSidebarVote(state, isClickbait) {
  if (!state.currentItem?.article?.url) {
    return;
  }

  const data = await appCore.submitVote({
    url: state.currentItem.article.url,
    deviceId: state.deviceId,
    is_clickbait: isClickbait,
  });

  if (typeof data?.remaining === "number") {
    setRemaining(state, data.remaining);
  }

  if (!data?.error) {
    renderClickbait(state, data);
  }
}

async function handleSidebarFeedback(state, rating) {
  if (!state.currentItem?.article?.url) return;
  state.refs.feedbackGoodButton.disabled = true;
  state.refs.feedbackBadButton.disabled = true;
  await appCore.submitFeedback({
    url: state.currentItem.article.url,
    deviceId: state.deviceId,
    rating,
  });
  state.refs.feedbackGoodButton.textContent = state.t.feedback_thanks;
  state.refs.feedbackBadButton.textContent = "";
}

function handleSidebarPremiumClick() {
  // Premium not yet available — button is hidden
}

function bindSidebarChromeControls(state) {
  state.refs.closeButton.addEventListener("click", () => handleSidebarClose(state));
  state.refs.tab.addEventListener("click", () => handleSidebarOpen(state));
  state.refs.langButton.addEventListener("click", () => handleSidebarLangToggle(state));
  state.refs.backButton.addEventListener("click", () => handleSidebarBackClick(state));
  state.refs.premiumButton.addEventListener("click", handleSidebarPremiumClick);
}

function bindSidebarSummaryActions(state) {
  state.refs.summarizeButton.addEventListener("click", () => handleSidebarSummarize(state));
  state.refs.copyButton.addEventListener("click", () => handleSidebarCopyClick(state));
  state.refs.twitterButton.addEventListener("click", () => handleSidebarShareClick(state));
  state.refs.qaButton.addEventListener("click", () => handleSidebarQaSubmit(state));
  state.refs.qaInput.addEventListener("keydown", (event) => handleSidebarQaKeydown(state, event));
  state.refs.biasButton.addEventListener("click", () => handleSidebarBiasClick(state));
  state.refs.feedbackGoodButton.addEventListener("click", () => handleSidebarFeedback(state, true));
  state.refs.feedbackBadButton.addEventListener("click", () => handleSidebarFeedback(state, false));
}

function bindSidebarVoteActions(state) {
  state.refs.voteYesButton.addEventListener("click", () => handleSidebarVote(state, true));
  state.refs.voteNoButton.addEventListener("click", () => handleSidebarVote(state, false));
}

async function bootstrapSidebar(state) {
  sidebarUi.applySidebarTranslations(state.refs, state.t, state.lang, state.currentRemaining);
  renderClickbait(state);

  const usage = await refreshUsage(state);
  const lastResult = await appCore.getLastResult();

  if (lastResult) {
    renderResult(state, lastResult);
    return;
  }

  const history = await loadHistory(state);
  sidebarUi.showSidebarView(state.refs, usage.remaining === 0 && history.length === 0 ? "limit" : "main");
}

async function initSidebar() {
  if (document.getElementById("aoz-sidebar")) {
    return;
  }

  const baseArticle = extractArticle();
  if (!baseArticle) {
    return;
  }

  const deviceId = await appCore.getDeviceId();
  const lang = await appCore.getLang();
  const shell = sidebarUi.createSidebarShell(getTranslations(lang, "sidebar"), lang);

  document.body.appendChild(shell.sidebar);
  document.body.appendChild(shell.tab);

  const state = createSidebarState(baseArticle, shell, deviceId, lang);

  bindSidebarChromeControls(state);
  bindSidebarSummaryActions(state);
  bindSidebarVoteActions(state);
  await bootstrapSidebar(state);
}

// Listen for extract requests from popup (via background)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "extract") {
    sendResponse(extractArticle());
  }
  return true;
});

// Auto-detect article and show sidebar
setTimeout(initSidebar, 1200);
})();
