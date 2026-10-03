(() => {
  const appCore = globalThis.AozAppCore;
  const surface = globalThis.AozSummarySurface;

  function createHistoryModule(state, deps) {
    // deps: { onSelectItem }  — called when user clicks a history or saved item

    function renderHistory(items) {
      surface.renderHistoryList(
        state.refs,
        items,
        (item) => deps.onSelectItem(item),
        { itemClassName: "history-item" },
      );
    }

    async function renderSavedArticles() {
      const saved = await appCore.getSavedArticles();
      surface.renderItemList({
        section: state.refs.savedSection,
        list: state.refs.savedList,
        items: saved,
        onSelect: (item) => deps.onSelectItem(item),
        itemClassName: "history-item",
      });
      return saved;
    }

    return { renderHistory, renderSavedArticles };
  }

  globalThis.AozPopupHistory = { createHistoryModule };
})();
