(() => {
  const surface = globalThis.AozSummarySurface;

  if (!surface) {
    throw new Error("AozSummarySurface is not loaded.");
  }

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
          <p class="aoz-usage-text"></p>
          <button type="button" class="aoz-btn-primary">${t.summarize}</button>
          <div class="aoz-history-section aoz-hidden">
            <p class="aoz-label aoz-history-label">${t.history_label}</p>
            <div class="aoz-history-list"></div>
          </div>
        </div>
        <div class="aoz-loading-view aoz-hidden">
          <div class="aoz-spinner"></div>
          <p class="aoz-loading-text">${t.summarizing}</p>
        </div>
        <div class="aoz-result-view aoz-hidden">
          <div class="aoz-summary-card">
            <p class="aoz-label aoz-summary-label">${t.summary_label}</p>
            <p class="aoz-summary-text"></p>
          </div>

          <button type="button" class="aoz-bias-btn">${t.bias_btn}</button>
          <div class="aoz-bias-section aoz-hidden">
            <p class="aoz-label aoz-bias-section-label">${t.bias_title}</p>
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
            <div class="aoz-vote-row">
              <button type="button" class="aoz-vote-btn aoz-vote-yes-btn"></button>
              <button type="button" class="aoz-vote-btn aoz-vote-no-btn"></button>
            </div>
            <p class="aoz-vote-stats">${t.clickbait_first}</p>
          </div>

          <div class="aoz-share-row">
            <button type="button" class="aoz-share-btn aoz-copy-btn">${t.copy_action}</button>
            <button type="button" class="aoz-share-btn aoz-twitter-btn">${t.twitter_action}</button>
          </div>

          <div class="aoz-sources-section aoz-hidden">
            <p class="aoz-label aoz-sources-label">${t.sources_title}</p>
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

          <button type="button" class="aoz-back-btn">${t.back}</button>
        </div>
        <div class="aoz-limit-view aoz-hidden">
          <p class="aoz-limit-text">${t.daily_limit}</p>
          <button type="button" class="aoz-premium-btn aoz-hidden">${t.go_premium}</button>
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
      limitView: sidebar.querySelector(".aoz-limit-view"),
      usageText: sidebar.querySelector(".aoz-usage-text"),
      summarizeButton: sidebar.querySelector(".aoz-btn-primary"),
      historySection: sidebar.querySelector(".aoz-history-section"),
      historyLabel: sidebar.querySelector(".aoz-history-label"),
      historyList: sidebar.querySelector(".aoz-history-list"),
      loadingText: sidebar.querySelector(".aoz-loading-text"),
      summaryLabel: sidebar.querySelector(".aoz-summary-label"),
      summaryText: sidebar.querySelector(".aoz-summary-text"),
      biasButton: sidebar.querySelector(".aoz-bias-btn"),
      biasSection: sidebar.querySelector(".aoz-bias-section"),
      biasSectionLabel: sidebar.querySelector(".aoz-bias-section-label"),
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
      voteYesButton: sidebar.querySelector(".aoz-vote-yes-btn"),
      voteNoButton: sidebar.querySelector(".aoz-vote-no-btn"),
      voteStats: sidebar.querySelector(".aoz-vote-stats"),
      copyButton: sidebar.querySelector(".aoz-copy-btn"),
      twitterButton: sidebar.querySelector(".aoz-twitter-btn"),
      sourcesSection: sidebar.querySelector(".aoz-sources-section"),
      sourcesLabel: sidebar.querySelector(".aoz-sources-label"),
      sourcesList: sidebar.querySelector(".aoz-sources-list"),
      qaLabel: sidebar.querySelector(".aoz-qa-label"),
      qaInput: sidebar.querySelector(".aoz-qa-input"),
      qaButton: sidebar.querySelector(".aoz-qa-btn"),
      qaAnswer: sidebar.querySelector(".aoz-qa-answer"),
      backButton: sidebar.querySelector(".aoz-back-btn"),
      limitText: sidebar.querySelector(".aoz-limit-text"),
      premiumButton: sidebar.querySelector(".aoz-premium-btn"),
      langButton: sidebar.querySelector(".aoz-lang-btn"),
      closeButton: sidebar.querySelector(".aoz-close-btn"),
    };
  }

  function createSidebarShell(t, lang) {
    const sidebar = document.createElement("div");
    sidebar.id = "aoz-sidebar";
    sidebar.innerHTML = createSidebarMarkup(t, lang);

    const tab = document.createElement("button");
    tab.id = "aoz-tab";
    tab.type = "button";
    tab.textContent = "AI Ozet";
    tab.classList.add("aoz-hidden");

    return {
      sidebar,
      tab,
      refs: collectSidebarRefs(sidebar, tab),
    };
  }

  function showSidebarView(refs, viewName) {
    const viewMap = {
      main: refs.mainView,
      loading: refs.loadingView,
      result: refs.resultView,
      limit: refs.limitView,
    };

    Object.entries(viewMap).forEach(([name, node]) => {
      node.classList.toggle("aoz-hidden", name !== viewName);
    });
  }

  function applySidebarTranslations(refs, t, lang, currentRemaining) {
    refs.langButton.textContent = lang === "tr" ? "EN" : "TR";
    refs.summarizeButton.textContent = t.summarize;
    refs.loadingText.textContent = t.summarizing;
    refs.summaryLabel.textContent = t.summary_label;
    refs.biasButton.textContent = t.bias_btn;
    refs.biasSectionLabel.textContent = t.bias_title;
    refs.biasLeftLabel.textContent = t.bias_left;
    refs.biasRightLabel.textContent = t.bias_right;
    refs.biasObjectiveLabel.textContent = t.bias_objective;
    refs.biasEmotionalLabel.textContent = t.bias_emotional;
    refs.clickbaitLabel.textContent = t.clickbait_title;
    refs.copyButton.textContent = t.copy_action;
    refs.twitterButton.textContent = t.twitter_action;
    refs.sourcesLabel.textContent = t.sources_title;
    refs.qaLabel.textContent = t.qa_section_label;
    refs.qaInput.placeholder = t.qa_placeholder;
    refs.backButton.textContent = t.back;
    refs.premiumButton.textContent = t.go_premium;
    refs.historyLabel.textContent = t.history_label;
    refs.limitText.textContent = t.daily_limit;
    surface.setUsageText(refs.usageText, t, currentRemaining);
  }

  globalThis.AozSidebarUi = {
    createSidebarShell,
    showSidebarView,
    applySidebarTranslations,
  };
})();
