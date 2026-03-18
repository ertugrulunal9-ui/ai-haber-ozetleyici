(() => {
  const ui = globalThis.AozUi;

  if (!ui) {
    throw new Error("AozUi is not loaded.");
  }

  const { getBiasDisplay, getClickbaitDisplay } = ui;

  function setUsageText(node, t, remaining) {
    node.textContent =
      typeof remaining === "number"
        ? t.usage_remaining(remaining)
        : remaining === undefined
          ? t.usage_loading
          : t.usage_unavailable;
  }

  function getHistoryPreview(item) {
    const title = item?.title || "";
    if (title) {
      return title;
    }

    const summary = item?.summary || "";
    return summary ? `${summary.slice(0, 60)}...` : "";
  }

  function renderHistoryList(refs, items, onSelect, options = {}) {
    const {
      hiddenClass = "hidden",
      itemTag = "li",
      itemClassName = "",
    } = options;

    refs.historyList.innerHTML = "";

    if (!items.length) {
      refs.historySection.classList.add(hiddenClass);
      return;
    }

    items.forEach((item) => {
      const element = document.createElement(itemTag);
      if (itemClassName) {
        element.className = itemClassName;
      }

      element.title = item.title || item.summary;
      element.textContent = getHistoryPreview(item);
      element.addEventListener("click", () => onSelect(item));
      refs.historyList.appendChild(element);
    });

    refs.historySection.classList.remove(hiddenClass);
  }

  function renderSources(refs, t, sources = [], options = {}) {
    const {
      hiddenClass = "hidden",
      linkClassName = "",
      wrapTag = null,
    } = options;
    const sectionNode = refs.sourcesSection || refs.sourcesLabel;

    refs.sourcesList.innerHTML = "";
    refs.sourcesLabel.textContent = t.sources_title;

    if (!sources.length) {
      sectionNode.classList.add(hiddenClass);
      return;
    }

    sources.forEach(({ title, link, source }) => {
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = `${source ? `[${source}] ` : ""}${title}`;

      if (linkClassName) {
        anchor.className = linkClassName;
      }

      if (!wrapTag) {
        refs.sourcesList.appendChild(anchor);
        return;
      }

      const wrapper = document.createElement(wrapTag);
      wrapper.appendChild(anchor);
      refs.sourcesList.appendChild(wrapper);
    });

    sectionNode.classList.remove(hiddenClass);
  }

  function resetResultPanels(refs, t, options = {}) {
    const { hiddenClass = "hidden" } = options;

    refs.biasSection.classList.add(hiddenClass);
    refs.biasNote.classList.add(hiddenClass);
    refs.biasButton.classList.remove(hiddenClass);
    refs.biasButton.textContent = t.bias_btn;
    refs.biasButton.disabled = false;
    refs.qaAnswer.classList.add(hiddenClass);
    refs.qaAnswer.textContent = "";
    refs.qaInput.value = "";
  }

  function renderBiasResult(refs, t, result, options = {}) {
    const { hiddenClass = "hidden" } = options;
    const display = getBiasDisplay(result, t);

    refs.politicalDot.style.left = display.politicalLeft;
    refs.emotionalDot.style.left = display.emotionalLeft;
    refs.biasPoliticalValue.textContent = display.politicalLabel;
    refs.biasEmotionalValue.textContent = display.emotionalLabel;
    refs.biasNote.textContent = result.note;
    refs.biasNote.classList.remove(hiddenClass);
    refs.biasSection.classList.remove(hiddenClass);
  }

  function renderClickbaitVote(refs, t, votes = {}, options = {}) {
    const {
      yesActiveClass,
      noActiveClass,
    } = options;
    const display = getClickbaitDisplay(votes, t);

    refs.clickbaitLabel.textContent = t.clickbait_title;
    refs.voteYesButton.textContent = display.yesText;
    refs.voteNoButton.textContent = display.noText;
    refs.voteStats.textContent = display.statsText;

    if (yesActiveClass) {
      refs.voteYesButton.classList.toggle(yesActiveClass, display.yesActive);
    }

    if (noActiveClass) {
      refs.voteNoButton.classList.toggle(noActiveClass, display.noActive);
    }
  }

  function getShareUrl(summary) {
    const text = encodeURIComponent(`${summary.slice(0, 240)} (AI Ozet)`);
    return `https://twitter.com/intent/tweet?text=${text}`;
  }

  globalThis.AozSummarySurface = {
    setUsageText,
    renderHistoryList,
    renderSources,
    resetResultPanels,
    renderBiasResult,
    renderClickbaitVote,
    getShareUrl,
  };
})();
