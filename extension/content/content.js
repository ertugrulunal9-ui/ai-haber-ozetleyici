(() => {
const appCore = globalThis.AozAppCore;
const { getTranslations, getErrorMessage, getLimitResetText, createEl } = globalThis.AozUi;
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
  renderSidebarStreak(state);
  renderSidebarDailyReport(state);
  renderSidebarSourceBadge(state);
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

// ── Phase 1: Sidebar Stats, Streak, Daily Report, Source Badge ───────

async function renderSidebarStreak(state) {
  const clientState = globalThis.AozClientState;
  const streak = await clientState.getStreak();
  if (!streak || streak.current === 0) {
    state.refs.streakWidget.classList.add("aoz-hidden");
    return;
  }
  state.refs.streakFire.textContent = "\u{1F525}";
  state.refs.streakText.textContent = state.t.streak_label(streak.current);
  state.refs.streakBest.textContent = state.t.streak_best(streak.longest);
  state.refs.streakWidget.classList.remove("aoz-hidden");
  if (streak.current >= 7) {
    state.refs.streakWidget.classList.add("aoz-streak-hot");
  } else {
    state.refs.streakWidget.classList.remove("aoz-streak-hot");
  }
}

async function renderSidebarDailyReport(state) {
  const clientState = globalThis.AozClientState;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const yStats = await clientState.getDailyStats(yKey);

  if (!yStats || yStats.articlesRead === 0) {
    state.refs.dailyReport.classList.add("aoz-hidden");
    return;
  }

  state.refs.dailyReportTitle.textContent = state.t.daily_report_title;
  state.refs.dailyReportLine1.textContent = state.t.daily_report_yesterday(yStats.articlesRead);

  const sources = yStats.sources || {};
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
  state.refs.dailyReportLine2.textContent = topSource
    ? state.t.daily_report_top_source(topSource[0], topSource[1])
    : "";

  state.refs.dailyReportLink.textContent = `${state.t.daily_report_details} \u2192`;
  state.refs.dailyReport.classList.remove("aoz-hidden");
}

async function renderSidebarSourceBadge(state) {
  const clientState = globalThis.AozClientState;
  const statsEngine = globalThis.AozStatsEngine;
  if (!state.baseArticle?.url) return;

  try {
    const hostname = new URL(state.baseArticle.url).hostname.replace(/^www\./, "");
    const profiles = await clientState.getSourceProfiles();
    const profile = profiles[hostname];
    const labels = statsEngine.getSourceBiasLabel(profile, state.lang);

    if (!labels) {
      state.refs.sourceBadge.classList.add("aoz-hidden");
      return;
    }

    state.refs.sourceBadgeName.textContent = `${hostname} \u00B7 ${state.t.source_reads(profile.totalReads)}`;
    state.refs.sourceBadgeBias.textContent = labels.political;
    state.refs.sourceBadgeEmoBar.style.width = `${labels.emotionalValue}%`;
    state.refs.sourceBadge.classList.remove("aoz-hidden");
  } catch {
    state.refs.sourceBadge.classList.add("aoz-hidden");
  }
}

async function handleSidebarStatsClick(state) {
  const clientState = globalThis.AozClientState;
  const statsEngine = globalThis.AozStatsEngine;

  const streak = await clientState.getStreak();
  const weekly = await clientState.getWeeklyStats();
  const sourceProfiles = await clientState.getSourceProfiles();
  let dailyStats = {};
  try { ({ dailyStats = {} } = await chrome.storage.local.get("dailyStats")); }
  catch { /* context invalidated */ }

  const hasData = weekly.totalArticles > 0;

  state.refs.statsTitle.textContent = state.t.stats_title;
  state.refs.statsBackButton.textContent = state.t.back;

  if (!hasData) {
    state.refs.statsNoData.textContent = state.t.stats_no_data;
    state.refs.statsNoData.classList.remove("aoz-hidden");
    state.refs.statsStreakSection.classList.add("aoz-hidden");
    state.refs.statsWeekly.classList.add("aoz-hidden");
    state.refs.statsBias.classList.add("aoz-hidden");
    state.refs.statsSources.classList.add("aoz-hidden");
    state.refs.statsProfiles.classList.add("aoz-hidden");
    sidebarUi.showSidebarView(state.refs, "stats");
    return;
  }

  state.refs.statsNoData.classList.add("aoz-hidden");

  // Streak
  if (streak.current > 0) {
    state.refs.statsStreakIcon.textContent = "\u{1F525}";
    state.refs.statsStreakText.textContent = state.t.streak_label(streak.current);
    const pct = Math.min(100, (streak.current / Math.max(streak.longest, 1)) * 100);
    state.refs.statsStreakBar.style.width = `${pct}%`;
    state.refs.statsStreakBest.textContent = state.t.streak_best(streak.longest);
    state.refs.statsStreakSection.classList.remove("aoz-hidden");
  } else {
    state.refs.statsStreakSection.classList.add("aoz-hidden");
  }

  // Weekly
  state.refs.statsWeeklyLabel.textContent = state.t.stats_this_week;
  state.refs.statsArticles.textContent = state.t.stats_articles(weekly.totalArticles);
  state.refs.statsAnalyses.textContent = state.t.stats_analyses(weekly.totalAnalyses);
  state.refs.statsQuestions.textContent = state.t.stats_questions(weekly.totalQuestions);
  state.refs.statsVotes.textContent = state.t.stats_votes(weekly.totalVotes);
  state.refs.statsWeekly.classList.remove("aoz-hidden");

  // Bias map
  const biasData = statsEngine.computeDailyBiasAverages(dailyStats, 7);
  const hasAnyBias = biasData.some((d) => d.count > 0);
  if (hasAnyBias) {
    state.refs.statsBiasTitle.textContent = state.t.bias_map_title;
    const allReadings = weekly.biasReadings;
    const avgP = allReadings.length > 0
      ? allReadings.reduce((s, r) => s + r.political, 0) / allReadings.length
      : null;
    const avgE = allReadings.length > 0
      ? allReadings.reduce((s, r) => s + r.emotional, 0) / allReadings.length
      : null;

    const biasContainer = state.refs.statsBiasContent;
    biasContainer.textContent = "";
    biasContainer.appendChild(createEl("p", "aoz-stats-bias-desc", state.t.bias_map_desc));

    if (avgP !== null) {
      const pLabel = statsEngine.computeBiasLabel(avgP, state.lang);
      const eLabel = statsEngine.computeEmotionalLabel(avgE, state.lang);
      const pLeft = (((avgP + 100) / 200) * 100).toFixed(1);

      const pLabelEl = createEl("p", "aoz-stats-bias-label");
      pLabelEl.append(`${state.t.bias_map_political_trend}: `, createEl("strong", null, pLabel));
      biasContainer.appendChild(pLabelEl);

      const pBar = createEl("div", "aoz-bias-bar aoz-political-bar");
      pBar.style.marginBottom = "10px";
      const pDot = createEl("div", "aoz-bias-dot");
      pDot.style.left = `${pLeft}%`;
      pBar.appendChild(pDot);
      biasContainer.appendChild(pBar);

      const eLabelEl = createEl("p", "aoz-stats-bias-label");
      eLabelEl.append(`${state.t.bias_map_emotional_trend}: `, createEl("strong", null, eLabel));
      biasContainer.appendChild(eLabelEl);

      const eBar = createEl("div", "aoz-bias-bar aoz-emotional-bar");
      const eDot = createEl("div", "aoz-bias-dot");
      eDot.style.left = `${avgE.toFixed(1)}%`;
      eBar.appendChild(eDot);
      biasContainer.appendChild(eBar);
    }
    state.refs.statsBias.classList.remove("aoz-hidden");
  } else {
    state.refs.statsBias.classList.add("aoz-hidden");
  }

  // Top sources
  const topSources = statsEngine.computeTopSources(weekly.sources, 5);
  if (topSources.length > 0) {
    state.refs.statsSourcesTitle.textContent = state.t.stats_top_sources;
    state.refs.statsSourcesList.textContent = "";
    for (const s of topSources) {
      const row = createEl("div", "aoz-stats-source-row");
      row.append(createEl("span", "aoz-stats-source-name", s.name), createEl("span", "aoz-stats-source-count", `(${s.count})`));
      state.refs.statsSourcesList.appendChild(row);
    }
    state.refs.statsSources.classList.remove("aoz-hidden");
  } else {
    state.refs.statsSources.classList.add("aoz-hidden");
  }

  // Source profiles
  const profileEntries = Object.entries(sourceProfiles)
    .filter(([, p]) => p.totalBiasAnalyses >= 3)
    .sort((a, b) => b[1].totalReads - a[1].totalReads)
    .slice(0, 5);

  if (profileEntries.length > 0) {
    state.refs.statsProfilesTitle.textContent = state.t.source_profiles_title;
    state.refs.statsProfilesList.textContent = "";
    for (const [name, p] of profileEntries) {
      const labels = statsEngine.getSourceBiasLabel(p, state.lang);
      const row = createEl("div", "aoz-stats-profile-row");
      row.append(
        createEl("span", "aoz-stats-source-name", name),
        createEl("span", "aoz-stats-source-bias", labels.political),
        createEl("span", "aoz-stats-source-emo", `${labels.emotional}(${labels.emotionalValue})`),
        createEl("span", "aoz-stats-source-count", state.t.source_reads(p.totalReads)),
      );
      state.refs.statsProfilesList.appendChild(row);
    }
    state.refs.statsProfiles.classList.remove("aoz-hidden");
  } else {
    state.refs.statsProfiles.classList.add("aoz-hidden");
  }

  sidebarUi.showSidebarView(state.refs, "stats");
}

function handleSidebarStatsBack(state) {
  sidebarUi.showSidebarView(state.refs, "main");
}

function bindSidebarChromeControls(state) {
  state.refs.closeButton.addEventListener("click", () => handleSidebarClose(state));
  state.refs.tab.addEventListener("click", () => handleSidebarOpen(state));
  state.refs.langButton.addEventListener("click", () => handleSidebarLangToggle(state));
  state.refs.backButton.addEventListener("click", () => handleSidebarBackClick(state));
  state.refs.premiumButton.addEventListener("click", handleSidebarPremiumClick);
  // Phase 1
  state.refs.statsButton.addEventListener("click", () => handleSidebarStatsClick(state));
  state.refs.statsBackButton.addEventListener("click", () => handleSidebarStatsBack(state));
  state.refs.streakWidget.addEventListener("click", () => handleSidebarStatsClick(state));
  state.refs.dailyReportLink.addEventListener("click", () => handleSidebarStatsClick(state));
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

  // Phase 1: always render streak, daily report, source badge, show stats button
  renderSidebarStreak(state);
  renderSidebarDailyReport(state);
  renderSidebarSourceBadge(state);
  state.refs.statsButton.classList.remove("aoz-hidden");

  const lastResult = await appCore.getLastResult();

  if (lastResult) {
    renderResult(state, lastResult);
    return;
  }

  const history = await loadHistory(state);
  sidebarUi.showSidebarView(state.refs, usage.remaining === 0 && history.length === 0 ? "limit" : "main");
}

async function initSidebar() {
  if (document.getElementById("aoz-root-host")) {
    return;
  }

  const baseArticle = extractArticle();
  if (!baseArticle) {
    return;
  }

  const deviceId = await appCore.getDeviceId();
  const lang = await appCore.getLang();
  const shell = await sidebarUi.createSidebarShell(getTranslations(lang, "sidebar"), lang);

  document.body.appendChild(shell.host);

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
