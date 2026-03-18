(() => {
  const surface = globalThis.AozSummarySurface;

  if (!surface) {
    throw new Error("AozSummarySurface is not loaded.");
  }

  function collectPopupRefs() {
    return {
      mainView: document.getElementById("mainView"),
      loadingView: document.getElementById("loadingView"),
      resultView: document.getElementById("resultView"),
      limitView: document.getElementById("limitView"),
      statsView: document.getElementById("statsView"),
      usageText: document.getElementById("usageText"),
      summarizeButton: document.getElementById("summarizeBtn"),
      historySection: document.getElementById("historySection"),
      historyLabel: document.getElementById("historyLabel"),
      historyList: document.getElementById("historyList"),
      loadingText: document.getElementById("loadingText"),
      summaryLabel: document.getElementById("summaryLabel"),
      summaryText: document.getElementById("summaryText"),
      biasButton: document.getElementById("biasBtn"),
      biasSection: document.getElementById("biasSection"),
      biasSectionLabel: document.getElementById("biasSectionLabel"),
      biasLeftLabel: document.getElementById("biasLeftLabel"),
      biasRightLabel: document.getElementById("biasRightLabel"),
      biasObjectiveLabel: document.getElementById("biasObjectiveLabel"),
      biasEmotionalLabel: document.getElementById("biasEmotionalLabel"),
      biasPoliticalValue: document.getElementById("biasPoliticalValue"),
      biasEmotionalValue: document.getElementById("biasEmotionalValue"),
      politicalDot: document.getElementById("biasPoliticalDot"),
      emotionalDot: document.getElementById("biasEmotionalDot"),
      biasNote: document.getElementById("biasNote"),
      clickbaitLabel: document.getElementById("clickbaitLabel"),
      voteYesButton: document.getElementById("voteYesBtn"),
      voteNoButton: document.getElementById("voteNoBtn"),
      voteStats: document.getElementById("clickbaitStats"),
      copyButton: document.getElementById("copyBtn"),
      copyLabel: document.getElementById("copyLabel"),
      twitterButton: document.getElementById("twitterBtn"),
      sourcesSection: document.getElementById("sourcesLabel"),
      sourcesLabel: document.getElementById("sourcesLabel"),
      sourcesList: document.getElementById("sourcesList"),
      qaLabel: document.getElementById("qaLabel"),
      qaInput: document.getElementById("qaInput"),
      qaButton: document.getElementById("qaBtn"),
      qaAnswer: document.getElementById("qaAnswer"),
      backButton: document.getElementById("backBtn"),
      limitText: document.getElementById("limitText"),
      premiumButton: document.getElementById("premiumBtn"),
      langButton: document.getElementById("langBtn"),
      keywordsContainer: document.getElementById("keywordsContainer"),
      feedbackGoodButton: document.getElementById("feedbackGoodBtn"),
      feedbackBadButton: document.getElementById("feedbackBadBtn"),
      // Phase 1 — Streak & Stats
      streakWidget: document.getElementById("streakWidget"),
      streakIcon: document.getElementById("streakIcon"),
      streakText: document.getElementById("streakText"),
      streakBest: document.getElementById("streakBest"),
      statsButton: document.getElementById("statsBtn"),
      statsBackButton: document.getElementById("statsBackBtn"),
      // Stats view refs
      statsViewTitle: document.getElementById("statsViewTitle"),
      statsStreakSection: document.getElementById("statsStreakSection"),
      statsStreakIcon: document.getElementById("statsStreakIcon"),
      statsStreakText: document.getElementById("statsStreakText"),
      statsStreakBar: document.getElementById("statsStreakBar"),
      statsStreakBest: document.getElementById("statsStreakBest"),
      statsWeeklyLabel: document.getElementById("statsWeeklyLabel"),
      statsArticles: document.getElementById("statsArticles"),
      statsAnalyses: document.getElementById("statsAnalyses"),
      statsQuestions: document.getElementById("statsQuestions"),
      statsVotes: document.getElementById("statsVotes"),
      statsBiasTitle: document.getElementById("statsBiasTitle"),
      statsBiasContent: document.getElementById("statsBiasContent"),
      statsSourcesTitle: document.getElementById("statsSourcesTitle"),
      statsSourcesList: document.getElementById("statsSourcesList"),
      statsSourceProfilesTitle: document.getElementById("statsSourceProfilesTitle"),
      statsSourceProfilesList: document.getElementById("statsSourceProfilesList"),
      statsNoData: document.getElementById("statsNoData"),
      // Stats view card containers
      statsWeeklyCard: document.getElementById("statsWeeklyCard"),
      statsBiasCard: document.getElementById("statsBiasCard"),
      statsSourcesCard: document.getElementById("statsSourcesCard"),
      statsSourceProfilesCard: document.getElementById("statsSourceProfilesCard"),
      // Daily report
      dailyReportCard: document.getElementById("dailyReportCard"),
      dailyReportTitle: document.getElementById("dailyReportTitle"),
      dailyReportLine1: document.getElementById("dailyReportLine1"),
      dailyReportLine2: document.getElementById("dailyReportLine2"),
      dailyReportDetailsBtn: document.getElementById("dailyReportDetailsBtn"),
    };
  }

  function showPopupView(refs, viewName) {
    const viewMap = {
      main: refs.mainView,
      loading: refs.loadingView,
      result: refs.resultView,
      limit: refs.limitView,
      stats: refs.statsView,
    };

    Object.entries(viewMap).forEach(([name, node]) => {
      if (node) node.classList.toggle("hidden", name !== viewName);
    });
  }

  function applyPopupTranslations(refs, t, lang, currentRemaining) {
    refs.langButton.textContent = lang === "tr" ? "EN" : "TR";
    refs.summarizeButton.textContent = t.summarize;
    refs.backButton.textContent = t.back;
    refs.premiumButton.textContent = t.go_premium;
    refs.summaryLabel.textContent = t.summary_label;
    refs.qaLabel.textContent = t.qa_section_label;
    refs.qaInput.placeholder = t.qa_placeholder;
    refs.copyLabel.textContent = t.copy_action;
    refs.twitterButton.textContent = t.twitter_action;
    refs.biasButton.textContent = t.bias_btn;
    refs.biasSectionLabel.textContent = t.bias_title;
    refs.biasLeftLabel.textContent = t.bias_left;
    refs.biasRightLabel.textContent = t.bias_right;
    refs.biasObjectiveLabel.textContent = t.bias_objective;
    refs.biasEmotionalLabel.textContent = t.bias_emotional;
    refs.historyLabel.textContent = t.history_label;
    refs.limitText.textContent = globalThis.AozUi.getLimitResetText(t);
    surface.setUsageText(refs.usageText, t, currentRemaining);
    // Phase 1 translations
    if (refs.statsButton) refs.statsButton.textContent = `\u{1F4CA} ${t.stats_title}`;
    if (refs.statsViewTitle) refs.statsViewTitle.textContent = t.stats_title;
    if (refs.statsBackButton) refs.statsBackButton.textContent = t.back;
    if (refs.dailyReportTitle) refs.dailyReportTitle.textContent = t.daily_report_title;
    if (refs.dailyReportDetailsBtn) refs.dailyReportDetailsBtn.textContent = `${t.daily_report_details} \u2192`;
  }

  globalThis.AozPopupUi = {
    collectPopupRefs,
    showPopupView,
    applyPopupTranslations,
  };
})();
