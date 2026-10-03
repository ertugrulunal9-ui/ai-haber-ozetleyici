(() => {
  const surface = globalThis.AozSummarySurface;

  if (!surface) {
    throw new Error("AozSummarySurface is not loaded.");
  }

  let sidebarStylesPromise;

  function createSidebarMarkup(t, lang) {
    return `
      <div class="aoz-header">
        <div class="aoz-logo-row">
          <span class="aoz-brand-mark">AI</span>
          <span class="aoz-logo-text">AI Ozet</span>
        </div>
        <div class="aoz-header-actions">
          <button type="button" class="aoz-lang-btn">${lang === "tr" ? "EN" : "TR"}</button>
          <button type="button" class="aoz-close-btn" title="Kapat">X</button>
        </div>
      </div>
      <div class="aoz-body">
        <div class="aoz-main-view">
          <!-- Daily Report Card -->
          <div class="aoz-daily-report aoz-hidden">
            <p class="aoz-daily-report-title"></p>
            <p class="aoz-daily-report-line1"></p>
            <p class="aoz-daily-report-line2"></p>
            <button type="button" class="aoz-daily-report-link" aria-label="${t.daily_report_details}"></button>
          </div>
          <!-- Weekly Report Card -->
          <div class="aoz-weekly-report aoz-hidden">
            <p class="aoz-weekly-report-title"></p>
            <p class="aoz-weekly-report-line1"></p>
            <p class="aoz-weekly-report-line2"></p>
            <button type="button" class="aoz-weekly-report-link" aria-label="${t.weekly_report_details}"></button>
          </div>
          <!-- Source Badge -->
          <div class="aoz-source-badge aoz-hidden">
            <span class="aoz-source-badge-name"></span>
            <span class="aoz-source-badge-bias"></span>
            <div class="aoz-source-badge-emo-wrap">
              <div class="aoz-source-badge-emo-bar"></div>
            </div>
          </div>
          <!-- Streak Widget -->
          <div class="aoz-streak-widget aoz-hidden">
            <span class="aoz-streak-fire"></span>
            <span class="aoz-streak-text"></span>
            <span class="aoz-streak-best"></span>
          </div>
          <p class="aoz-usage-text"></p>
          <button type="button" class="aoz-btn-primary">${t.summarize}</button>
          <button type="button" class="aoz-stats-btn aoz-hidden">\u{1F4CA} ${t.stats_title}</button>
          <div class="aoz-saved-section aoz-hidden">
            <p class="aoz-label aoz-saved-label">${t.saved_label}</p>
            <div class="aoz-saved-list"></div>
          </div>
          <div class="aoz-history-section aoz-hidden">
            <p class="aoz-label aoz-history-label">${t.history_label}</p>
            <div class="aoz-history-list"></div>
          </div>
        </div>

        <!-- Stats View -->
        <div class="aoz-stats-view aoz-hidden">
          <p class="aoz-label aoz-stats-title">${t.stats_title}</p>
          <div class="aoz-stats-streak-section aoz-hidden">
            <div class="aoz-stats-streak-row">
              <span class="aoz-stats-streak-icon"></span>
              <span class="aoz-stats-streak-text"></span>
            </div>
            <div class="aoz-stats-streak-bar-wrap"><div class="aoz-stats-streak-bar"></div></div>
            <p class="aoz-stats-streak-best"></p>
          </div>
          <div class="aoz-stats-weekly aoz-hidden">
            <p class="aoz-label aoz-stats-weekly-label"></p>
            <div class="aoz-media-diet-summary"></div>
            <button type="button" class="aoz-media-diet-share-btn"></button>
            <p class="aoz-stats-line aoz-stats-articles"></p>
            <p class="aoz-stats-line aoz-stats-analyses"></p>
            <p class="aoz-stats-line aoz-stats-questions"></p>
            <p class="aoz-stats-line aoz-stats-votes"></p>
          </div>
          <div class="aoz-stats-bias aoz-hidden">
            <p class="aoz-label aoz-stats-bias-title"></p>
            <div class="aoz-stats-bias-content"></div>
          </div>
          <div class="aoz-stats-topics aoz-hidden">
            <p class="aoz-label aoz-stats-topics-title"></p>
            <div class="aoz-stats-topics-list"></div>
          </div>
          <div class="aoz-stats-sources aoz-hidden">
            <p class="aoz-label aoz-stats-sources-title"></p>
            <div class="aoz-stats-sources-list"></div>
          </div>
          <div class="aoz-stats-profiles aoz-hidden">
            <p class="aoz-label aoz-stats-profiles-title"></p>
            <div class="aoz-stats-profiles-list"></div>
          </div>
          <p class="aoz-stats-no-data aoz-hidden"></p>
          <button type="button" class="aoz-back-btn aoz-stats-back-btn">${t.back}</button>
        </div>
        <div class="aoz-loading-view aoz-hidden">
          <div class="aoz-spinner"></div>
          <p class="aoz-loading-text">${t.summarizing}</p>
        </div>
        <div class="aoz-result-view aoz-hidden">
          <div class="aoz-summary-card">
            <p class="aoz-label aoz-summary-label">${t.summary_label}</p>
            <p class="aoz-section-helper aoz-summary-helper">${t.summary_helper}</p>
            <p class="aoz-summary-text"></p>
          </div>

          <div class="aoz-keywords-container aoz-hidden" data-tag-class="aoz-keyword-tag"></div>

          <button type="button" class="aoz-bias-btn">${t.bias_btn}</button>
          <div class="aoz-bias-section aoz-hidden">
            <p class="aoz-label aoz-bias-section-label">${t.bias_title}</p>
            <p class="aoz-section-helper aoz-bias-helper">${t.bias_helper}</p>
            <div class="aoz-bias-meter">
              <div class="aoz-bias-meter-labels">
                <span class="aoz-bias-left-label">${t.bias_left}</span>
                <span class="aoz-bias-political-value"></span>
                <span class="aoz-bias-right-label">${t.bias_right}</span>
              </div>
              <div class="aoz-bias-bar aoz-political-bar">
                <div class="aoz-bias-dot aoz-political-dot"></div>
              </div>
            </div>
            <div class="aoz-bias-meter">
              <div class="aoz-bias-meter-labels">
                <span class="aoz-bias-objective-label">${t.bias_objective}</span>
                <span class="aoz-bias-emotional-value"></span>
                <span class="aoz-bias-emotional-label">${t.bias_emotional}</span>
              </div>
              <div class="aoz-bias-bar aoz-emotional-bar">
                <div class="aoz-bias-dot aoz-emotional-dot"></div>
              </div>
            </div>
            <p class="aoz-bias-note aoz-hidden"></p>
          </div>

          <div class="aoz-clickbait-section">
            <p class="aoz-label aoz-clickbait-label">${t.clickbait_title}</p>
            <p class="aoz-section-helper aoz-clickbait-helper">${t.clickbait_helper}</p>
            <div class="aoz-vote-row">
              <button type="button" class="aoz-vote-btn aoz-vote-yes-btn"></button>
              <button type="button" class="aoz-vote-btn aoz-vote-no-btn"></button>
            </div>
            <p class="aoz-vote-stats">${t.clickbait_first}</p>
          </div>

          <div class="aoz-share-row">
            <button type="button" class="aoz-share-btn aoz-copy-btn">${t.copy_action}</button>
            <button type="button" class="aoz-share-btn aoz-save-btn">${t.save_action}</button>
          </div>

          <div class="aoz-share-row">
            <button type="button" class="aoz-share-btn aoz-twitter-btn">${t.twitter_action}</button>
          </div>

          <div class="aoz-share-row aoz-feedback-row">
            <button type="button" class="aoz-share-btn aoz-feedback-good">${t.feedback_good}</button>
            <button type="button" class="aoz-share-btn aoz-feedback-bad">${t.feedback_bad}</button>
          </div>

          <div class="aoz-sources-section aoz-hidden">
            <p class="aoz-label aoz-sources-label">${t.sources_title}</p>
            <p class="aoz-section-helper aoz-sources-helper">${t.sources_helper}</p>
            <p class="aoz-source-compare-summary aoz-hidden"></p>
            <div class="aoz-sources-list"></div>
          </div>

          <div class="aoz-qa-section">
            <p class="aoz-label aoz-qa-label">${t.qa_section_label}</p>
            <div class="aoz-qa-row">
              <input class="aoz-qa-input" type="text" placeholder="${t.qa_placeholder}" />
              <button type="button" class="aoz-qa-btn">-></button>
            </div>
            <p class="aoz-qa-answer aoz-hidden"></p>
          </div>

          <button type="button" class="aoz-back-btn aoz-result-back-btn">${t.back}</button>
        </div>
        <div class="aoz-limit-view aoz-hidden">
          <p class="aoz-limit-text"></p>
          <button type="button" class="aoz-premium-btn">${t.go_premium}</button>
          <button type="button" class="aoz-back-btn aoz-limit-back-btn">${t.back}</button>
        </div>
      </div>
    `;
  }

  function collectSidebarRefs(sidebar, tab) {
    return {
      sidebar,
      tab,
      mainView: sidebar.querySelector(".aoz-main-view"),
      loadingView: sidebar.querySelector(".aoz-loading-view"),
      resultView: sidebar.querySelector(".aoz-result-view"),
      statsView: sidebar.querySelector(".aoz-stats-view"),
      summarizeButton: sidebar.querySelector(".aoz-btn-primary"),
      historySection: sidebar.querySelector(".aoz-history-section"),
      historyLabel: sidebar.querySelector(".aoz-history-label"),
      historyList: sidebar.querySelector(".aoz-history-list"),
      savedSection: sidebar.querySelector(".aoz-saved-section"),
      savedLabel: sidebar.querySelector(".aoz-saved-label"),
      savedList: sidebar.querySelector(".aoz-saved-list"),
      loadingText: sidebar.querySelector(".aoz-loading-text"),
      summaryLabel: sidebar.querySelector(".aoz-summary-label"),
      summaryHelper: sidebar.querySelector(".aoz-summary-helper"),
      summaryText: sidebar.querySelector(".aoz-summary-text"),
      keywordsContainer: sidebar.querySelector(".aoz-keywords-container"),
      biasButton: sidebar.querySelector(".aoz-bias-btn"),
      biasSection: sidebar.querySelector(".aoz-bias-section"),
      biasSectionLabel: sidebar.querySelector(".aoz-bias-section-label"),
      biasHelper: sidebar.querySelector(".aoz-bias-helper"),
      biasLeftLabel: sidebar.querySelector(".aoz-bias-left-label"),
      biasRightLabel: sidebar.querySelector(".aoz-bias-right-label"),
      biasObjectiveLabel: sidebar.querySelector(".aoz-bias-objective-label"),
      biasEmotionalLabel: sidebar.querySelector(".aoz-bias-emotional-label"),
      biasPoliticalValue: sidebar.querySelector(".aoz-bias-political-value"),
      biasEmotionalValue: sidebar.querySelector(".aoz-bias-emotional-value"),
      politicalDot: sidebar.querySelector(".aoz-political-dot"),
      emotionalDot: sidebar.querySelector(".aoz-emotional-dot"),
      biasNote: sidebar.querySelector(".aoz-bias-note"),
      clickbaitLabel: sidebar.querySelector(".aoz-clickbait-label"),
      clickbaitHelper: sidebar.querySelector(".aoz-clickbait-helper"),
      voteYesButton: sidebar.querySelector(".aoz-vote-yes-btn"),
      voteNoButton: sidebar.querySelector(".aoz-vote-no-btn"),
      voteStats: sidebar.querySelector(".aoz-vote-stats"),
      copyButton: sidebar.querySelector(".aoz-copy-btn"),
      saveButton: sidebar.querySelector(".aoz-save-btn"),
      twitterButton: sidebar.querySelector(".aoz-twitter-btn"),
      feedbackGoodButton: sidebar.querySelector(".aoz-feedback-good"),
      feedbackBadButton: sidebar.querySelector(".aoz-feedback-bad"),
      sourcesSection: sidebar.querySelector(".aoz-sources-section"),
      sourcesLabel: sidebar.querySelector(".aoz-sources-label"),
      sourcesHelper: sidebar.querySelector(".aoz-sources-helper"),
      sourcesCompareSummary: sidebar.querySelector(".aoz-source-compare-summary"),
      sourcesList: sidebar.querySelector(".aoz-sources-list"),
      qaLabel: sidebar.querySelector(".aoz-qa-label"),
      qaInput: sidebar.querySelector(".aoz-qa-input"),
      qaButton: sidebar.querySelector(".aoz-qa-btn"),
      qaAnswer: sidebar.querySelector(".aoz-qa-answer"),
      backButton: sidebar.querySelector(".aoz-result-back-btn"),
      langButton: sidebar.querySelector(".aoz-lang-btn"),
      closeButton: sidebar.querySelector(".aoz-close-btn"),
      // Phase 1 — Streak, Stats, Daily Report, Source Badge
      streakWidget: sidebar.querySelector(".aoz-streak-widget"),
      streakFire: sidebar.querySelector(".aoz-streak-fire"),
      streakText: sidebar.querySelector(".aoz-streak-text"),
      streakBest: sidebar.querySelector(".aoz-streak-best"),
      statsButton: sidebar.querySelector(".aoz-stats-btn"),
      dailyReport: sidebar.querySelector(".aoz-daily-report"),
      dailyReportTitle: sidebar.querySelector(".aoz-daily-report-title"),
      dailyReportLine1: sidebar.querySelector(".aoz-daily-report-line1"),
      dailyReportLine2: sidebar.querySelector(".aoz-daily-report-line2"),
      dailyReportLink: sidebar.querySelector(".aoz-daily-report-link"),
      weeklyReport: sidebar.querySelector(".aoz-weekly-report"),
      weeklyReportTitle: sidebar.querySelector(".aoz-weekly-report-title"),
      weeklyReportLine1: sidebar.querySelector(".aoz-weekly-report-line1"),
      weeklyReportLine2: sidebar.querySelector(".aoz-weekly-report-line2"),
      weeklyReportLink: sidebar.querySelector(".aoz-weekly-report-link"),
      sourceBadge: sidebar.querySelector(".aoz-source-badge"),
      sourceBadgeName: sidebar.querySelector(".aoz-source-badge-name"),
      sourceBadgeBias: sidebar.querySelector(".aoz-source-badge-bias"),
      sourceBadgeEmoBar: sidebar.querySelector(".aoz-source-badge-emo-bar"),
      // Stats view refs
      statsTitle: sidebar.querySelector(".aoz-stats-title"),
      statsStreakSection: sidebar.querySelector(".aoz-stats-streak-section"),
      statsStreakIcon: sidebar.querySelector(".aoz-stats-streak-icon"),
      statsStreakText: sidebar.querySelector(".aoz-stats-streak-text"),
      statsStreakBar: sidebar.querySelector(".aoz-stats-streak-bar"),
      statsStreakBest: sidebar.querySelector(".aoz-stats-streak-best"),
      statsWeekly: sidebar.querySelector(".aoz-stats-weekly"),
      statsWeeklyLabel: sidebar.querySelector(".aoz-stats-weekly-label"),
      mediaDietSummary: sidebar.querySelector(".aoz-media-diet-summary"),
      mediaDietShareButton: sidebar.querySelector(".aoz-media-diet-share-btn"),
      statsArticles: sidebar.querySelector(".aoz-stats-articles"),
      statsAnalyses: sidebar.querySelector(".aoz-stats-analyses"),
      statsQuestions: sidebar.querySelector(".aoz-stats-questions"),
      statsVotes: sidebar.querySelector(".aoz-stats-votes"),
      statsBias: sidebar.querySelector(".aoz-stats-bias"),
      statsBiasTitle: sidebar.querySelector(".aoz-stats-bias-title"),
      statsBiasContent: sidebar.querySelector(".aoz-stats-bias-content"),
      statsTopics: sidebar.querySelector(".aoz-stats-topics"),
      statsTopicsTitle: sidebar.querySelector(".aoz-stats-topics-title"),
      statsTopicsList: sidebar.querySelector(".aoz-stats-topics-list"),
      statsSources: sidebar.querySelector(".aoz-stats-sources"),
      statsSourcesTitle: sidebar.querySelector(".aoz-stats-sources-title"),
      statsSourcesList: sidebar.querySelector(".aoz-stats-sources-list"),
      statsProfiles: sidebar.querySelector(".aoz-stats-profiles"),
      statsProfilesTitle: sidebar.querySelector(".aoz-stats-profiles-title"),
      statsProfilesList: sidebar.querySelector(".aoz-stats-profiles-list"),
      statsNoData: sidebar.querySelector(".aoz-stats-no-data"),
      statsBackButton: sidebar.querySelector(".aoz-stats-back-btn"),
      // Usage & Limit
      usageText: sidebar.querySelector(".aoz-usage-text"),
      limitView: sidebar.querySelector(".aoz-limit-view"),
      limitText: sidebar.querySelector(".aoz-limit-text"),
      premiumButton: sidebar.querySelector(".aoz-premium-btn"),
      limitBackButton: sidebar.querySelector(".aoz-limit-back-btn"),
    };
  }

  async function createSidebarShell(t, lang) {
    const styles = await getSidebarStyles();
    const host = document.createElement("div");
    host.id = "aoz-root-host";
    host.setAttribute("style", "all: initial !important; display: block !important;");

    const shadowRoot = host.attachShadow({ mode: "closed" });
    const styleTag = document.createElement("style");
    styleTag.textContent = styles;
    shadowRoot.appendChild(styleTag);

    const sidebar = document.createElement("div");
    sidebar.id = "aoz-sidebar";
    sidebar.innerHTML = createSidebarMarkup(t, lang);

    const tab = document.createElement("button");
    tab.id = "aoz-tab";
    tab.type = "button";
    tab.textContent = "AI Ozet";
    tab.classList.add("aoz-hidden");

    shadowRoot.appendChild(sidebar);
    shadowRoot.appendChild(tab);

    return {
      host,
      refs: collectSidebarRefs(sidebar, tab),
    };
  }

  function getSidebarStyles() {
    if (!sidebarStylesPromise) {
      sidebarStylesPromise = fetch(chrome.runtime.getURL("content/sidebar.css"))
        .then((response) => response.ok ? response.text() : "")
        .catch(() => "");
    }

    return sidebarStylesPromise;
  }

  function showSidebarView(refs, viewName) {
    const viewMap = {
      main: refs.mainView,
      loading: refs.loadingView,
      result: refs.resultView,
      stats: refs.statsView,
      limit: refs.limitView,
    };

    Object.entries(viewMap).forEach(([name, node]) => {
      if (node) node.classList.toggle("aoz-hidden", name !== viewName);
    });
  }

  function applySidebarTranslations(refs, t, lang, currentRemaining) {
    refs.langButton.textContent = lang === "tr" ? "EN" : "TR";
    refs.summarizeButton.textContent = t.summarize;
    refs.loadingText.textContent = t.summarizing;
    refs.summaryLabel.textContent = t.summary_label;
    if (refs.summaryHelper) refs.summaryHelper.textContent = t.summary_helper;
    refs.biasButton.textContent = t.bias_btn;
    refs.biasSectionLabel.textContent = t.bias_title;
    if (refs.biasHelper) refs.biasHelper.textContent = t.bias_helper;
    refs.biasLeftLabel.textContent = t.bias_left;
    refs.biasRightLabel.textContent = t.bias_right;
    refs.biasObjectiveLabel.textContent = t.bias_objective;
    refs.biasEmotionalLabel.textContent = t.bias_emotional;
    refs.clickbaitLabel.textContent = t.clickbait_title;
    if (refs.clickbaitHelper) refs.clickbaitHelper.textContent = t.clickbait_helper;
    refs.copyButton.textContent = t.copy_action;
    refs.twitterButton.textContent = t.twitter_action;
    refs.sourcesLabel.textContent = t.sources_title;
    if (refs.sourcesHelper) refs.sourcesHelper.textContent = t.sources_helper;
    refs.qaLabel.textContent = t.qa_section_label;
    refs.qaInput.placeholder = t.qa_placeholder;
    refs.backButton.textContent = t.back;
    refs.historyLabel.textContent = t.history_label;
    if (refs.savedLabel) refs.savedLabel.textContent = t.saved_label;
    if (refs.saveButton) refs.saveButton.textContent = t.save_action;
    if (refs.weeklyReportTitle) refs.weeklyReportTitle.textContent = t.weekly_report_title;
    if (refs.weeklyReportLink) refs.weeklyReportLink.textContent = `${t.weekly_report_details} \u2192`;
    if (refs.mediaDietShareButton) refs.mediaDietShareButton.textContent = t.media_diet_share_action;
    if (refs.usageText) surface.setUsageText(refs.usageText, t, currentRemaining);
    if (refs.premiumButton) refs.premiumButton.textContent = t.go_premium;
    if (refs.limitText) refs.limitText.textContent = globalThis.AozUi.getLimitResetText(t);
  }

  globalThis.AozSidebarUi = {
    createSidebarShell,
    showSidebarView,
    applySidebarTranslations,
  };
})();
