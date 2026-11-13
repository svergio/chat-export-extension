() =>
  new Promise((resolve) => {
    const locale = window.__ceCdtLocale || 'auto';
    chrome.storage.local.get(['ce.settings'], (got) => {
      const cur = (got && got['ce.settings']) || {};
      const ui = Object.assign({}, cur.ui || {}, { locale: locale });
      const next = Object.assign({}, cur, { ui: ui });
      chrome.storage.local.set({ 'ce.settings': next }, () => {
        resolve({
          ok: !chrome.runtime.lastError,
          locale: locale,
          err: chrome.runtime.lastError && chrome.runtime.lastError.message
        });
      });
    });
  });
