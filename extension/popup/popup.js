const appCore = globalThis.AozAppCore;
const { getTranslations } = globalThis.AozUi;
const surface = globalThis.AozSummarySurface;
const popupUi = globalThis.AozPopupUi;

const state = {
  refs: popupUi.collectPopupRefs(),
  deviceId: "",
  lang: "tr",
  t: getTranslations("tr"),
  currentItem: null,
  currentRemaining: undefined,
  authPromptShown: false,
  authMode: "signin",
  authLoading: false,
};

// ── Shared utilities ──────────────────────────────────────────────────

function applyTranslations() {
  popupUi.applyPopupTranslations(state.refs, state.t, state.lang, state.currentRemaining);
  surface.renderClickbaitVote(state.refs, state.t, {}, {
    yesActiveClass: "vote-active-yes",
    noActiveClass: "vote-active-no",
  });
}

function isSameUrl(a, b) {
  if (!a || !b) return false;
  try {
    return new URL(a).toString() === new URL(b).toString();
  } catch {
    return a === b;
  }
}

async function getCurrentTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url || null;
  } catch {
    return null;
  }
}

async function isStillOnArticle(article) {
  if (!article?.url) return true;
  const tabUrl = await getCurrentTabUrl();
  return !tabUrl || isSameUrl(article.url, tabUrl);
}

// ── Module instances ──────────────────────────────────────────────────

let history, result, stats, auth;

// ── Navigation ────────────────────────────────────────────────────────

async function handleBackClick() {
  await appCore.clearLastResult();
  state.currentItem = null;
  const items = await appCore.getHistory();
  history.renderHistory(items);
  await history.renderSavedArticles();
  popupUi.showPopupView(state.refs, "main");
  stats.renderStreakWidget();
  stats.renderDailyReport();
  stats.renderWeeklyReport();
}

async function handleLangToggle() {
  state.lang = state.lang === "tr" ? "en" : "tr";
  await appCore.setLang(state.lang);
  await init();
}

// ── Usage & Auth utilities ────────────────────────────────────────────

function setRemaining(remaining) {
  state.currentRemaining = remaining;
  surface.setUsageText(state.refs.usageText, state.t, remaining);
}

async function refreshUsage() {
  const data = await appCore.getUsage(state.deviceId);
  if (typeof data?.remaining === "number") {
    setRemaining(data.remaining);
  }
}

async function refreshUserInfo() {
  const user = await appCore.getUser();
  if (user?.email) {
    state.refs.userEmail.textContent = user.email;
    state.refs.userEmail.classList.remove("hidden");
    state.refs.signOutButton.classList.remove("hidden");
  } else {
    state.refs.userEmail.classList.add("hidden");
    state.refs.signOutButton.classList.add("hidden");
  }
}

async function maybeConfigurePublishableKey() {
  // Key is bundled at build time; no dynamic config needed
}

// ── Init ──────────────────────────────────────────────────────────────

async function init() {
  state.deviceId = state.deviceId || await appCore.getDeviceId();
  state.lang = await appCore.getLang();
  state.t = getTranslations(state.lang);
  applyTranslations();

  await maybeConfigurePublishableKey();

  const usage = await appCore.getUsage(state.deviceId);
  if (usage?.error === "needs_auth") {
    if (!state.authPromptShown) {
      state.authPromptShown = true;
      auth.renderAuthView();
    }
    return;
  }
  state.authPromptShown = false;
  if (typeof usage?.remaining === "number") {
    setRemaining(usage.remaining);
  }
  void refreshUserInfo();

  stats.renderStreakWidget();
  stats.renderDailyReport();
  stats.renderWeeklyReport();

  const lastResult = await appCore.getLastResult();
  const tabUrl = await getCurrentTabUrl();

  if (lastResult) {
    if (isSameUrl(lastResult.article?.url, tabUrl)) {
      result.renderResult(lastResult);
      await result.loadVotes();
      return;
    }
    await appCore.clearLastResult();
  }

  const article = await appCore.getArticle();
  if (article && (!article.url || !tabUrl || isSameUrl(article.url, tabUrl))) {
    const summaryStatus = await appCore.getSummaryStatus({ article, lang: state.lang });
    if (summaryStatus.status === "pending") {
      void result.resumePendingSummary(article);
      return;
    }

    if (
      summaryStatus.status === "done" &&
      summaryStatus.historyItem &&
      isSameUrl(summaryStatus.historyItem.article?.url, tabUrl)
    ) {
      result.renderResult(summaryStatus.historyItem);
      await result.loadVotes();
      return;
    }
  }

  const historyItems = await appCore.getHistory();
  history.renderHistory(historyItems);
  await history.renderSavedArticles();

  popupUi.showPopupView(state.refs, "main");
}

// ── Assemble modules ──────────────────────────────────────────────────

stats = globalThis.AozPopupStats.createStatsModule(state);

auth = globalThis.AozPopupAuth.createAuthModule(state, {
  onSuccess: () => init(),
});

result = globalThis.AozPopupResult.createResultModule(state, {
  setRemaining,
  isStillOnArticle,
});

history = globalThis.AozPopupHistory.createHistoryModule(state, {
  onSelectItem: (item) => result.renderResult(item),
});

// ── Event binding ─────────────────────────────────────────────────────

function bindPopupEvents() {
  state.refs.summarizeButton.addEventListener("click", result.handleSummarizeClick);
  state.refs.biasButton.addEventListener("click", result.handleBiasClick);
  state.refs.copyButton.addEventListener("click", result.handleCopyClick);
  state.refs.saveButton.addEventListener("click", result.handleSaveClick);
  state.refs.twitterButton.addEventListener("click", result.handleShareClick);
  state.refs.qaButton.addEventListener("click", result.handleQaSubmit);
  state.refs.qaInput.addEventListener("keydown", result.handleQaKeydown);
  state.refs.voteYesButton.addEventListener("click", () => result.handleVote(true));
  state.refs.voteNoButton.addEventListener("click", () => result.handleVote(false));
  state.refs.backButton.addEventListener("click", handleBackClick);
  state.refs.langButton.addEventListener("click", handleLangToggle);
  state.refs.feedbackGoodButton.addEventListener("click", () => result.handleFeedback(true));
  state.refs.feedbackBadButton.addEventListener("click", () => result.handleFeedback(false));
  state.refs.statsButton.addEventListener("click", stats.handleStatsClick);
  state.refs.statsBackButton.addEventListener("click", stats.handleStatsBack);
  state.refs.dailyReportDetailsBtn.addEventListener("click", stats.handleStatsClick);
  state.refs.weeklyReportDetailsBtn.addEventListener("click", stats.handleStatsClick);
  state.refs.mediaDietShareButton.addEventListener("click", stats.handleMediaDietShareClick);
  state.refs.streakWidget.addEventListener("click", stats.handleStatsClick);
  state.refs.authSubmitBtn.addEventListener("click", auth.handleAuthSubmit);
  state.refs.authToggleBtn.addEventListener("click", auth.handleAuthToggle);
  state.refs.googleSignInBtn.addEventListener("click", auth.handleGoogleSignIn);
  state.refs.signOutButton.addEventListener("click", auth.handleSignOut);
  state.refs.limitBackButton.addEventListener("click", handleBackClick);
}

bindPopupEvents();
init();
