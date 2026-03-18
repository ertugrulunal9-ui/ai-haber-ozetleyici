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
    };
  }

  function showPopupView(refs, viewName) {
    const viewMap = {
      main: refs.mainView,
      loading: refs.loadingView,
      result: refs.resultView,
      limit: refs.limitView,
    };

    Object.entries(viewMap).forEach(([name, node]) => {
      node.classList.toggle("hidden", name !== viewName);
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
  }

  globalThis.AozPopupUi = {
    collectPopupRefs,
    showPopupView,
    applyPopupTranslations,
  };
})();
