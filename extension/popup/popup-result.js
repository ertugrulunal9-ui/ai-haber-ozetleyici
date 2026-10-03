(() => {
  const appCore = globalThis.AozAppCore;
  const { getErrorMessage } = globalThis.AozUi;
  const surface = globalThis.AozSummarySurface;
  const popupUi = globalThis.AozPopupUi;

  function createResultModule(state, deps) {
    // deps: { setRemaining, isStillOnArticle }

    function _renderClickbait(votes = {}) {
      surface.renderClickbaitVote(state.refs, state.t, votes, {
        yesActiveClass: "vote-active-yes",
        noActiveClass: "vote-active-no",
      });
    }

    async function _refreshSaveButton() {
      if (!state.currentItem) return;
      const isSaved = await appCore.isArticleSaved(state.currentItem);
      state.refs.saveButton.textContent = isSaved ? state.t.saved_action : state.t.save_action;
      state.refs.saveButton.disabled = isSaved;
    }

    async function loadVotes() {
      if (!state.currentItem?.article?.url) return;

      const data = await appCore.getVotes({
        url: state.currentItem.article.url,
        deviceId: state.deviceId,
      });

      if (!data?.error) {
        _renderClickbait(data);
        if (typeof data?.remaining === "number") deps.setRemaining(data.remaining);
      }
    }

    async function renderResult(item) {
      state.currentItem = item;
      state.refs.summaryText.textContent = item.summary;
      state.refs.saveButton.textContent = state.t.save_action;
      state.refs.saveButton.disabled = false;
      surface.resetResultPanels(state.refs, state.t);
      surface.renderKeywords(state.refs, item.keywords || [], {
        onKeywordClick: handleKeywordClick,
      });
      surface.renderSources(state.refs, state.t, item.sources || [], {
        wrapTag: "li",
        articleTitle: item.title || item.article?.title || "",
        articleUrl: item.article?.url || "",
      });
      _renderClickbait();
      void _refreshSaveButton();
      popupUi.showPopupView(state.refs, "result");
    }

    async function renderSummaryResponse(result, article) {
      if (typeof result.remaining === "number") deps.setRemaining(result.remaining);
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

      if (!(await deps.isStillOnArticle(article))) {
        return;
      }

      await renderResult(result.historyItem);
      await loadVotes();
    }

    async function resumePendingSummary(article) {
      popupUi.showPopupView(state.refs, "loading");
      state.refs.loadingText.textContent = state.t.summarizing;

      const result = await appCore.summarizeArticle({
        article,
        lang: state.lang,
        deviceId: state.deviceId,
      });

      await renderSummaryResponse(result, article);
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

      // Listen for streaming chunks: switch to result view on first chunk and
      // show text as it arrives. The final renderResult call (below) replaces
      // the streamed text with the clean, fully-parsed summary.
      let streamingStarted = false;
      let streamedText = "";

      function onChunk(msg) {
        if (msg.action !== "summaryChunk") return;
        if (!streamingStarted) {
          streamingStarted = true;
          state.refs.summaryText.textContent = "";
          surface.resetResultPanels(state.refs, state.t);
          surface.renderKeywords(state.refs, []);
          surface.renderSources(state.refs, state.t, [], {
            wrapTag: "li",
            articleTitle: "",
            articleUrl: "",
          });
          popupUi.showPopupView(state.refs, "result");
        }
        streamedText += msg.text;
        state.refs.summaryText.textContent = streamedText.trim() || streamedText;
      }

      chrome.runtime.onMessage.addListener(onChunk);
      try {
        const result = await appCore.summarizeArticle({
          article,
          lang: state.lang,
          deviceId: state.deviceId,
        });
        await renderSummaryResponse(result, article);
      } finally {
        chrome.runtime.onMessage.removeListener(onChunk);
      }
    }

    async function handleKeywordClick(keyword) {
      if (!keyword || !state.currentItem) return;

      const prevLabel = state.refs.sourcesLabel.textContent;
      state.refs.sourcesLabel.textContent = `"${keyword}"`;
      state.refs.sourcesSection.classList.remove("hidden");
      state.refs.sourcesList.innerHTML = "";

      const sources = await appCore.searchByKeyword(keyword);

      const articleUrl = state.currentItem?.article?.url || "";
      const filteredSources = sources.filter((s) => {
        try {
          return new URL(s.link).hostname !== new URL(articleUrl).hostname;
        } catch {
          return true;
        }
      });

      surface.renderSources(state.refs, state.t, filteredSources, {
        wrapTag: "li",
        articleTitle: state.currentItem?.title || state.currentItem?.article?.title || "",
        articleUrl,
      });

      if (!filteredSources.length) {
        state.refs.sourcesLabel.textContent = prevLabel;
      }
    }

    async function handleBiasClick() {
      if (!state.currentItem?.article) return;

      state.refs.biasButton.disabled = true;
      state.refs.biasButton.textContent = state.t.bias_loading;

      const result = await appCore.analyzeArticle({
        article: state.currentItem.article,
        lang: state.lang,
        deviceId: state.deviceId,
      });

      state.refs.biasButton.disabled = false;
      if (typeof result.remaining === "number") deps.setRemaining(result.remaining);

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
      if (!state.currentItem?.summary) return;

      await navigator.clipboard.writeText(state.currentItem.summary);
      state.refs.copyLabel.textContent = state.t.copied_action;
      setTimeout(() => {
        state.refs.copyLabel.textContent = state.t.copy_action;
      }, 2000);
    }

    function handleShareClick() {
      if (!state.currentItem?.summary) return;
      chrome.tabs.create({ url: surface.getShareUrl(state.currentItem.summary) });
    }

    async function handleSaveClick() {
      if (!state.currentItem) return;

      state.refs.saveButton.disabled = true;
      await appCore.saveArticle(state.currentItem);
      state.refs.saveButton.textContent = state.t.saved_action;
    }

    async function handleQaSubmit() {
      const question = state.refs.qaInput.value.trim();
      if (!question || !state.currentItem?.article) return;

      state.refs.qaButton.disabled = true;
      state.refs.qaButton.textContent = "...";

      const result = await appCore.askQuestion({
        article: state.currentItem.article,
        lang: state.lang,
        deviceId: state.deviceId,
        question,
      });

      state.refs.qaButton.disabled = false;
      state.refs.qaButton.textContent = "->";
      if (typeof result.remaining === "number") deps.setRemaining(result.remaining);

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
      if (!state.currentItem?.article?.url) return;

      const data = await appCore.submitVote({
        url: state.currentItem.article.url,
        deviceId: state.deviceId,
        is_clickbait: isClickbait,
      });

      if (!data?.error) {
        _renderClickbait(data);
        if (typeof data?.remaining === "number") deps.setRemaining(data.remaining);
      }
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

    return {
      renderResult,
      renderSummaryResponse,
      resumePendingSummary,
      loadVotes,
      handleSummarizeClick,
      handleKeywordClick,
      handleBiasClick,
      handleCopyClick,
      handleShareClick,
      handleSaveClick,
      handleQaSubmit,
      handleQaKeydown,
      handleVote,
      handleFeedback,
    };
  }

  globalThis.AozPopupResult = { createResultModule };
})();
