(() => {
  async function getDeviceId() {
    const { deviceId } = await chrome.storage.local.get("deviceId");
    if (deviceId) return deviceId;

    const newId = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId: newId });
    return newId;
  }

  async function getLang() {
    const { lang } = await chrome.storage.local.get("lang");
    return lang || "tr";
  }

  async function setLang(lang) {
    await chrome.storage.local.set({ lang });
  }

  async function saveToHistory(item, maxItems = 10) {
    const { summaryHistory = [] } = await chrome.storage.local.get("summaryHistory");
    const updated = [item, ...summaryHistory].slice(0, maxItems);
    await chrome.storage.local.set({ summaryHistory: updated });
  }

  async function getHistory() {
    const { summaryHistory = [] } = await chrome.storage.local.get("summaryHistory");
    return summaryHistory;
  }

  async function getLastResult() {
    const { lastResult } = await chrome.storage.local.get("lastResult");
    return lastResult || null;
  }

  async function setLastResult(lastResult) {
    await chrome.storage.local.set({ lastResult });
  }

  async function clearLastResult() {
    await chrome.storage.local.remove("lastResult");
  }

  globalThis.AozClientState = {
    getDeviceId,
    getLang,
    setLang,
    saveToHistory,
    getHistory,
    getLastResult,
    setLastResult,
    clearLastResult,
  };
})();
