const appCore = globalThis.AozAppCore;
const { getTranslations, getErrorMessage, getLimitResetText } = globalThis.AozUi;
const surface = globalThis.AozSummarySurface;
const popupUi = globalThis.AozPopupUi;

const state = {
  refs: popupUi.collectPopupRefs(),
  deviceId: "",
  lang: "tr",
  t: getTranslations("tr", "popup"),
  currentItem: null,
  currentRemaining: undefined,
};

function setRemaining(nextRemaining) {
  if (typeof nextRemaining === "number") {
    state.currentRemaining = nextRemaining;
  } else if (nextRemaining === null) {
    state.currentRemaining = null;
  }

  surface.setUsageText(state.refs.usageText, state.t, state.currentRemaining);
}

function renderClickbait(votes = {}) {
  surface.renderClickbaitVote(state.refs, state.t, votes, {
    yesActiveClass: "vote-active-yes",
    noActiveClass: "vote-active-no",
  });
}

function renderResult(item) {
  state.currentItem = item;
  state.refs.summaryText.textContent = item.summary;
  surface.resetResultPanels(state.refs, state.t);
  surface.renderKeywords(state.refs, item.keywords || []);
  surface.renderSources(state.refs, state.t, item.sources || [], { wrapTag: "li" });
  renderClickbait();
  popupUi.showPopupView(state.refs, "result");
}

function renderHistory(items) {
  surface.renderHistoryList(
    state.refs,
    items,
    (item) => renderResult(item),
    { itemClassName: "history-item" },
  );
}

async function loadVotes() {
  if (!state.currentItem?.article?.url) {
    return;
  }

  const data = await appCore.getVotes({
    url: state.currentItem.article.url,
    deviceId: state.deviceId,
  });

  if (typeof data?.remaining === "number") {
    setRemaining(data.remaining);
  }

  if (!data?.error) {
    renderClickbait(data);
  }
}

async function refreshUsage() {
  const usage = await appCore.getUsage(state.deviceId);
  setRemaining(usage.remaining);
  return usage;
}

function applyTranslations() {
  popupUi.applyPopupTranslations(state.refs, state.t, state.lang, state.currentRemaining);
  renderClickbait();
}

async function init() {
  state.deviceId = state.deviceId || await appCore.getDeviceId();
  state.lang = await appCore.getLang();
  state.t = getTranslations(state.lang, "popup");
  applyTranslations();

  const usage = await refreshUsage();
  const lastResult = await appCore.getLastResult();

  if (lastResult) {
    renderResult(lastResult);
    await loadVotes();
    return;
  }

  const history = await appCore.getHistory();
  renderHistory(history);
  popupUi.showPopupView(state.refs, usage.remaining === 0 && history.length === 0 ? "limit" : "main");
}

async function handleSummarizeClick() {
  if (state.currentRemaining === 0) {
    popupUi.showPopupView(state.refs, "limit");
    return;
  }

  popupUi.showPopupView(state.refs, "loading");
  state.refs.loadingText.textContent = state.t.summarizing;

  const article = await appCore.getArticle();
  if (!article) {
    alert(state.t.not_article);
    popupUi.showPopupView(state.refs, "main");
    return;
  }

  const result = await appCore.summarizeArticle({
    article,
    lang: state.lang,
    deviceId: state.deviceId,
  });

  setRemaining(result.remaining);

  if (result.error === "limit") {
    popupUi.showPopupView(state.refs, "limit");
    return;
  }

  if (result.error || !result.historyItem) {
    popupUi.showPopupView(state.refs, "main");
    state.refs.summarizeButton.textContent = getErrorMessage(result.error, state.t);
    setTimeout(() => {
      state.refs.summarizeButton.textContent = state.t.summarize;
    }, 3000);
    return;
  }

  renderResult(result.historyItem);
  await loadVotes();
}

async function handleBiasClick() {
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

  setRemaining(result.remaining);
  state.refs.biasButton.disabled = false;

  if (result.error || result.political === undefined) {
    state.refs.biasButton.textContent = getErrorMessage(result.error, state.t);
    setTimeout(() => {
      state.refs.biasButton.textContent = state.t.bias_btn;
    }, 3000);
    return;
  }

  state.refs.biasButton.classList.add("hidden");
  surface.renderBiasResult(state.refs, state.t, result);
}

async function handleCopyClick() {
  if (!state.currentItem?.summary) {
    return;
  }

  await navigator.clipboard.writeText(state.currentItem.summary);
  state.refs.copyLabel.textContent = state.t.copied_action;
  setTimeout(() => {
    state.refs.copyLabel.textContent = state.t.copy_action;
  }, 2000);
}

function handleShareClick() {
  if (!state.currentItem?.summary) {
    return;
  }

  chrome.tabs.create({ url: surface.getShareUrl(state.currentItem.summary) });
}

async function handleQaSubmit() {
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

  setRemaining(result.remaining);
  state.refs.qaButton.disabled = false;
  state.refs.qaButton.textContent = "->";

  if (result.error) {
    state.refs.qaAnswer.textContent = getErrorMessage(result.error, state.t);
  } else {
    state.refs.qaAnswer.textContent = result.answer;
  }

  state.refs.qaAnswer.classList.remove("hidden");
}

function handleQaKeydown(event) {
  if (event.key === "Enter") {
    state.refs.qaButton.click();
  }
}

async function handleVote(isClickbait) {
  if (!state.currentItem?.article?.url) {
    return;
  }

  const data = await appCore.submitVote({
    url: state.currentItem.article.url,
    deviceId: state.deviceId,
    is_clickbait: isClickbait,
  });

  if (typeof data?.remaining === "number") {
    setRemaining(data.remaining);
  }

  if (!data?.error) {
    renderClickbait(data);
  }
}

async function handleBackClick() {
  await appCore.clearLastResult();
  state.currentItem = null;
  const history = await appCore.getHistory();
  renderHistory(history);
  popupUi.showPopupView(state.refs, state.currentRemaining === 0 && history.length === 0 ? "limit" : "main");
}

async function handleLangToggle() {
  state.lang = state.lang === "tr" ? "en" : "tr";
  await appCore.setLang(state.lang);
  await init();
}

async function handleFeedback(rating) {
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

function handlePremiumClick() {
  // Premium not yet available — button is hidden
}

function bindPopupEvents() {
  state.refs.summarizeButton.addEventListener("click", handleSummarizeClick);
  state.refs.biasButton.addEventListener("click", handleBiasClick);
  state.refs.copyButton.addEventListener("click", handleCopyClick);
  state.refs.twitterButton.addEventListener("click", handleShareClick);
  state.refs.qaButton.addEventListener("click", handleQaSubmit);
  state.refs.qaInput.addEventListener("keydown", handleQaKeydown);
  state.refs.voteYesButton.addEventListener("click", () => handleVote(true));
  state.refs.voteNoButton.addEventListener("click", () => handleVote(false));
  state.refs.backButton.addEventListener("click", handleBackClick);
  state.refs.langButton.addEventListener("click", handleLangToggle);
  state.refs.premiumButton.addEventListener("click", handlePremiumClick);
  state.refs.feedbackGoodButton.addEventListener("click", () => handleFeedback(true));
  state.refs.feedbackBadButton.addEventListener("click", () => handleFeedback(false));
}

bindPopupEvents();
init();
