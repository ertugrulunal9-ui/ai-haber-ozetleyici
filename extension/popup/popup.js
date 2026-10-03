const appCore = globalThis.AozAppCore;
const { getTranslations, getErrorMessage, getLimitResetText, createEl } = globalThis.AozUi;
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

async function init() {
  state.deviceId = state.deviceId || await appCore.getDeviceId();
  state.lang = await appCore.getLang();
  state.t = getTranslations(state.lang);
  applyTranslations();

  const usage = await refreshUsage();
  if (await maybeConfigurePublishableKey(usage)) {
    return init();
  }

  // Phase 1: always render streak widget and daily report
  renderStreakWidget();
  renderDailyReport();

  const lastResult = await appCore.getLastResult();

  if (lastResult) {
    const tabUrl = await getCurrentTabUrl();
    if (isSameUrl(lastResult.article?.url, tabUrl)) {
      renderResult(lastResult);
      await loadVotes();
      return;
    }
    await appCore.clearLastResult();
  }

  const history = await appCore.getHistory();
  renderHistory(history);
  popupUi.showPopupView(state.refs, usage.remaining === 0 && history.length === 0 ? "limit" : "main");
}

async function maybeConfigurePublishableKey(result) {
  if (result?.error !== "auth_config" || state.authPromptShown) {
    return false;
  }

  state.authPromptShown = true;
  const key = window.prompt("Supabase publishable key'i bir kez gir. Sonraki guncellemelerde tekrar istemez.", "");
  if (!key) {
    return false;
  }

  const saved = await appCore.setPublishableKey(key);
  if (!saved?.ok) {
    alert(state.t.error_unauthorized);
    return false;
  }

  return true;
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
  renderStreakWidget();
  renderDailyReport();
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

// ── Phase 1: Stats, Streak, Daily Report ─────────────────────────────

async function renderStreakWidget() {
  const streak = await appCore.getStreak();
  if (!streak || streak.current === 0) {
    state.refs.streakWidget.classList.add("hidden");
    return;
  }
  state.refs.streakIcon.textContent = streak.current >= 7 ? "\u{1F525}" : "\u{1F525}";
  state.refs.streakText.textContent = state.t.streak_label(streak.current);
  state.refs.streakBest.textContent = state.t.streak_best(streak.longest);
  state.refs.streakWidget.classList.remove("hidden");
  if (streak.current >= 7) {
    state.refs.streakWidget.classList.add("streak-hot");
  } else {
    state.refs.streakWidget.classList.remove("streak-hot");
  }
}

async function renderDailyReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const yStats = await appCore.getDailyStats(yKey);

  if (!yStats || yStats.articlesRead === 0) {
    state.refs.dailyReportCard.classList.add("hidden");
    return;
  }

  state.refs.dailyReportTitle.textContent = state.t.daily_report_title;
  state.refs.dailyReportLine1.textContent = state.t.daily_report_yesterday(yStats.articlesRead);

  // Find top source
  const sources = yStats.sources || {};
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
  if (topSource) {
    state.refs.dailyReportLine2.textContent = state.t.daily_report_top_source(topSource[0], topSource[1]);
  } else {
    state.refs.dailyReportLine2.textContent = "";
  }

  state.refs.dailyReportDetailsBtn.textContent = `${state.t.daily_report_details} \u2192`;
  state.refs.dailyReportCard.classList.remove("hidden");

  // Clear badge
  chrome.action.setBadgeText({ text: "" });
}

async function handleStatsClick() {
  const statsEngine = globalThis.AozStatsEngine;
  const clientState = globalThis.AozClientState;

  const streak = await clientState.getStreak();
  const weekly = await clientState.getWeeklyStats();
  const sourceProfiles = await clientState.getSourceProfiles();
  let dailyStats = {};
  try { ({ dailyStats = {} } = await chrome.storage.local.get("dailyStats")); }
  catch { /* context invalidated */ }

  const hasData = weekly.totalArticles > 0;

  // Translations
  state.refs.statsViewTitle.textContent = state.t.stats_title;
  state.refs.statsBackButton.textContent = state.t.back;

  if (!hasData) {
    state.refs.statsNoData.textContent = state.t.stats_no_data;
    state.refs.statsNoData.classList.remove("hidden");
    state.refs.statsStreakSection.classList.add("hidden");
    state.refs.statsWeeklyCard.classList.add("hidden");
    state.refs.statsBiasCard.classList.add("hidden");
    state.refs.statsSourcesCard.classList.add("hidden");
    state.refs.statsSourceProfilesCard.classList.add("hidden");
    popupUi.showPopupView(state.refs, "stats");
    return;
  }

  state.refs.statsNoData.classList.add("hidden");

  // Streak
  if (streak.current > 0) {
    state.refs.statsStreakIcon.textContent = streak.current >= 7 ? "\u{1F525}" : "\u{1F525}";
    state.refs.statsStreakText.textContent = state.t.streak_label(streak.current);
    const pct = Math.min(100, (streak.current / Math.max(streak.longest, 1)) * 100);
    state.refs.statsStreakBar.style.width = `${pct}%`;
    state.refs.statsStreakBest.textContent = state.t.streak_best(streak.longest);
    state.refs.statsStreakSection.classList.remove("hidden");
  } else {
    state.refs.statsStreakSection.classList.add("hidden");
  }

  // Weekly numbers
  state.refs.statsWeeklyLabel.textContent = state.t.stats_this_week;
  state.refs.statsArticles.textContent = state.t.stats_articles(weekly.totalArticles);
  state.refs.statsAnalyses.textContent = state.t.stats_analyses(weekly.totalAnalyses);
  state.refs.statsQuestions.textContent = state.t.stats_questions(weekly.totalQuestions);
  state.refs.statsVotes.textContent = state.t.stats_votes(weekly.totalVotes);
  state.refs.statsWeeklyCard.classList.remove("hidden");

  // Bias Map
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
    biasContainer.appendChild(createEl("p", "stats-bias-desc", state.t.bias_map_desc));

    if (avgP !== null) {
      const pLabel = statsEngine.computeBiasLabel(avgP, state.lang);
      const eLabel = statsEngine.computeEmotionalLabel(avgE, state.lang);
      const pLeft = (((avgP + 100) / 200) * 100).toFixed(1);
      const eLeft = avgE.toFixed(1);

      const pLabelEl = createEl("p", "stats-bias-label");
      pLabelEl.append(`${state.t.bias_map_political_trend}: `, createEl("strong", null, pLabel));
      biasContainer.appendChild(pLabelEl);

      const pBarLabels = createEl("div", "stats-bias-bar-labels");
      pBarLabels.append(createEl("span", null, "Sol"), createEl("span", null, "Merkez"), createEl("span", null, "Sağ"));
      biasContainer.appendChild(pBarLabels);

      const pBar = createEl("div", "bias-bar political-bar");
      pBar.style.cssText = "position:relative;height:8px;border-radius:99px;background:linear-gradient(to right,#3b82f6,#22c55e,#ef4444);margin-bottom:12px";
      const pDot = createEl("div", "bias-dot");
      pDot.style.cssText = "position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;border:2.5px solid #334155;box-shadow:0 2px 6px rgba(0,0,0,0.25)";
      pDot.style.left = `${pLeft}%`;
      pBar.appendChild(pDot);
      biasContainer.appendChild(pBar);

      const eLabelEl = createEl("p", "stats-bias-label");
      eLabelEl.append(`${state.t.bias_map_emotional_trend}: `, createEl("strong", null, eLabel));
      biasContainer.appendChild(eLabelEl);

      const eBarLabels = createEl("div", "stats-bias-bar-labels");
      eBarLabels.append(createEl("span", null, "Nesnel"), createEl("span", null, "Orta"), createEl("span", null, "Duygusal"));
      biasContainer.appendChild(eBarLabels);

      const eBar = createEl("div", "bias-bar emotional-bar");
      eBar.style.cssText = "position:relative;height:8px;border-radius:99px;background:linear-gradient(to right,#22c55e,#f59e0b,#ef4444);margin-bottom:8px";
      const eDot = createEl("div", "bias-dot");
      eDot.style.cssText = "position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;border:2.5px solid #334155;box-shadow:0 2px 6px rgba(0,0,0,0.25)";
      eDot.style.left = `${eLeft}%`;
      eBar.appendChild(eDot);
      biasContainer.appendChild(eBar);

      // Daily bar chart
      const dayLabels = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cumartesi" };
      const dayLabelsEn = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
      const labels = state.lang === "en" ? dayLabelsEn : dayLabels;
      const daysWithData = biasData.filter((d) => d.count > 0);

      if (daysWithData.length > 1) {
        const dayLabelEl = createEl("p", "stats-bias-label", state.t.bias_map_day_label);
        dayLabelEl.style.marginTop = "8px";
        biasContainer.appendChild(dayLabelEl);

        const dailyContainer = createEl("div", "stats-bias-daily");
        for (const d of daysWithData) {
          const dayOfWeek = new Date(d.date).getDay();
          const label = labels[dayOfWeek];
          const barWidth = Math.max(10, (((d.avgPolitical + 100) / 200) * 100));
          const biasLabel = statsEngine.computeBiasLabel(d.avgPolitical, state.lang);

          const row = createEl("div", "stats-bias-day-row");
          const barWrap = createEl("div", "stats-bias-day-bar-wrap");
          const bar = createEl("div", "stats-bias-day-bar");
          bar.style.width = `${barWidth}%`;
          barWrap.appendChild(bar);
          row.append(createEl("span", "stats-bias-day-label", label), barWrap, createEl("span", "stats-bias-day-val", biasLabel));
          dailyContainer.appendChild(row);
        }
        biasContainer.appendChild(dailyContainer);
      }
    }
    state.refs.statsBiasCard.classList.remove("hidden");
  } else {
    state.refs.statsBiasCard.classList.add("hidden");
  }

  // Top Sources
  const topSources = statsEngine.computeTopSources(weekly.sources, 5);
  if (topSources.length > 0) {
    state.refs.statsSourcesTitle.textContent = state.t.stats_top_sources;
    state.refs.statsSourcesList.textContent = "";
    for (const s of topSources) {
      const row = createEl("div", "stats-source-row");
      row.append(createEl("span", "stats-source-name", s.name), createEl("span", "stats-source-count", `(${s.count})`));
      state.refs.statsSourcesList.appendChild(row);
    }
    state.refs.statsSourcesCard.classList.remove("hidden");
  } else {
    state.refs.statsSourcesCard.classList.add("hidden");
  }

  // Source Profiles
  const profileEntries = Object.entries(sourceProfiles)
    .filter(([, p]) => p.totalBiasAnalyses >= 3)
    .sort((a, b) => b[1].totalReads - a[1].totalReads)
    .slice(0, 5);

  if (profileEntries.length > 0) {
    state.refs.statsSourceProfilesTitle.textContent = state.t.source_profiles_title;
    state.refs.statsSourceProfilesList.textContent = "";
    for (const [name, p] of profileEntries) {
      const labels = statsEngine.getSourceBiasLabel(p, state.lang);
      const row = createEl("div", "stats-source-profile-row");
      row.append(
        createEl("span", "stats-source-name", name),
        createEl("span", "stats-source-bias", labels.political),
        createEl("span", "stats-source-emo", `${labels.emotional}(${labels.emotionalValue})`),
        createEl("span", "stats-source-count", state.t.source_reads(p.totalReads)),
      );
      state.refs.statsSourceProfilesList.appendChild(row);
    }
    state.refs.statsSourceProfilesCard.classList.remove("hidden");
  } else {
    state.refs.statsSourceProfilesCard.classList.add("hidden");
  }

  popupUi.showPopupView(state.refs, "stats");
}

function handleStatsBack() {
  popupUi.showPopupView(state.refs, "main");
}

// Expose getStreak & getDailyStats on appCore for popup use
appCore.getStreak = globalThis.AozClientState.getStreak;
appCore.getDailyStats = globalThis.AozClientState.getDailyStats;

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
  // Phase 1
  state.refs.statsButton.addEventListener("click", handleStatsClick);
  state.refs.statsBackButton.addEventListener("click", handleStatsBack);
  state.refs.dailyReportDetailsBtn.addEventListener("click", handleStatsClick);
  state.refs.streakWidget.addEventListener("click", handleStatsClick);
}

bindPopupEvents();
init();
