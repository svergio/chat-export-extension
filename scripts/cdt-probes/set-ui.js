() => {
  return new Promise((resolve) => {
    const skin = window.__ceUiSkin;
    const scheme = window.__ceUiScheme;
    const locale = window.__ceUiLocale;
    chrome.storage.local.get(['ce.settings'], (got) => {
      const cur = (got && got['ce.settings']) || {};
      const ui = Object.assign({}, cur.ui || {});
      if (skin != null) ui.skin = skin;
      if (scheme != null) ui.scheme = scheme;
      if (locale != null) ui.locale = locale;
      const next = Object.assign({}, cur, { ui: ui });
      chrome.storage.local.set({ 'ce.settings': next }, () => {
        resolve({
          ok: !chrome.runtime.lastError,
          ui: ui,
          err: chrome.runtime.lastError && chrome.runtime.lastError.message
        });
      });
    });
  });
}
