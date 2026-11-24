// In-memory chrome.* for background service-worker modules (save.js, onboarding.js).
export const EXT = 'chrome-extension://test-id/';

function pick(store, keys) {
  if (keys == null) return Object.assign({}, store);
  const list = Array.isArray(keys) ? keys : [keys];
  const out = {};
  for (const k of list) if (k in store) out[k] = JSON.parse(JSON.stringify(store[k]));
  return out;
}

function area(store, quota) {
  return {
    QUOTA_BYTES: quota,
    get: async (keys) => pick(store, keys),
    set: async (obj) => {
      const next = Object.assign({}, store, JSON.parse(JSON.stringify(obj)));
      if (quota && JSON.stringify(next).length > quota) throw new Error('QUOTA_BYTES quota exceeded');
      Object.assign(store, JSON.parse(JSON.stringify(obj)));
    },
    remove: async (keys) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete store[k];
    },
    getBytesInUse: async () => JSON.stringify(store).length
  };
}

// folder: { state, name, write(job) -> result | throws }
export function makeChrome(opts = {}) {
  const session = {};
  const local = Object.assign({}, opts.local || {});
  const alive = new Set(opts.tabs || []);
  const windows = new Map();
  const listeners = { message: [], tabRemoved: [], winRemoved: [] };
  const log = { tabMessages: [], broadcasts: [], created: [], popups: [], writes: [] };
  const folder = Object.assign(
    {
      state: 'none',
      name: null,
      write: (job) => ({ ok: true, name: job.files[0].name, folder: 'Exports' })
    },
    opts.folder || {}
  );
  let nextId = 500;

  async function offscreenOp(msg) {
    if (msg.op === 'status') return { ok: true, state: folder.state, name: folder.name };
    if (msg.op === 'tryGrant') return { ok: folder.state === 'granted', state: folder.state };
    if (msg.op === 'write') {
      log.writes.push(msg.files[0].name);
      return folder.write(msg);
    }
    return { ok: true };
  }

  const chrome = {
    runtime: {
      getURL: (p) => EXT + p,
      sendMessage: async (msg) => {
        if (msg && msg.target === 'offscreen') return offscreenOp(msg);
        log.broadcasts.push(msg);
        return undefined;
      },
      onMessage: { addListener: (fn) => listeners.message.push(fn) }
    },
    offscreen: { hasDocument: async () => true, createDocument: async () => {} },
    storage: { session: area(session, opts.sessionQuota || 0), local: area(local, 0) },
    tabs: {
      get: async (id) => {
        if (!alive.has(id)) throw new Error('No tab with id: ' + id);
        return { id };
      },
      sendMessage: async (tabId, msg) => {
        log.tabMessages.push({ tabId, msg });
        if (opts.noBar && msg.type === 'ce-regrant-folder') throw new Error('no receiver');
        return undefined;
      },
      create: async (props) => {
        if (opts.createThrows) throw new Error('tabs.create failed');
        log.created.push(props.url);
        return { id: nextId++ };
      },
      onRemoved: { addListener: (fn) => listeners.tabRemoved.push(fn) }
    },
    windows: {
      get: async (id) => {
        if (!windows.has(id)) throw new Error('No window with id: ' + id);
        return windows.get(id);
      },
      getLastFocused: async () => ({ id: 1, left: 0, top: 0, width: 1200, height: 800 }),
      create: async (props) => {
        const win = { id: nextId++, state: 'normal', width: props.width, height: props.height };
        win.tabs = [{ id: nextId++, url: props.url }];
        windows.set(win.id, win);
        log.popups.push(win);
        return win;
      },
      update: async () => ({}),
      onRemoved: { addListener: (fn) => listeners.winRemoved.push(fn) }
    }
  };

  // Send a runtime message the way Chrome would deliver it to save.js.
  function send(msg, sender) {
    return new Promise((resolve) => {
      for (const fn of listeners.message) {
        if (fn(msg, sender, resolve) === true) return;
      }
      resolve(undefined);
    });
  }

  async function settle() {
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  }

  return {
    chrome,
    session,
    local,
    alive,
    windows,
    folder,
    log,
    send,
    settle,
    closeTab: async (id) => {
      alive.delete(id);
      for (const fn of listeners.tabRemoved) fn(id, {});
      await settle();
    },
    closeWindow: async (id) => {
      windows.delete(id);
      for (const fn of listeners.winRemoved) fn(id);
      await settle();
    }
  };
}

export function tabSender(tabId) {
  return { tab: { id: tabId, windowId: 1 }, frameId: 0, url: 'https://chatgpt.com/c/' + tabId };
}

export function extSender(page, tabId = 900) {
  return { tab: { id: tabId, windowId: 2 }, url: EXT + page };
}

export function saveMsg(name) {
  return { type: 'ce-save', pack: 'single', files: [{ name: name, mime: 'text/markdown', b64: 'aGk=' }] };
}

export function bridge(action, extra) {
  return Object.assign({ type: 'ce-bridge', action: action }, extra || {});
}
