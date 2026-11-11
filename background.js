// WS URL: ws://127.0.0.1:${port}/ws — path /ws (see src/settings.js WS_PATH). Server BrowserHub must match.
(() => {
  // src/settings.js
  var FAQ_VERSION = 1;
  var DEFAULT_HOST = "127.0.0.1";
  var DEFAULT_PORT = 8765;
  var WS_PATH = "/ws";
  var PLATFORMS = Object.freeze(["chatgpt", "grok", "grok-x", "copilot", "claude"]);
  var UI_SKINS = Object.freeze(["chatgpt", "grok", "grok-x", "copilot", "claude"]);
  var UI_SCHEMES = Object.freeze(["auto", "light", "dark"]);
  var UI_LOCALES = Object.freeze(["auto", "en", "ru"]);
  var STORAGE_KEYS = Object.freeze({
    browserId: "ce.browserId",
    settings: "ce.settings",
    status: "ce.bridgeStatus"
  });
  var DEFAULT_SETTINGS = Object.freeze({
    serverOn: false,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    apiKey: "",
    browserLabel: "Chrome",
    platforms: Object.freeze({
      chatgpt: true,
      grok: true,
      "grok-x": true,
      copilot: true,
      claude: true
    }),
    allowCreate: true,
    allowDestructive: false,
    allowProjects: true,
    rpcTimeoutS: 60,
    faqVersion: 0,
    ui: Object.freeze({
      skin: "chatgpt",
      scheme: "auto",
      locale: "auto"
    })
  });
  function normalizeUi(raw) {
    const u = raw && typeof raw === "object" ? raw : {};
    const skin = UI_SKINS.indexOf(u.skin) >= 0 ? u.skin : "chatgpt";
    const scheme = UI_SCHEMES.indexOf(u.scheme) >= 0 ? u.scheme : "auto";
    const locale = UI_LOCALES.indexOf(u.locale) >= 0 ? u.locale : "auto";
    return { skin, scheme, locale };
  }
  function normalizeSettings(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    const platforms = {};
    for (let i = 0; i < PLATFORMS.length; i++) {
      const id = PLATFORMS[i];
      const v = s.platforms && typeof s.platforms === "object" ? s.platforms[id] : void 0;
      platforms[id] = v === false ? false : true;
    }
    const port = Number(s.port);
    const rpcRaw = Number(s.rpcTimeoutS);
    const host = typeof s.host === "string" && s.host.trim() ? s.host.trim() : DEFAULT_HOST;
    return {
      serverOn: !!s.serverOn,
      host,
      port: Number.isFinite(port) && port > 0 && port < 65536 ? Math.floor(port) : DEFAULT_PORT,
      apiKey: typeof s.apiKey === "string" ? s.apiKey : "",
      browserLabel: typeof s.browserLabel === "string" && s.browserLabel.trim() ? s.browserLabel.trim() : "Chrome",
      platforms,
      allowCreate: s.allowCreate === false ? false : true,
      allowDestructive: !!s.allowDestructive,
      allowProjects: s.allowProjects === false ? false : true,
      rpcTimeoutS: Number.isFinite(rpcRaw) && rpcRaw >= 5 && rpcRaw <= 600 ? Math.floor(rpcRaw) : 60,
      faqVersion: Number.isFinite(Number(s.faqVersion)) ? Number(s.faqVersion) : 0,
      ui: normalizeUi(s.ui)
    };
  }
  function hasFaqConsent(settings) {
    const s = normalizeSettings(settings);
    return s.faqVersion === FAQ_VERSION;
  }
  function canEnableBridge(settings) {
    const s = normalizeSettings(settings);
    return hasFaqConsent(s) && !!s.apiKey.trim();
  }
  function platformsEnabledList(settings) {
    const s = normalizeSettings(settings);
    const out = [];
    for (let i = 0; i < PLATFORMS.length; i++) {
      const id = PLATFORMS[i];
      if (s.platforms[id] !== false) out.push(id);
    }
    return out;
  }
  function isPlatformEnabledIn(settings, platformId) {
    const s = normalizeSettings(settings);
    return s.platforms[platformId] !== false;
  }
  function wsUrl(host, port) {
    if (port === void 0) {
      port = host;
      host = DEFAULT_HOST;
    }
    const h = typeof host === "string" && host.trim() ? host.trim() : DEFAULT_HOST;
    const p = Number(port);
    const safe = Number.isFinite(p) && p > 0 ? Math.floor(p) : DEFAULT_PORT;
    return "ws://" + h + ":" + safe + WS_PATH;
  }
  function newBrowserId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return "b-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    }
    const bytes = new Uint8Array(4);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < 4; i++) bytes[i] = Math.random() * 256 | 0;
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return "b-" + hex;
  }
  function generateApiKey() {
    const bytes = new Uint8Array(24);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.random() * 256 | 0;
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return "ceb_" + hex;
  }
  function enrollUrl(host, port) {
    if (port === void 0) {
      port = host;
      host = DEFAULT_HOST;
    }
    const h = typeof host === "string" && host.trim() ? host.trim() : DEFAULT_HOST;
    const p = Number(port);
    const safe = Number.isFinite(p) && p > 0 ? Math.floor(p) : DEFAULT_PORT;
    return "http://" + h + ":" + safe + "/enroll";
  }
  function loadStored() {
    return new Promise(function(resolve) {
      chrome.storage.local.get([STORAGE_KEYS.browserId, STORAGE_KEYS.settings], function(got) {
        let browserId2 = got && got[STORAGE_KEYS.browserId];
        if (typeof browserId2 !== "string" || !browserId2) {
          browserId2 = newBrowserId();
          chrome.storage.local.set({ [STORAGE_KEYS.browserId]: browserId2 });
        }
        resolve({
          browserId: browserId2,
          settings: normalizeSettings(got && got[STORAGE_KEYS.settings])
        });
      });
    });
  }
  function saveSettings(settings) {
    const next = normalizeSettings(settings);
    return new Promise(function(resolve) {
      chrome.storage.local.set({ [STORAGE_KEYS.settings]: next }, function() {
        resolve(next);
      });
    });
  }
  function setBridgeStatus(status) {
    return new Promise(function(resolve) {
      chrome.storage.local.set({ [STORAGE_KEYS.status]: status }, function() {
        resolve(status);
      });
    });
  }
  function getBridgeStatus() {
    return new Promise(function(resolve) {
      chrome.storage.local.get([STORAGE_KEYS.status], function(got) {
        resolve(got && got[STORAGE_KEYS.status] || { state: "offline", detail: "" });
      });
    });
  }

  // src/background/bridge.js
  var EXT_VERSION = "1.8.3";
  var CONTENT_RPC_TYPE = "chat-export-rpc";
  var CONTENT_PING_TYPE = "chat-export-ping";
  var MUTATING_OPS = {
    "chats.create": true,
    "chats.send": true,
    "chats.delete": true,
    "chats.ask_selection": true,
    "chats.side_ask": true
  };
  var CREATE_OPS = {
    "chats.create": true,
    "chats.send": true,
    "chats.ask_selection": true,
    "chats.side_ask": true
  };
  var DESTRUCTIVE_OPS = {
    "chats.delete": true,
    "containers.delete": true
  };
  var PROJECT_OPS = {
    "containers.create": true,
    "containers.delete": true,
    "containers.move_chat": true
  };
  var PROTOCOL_V = 1;
  var PLATFORM_START = {
    chatgpt: "https://chatgpt.com/",
    grok: "https://grok.com/",
    "grok-x": "https://x.com/i/grok",
    copilot: "https://github.com/copilot",
    claude: "https://claude.ai/new"
  };
  var PLATFORM_CONTENT = {
    chatgpt: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/chatgpt.js"],
    grok: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/grok.js"],
    "grok-x": ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/grok-x.js"],
    copilot: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/copilot.js"],
    claude: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/claude.js"]
  };
  var socket = null;
  var reconnectTimer = null;
  var keepaliveTimer = null;
  var reconnectAttempt = 0;
  var intentionalClose = false;
  var currentSettings = normalizeSettings({});
  var browserId = "";
  var started = false;
  var tabsSyncTimer = null;
  var KEEPALIVE_ALARM = "ce-bridge-keepalive";
  var KEEPALIVE_MS = 2e4;
  function sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
  function matchPlatform(platform, url) {
    if (!url) return false;
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      return false;
    }
    const host = (u.hostname || "").toLowerCase();
    const path = u.pathname || "";
    if (platform === "chatgpt") {
      return host === "chatgpt.com" || host === "chat.openai.com" || host.endsWith(".chatgpt.com");
    }
    if (platform === "grok") {
      return host === "grok.com" || host.endsWith(".grok.com");
    }
    if (platform === "grok-x") {
      if (!(host === "x.com" || host === "twitter.com" || host.endsWith(".x.com") || host.endsWith(".twitter.com"))) {
        return false;
      }
      return /^\/i\/grok(?:\/|$)/i.test(path);
    }
    if (platform === "copilot") {
      if (!(host === "github.com" || host.endsWith(".github.com"))) return false;
      return path === "/" || /^\/copilot(?:\/|$)/i.test(path);
    }
    if (platform === "claude") {
      return host === "claude.ai" || host.endsWith(".claude.ai");
    }
    return false;
  }
  function platformFromUrl(url) {
    for (let i = 0; i < Object.keys(PLATFORM_START).length; i++) {
      const platform = Object.keys(PLATFORM_START)[i];
      if (matchPlatform(platform, url)) return platform;
    }
    return "";
  }
  function extractChatId(platform, url) {
    if (!url) return "";
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      return "";
    }
    const path = u.pathname || "";
    if (platform === "chatgpt") {
      let m = path.match(/\/c\/([^/?#]+)/);
      if (m) return m[1];
      m = path.match(/\/g\/[^/]+\/c\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "claude") {
      const m = path.match(/\/chat\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "grok" || platform === "grok-x") {
      const fromQuery = u.searchParams.get("conversationId") || u.searchParams.get("chatId");
      if (fromQuery) return fromQuery;
      const m = path.match(/\/(?:c|chat|conversations?)\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "copilot") {
      const m = path.match(/\/(?:chat|copilot\/c)\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    return "";
  }
  async function collectTabsSnapshot() {
    const tabs = await chrome.tabs.query({});
    const out = [];
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const platform = platformFromUrl(tab.url || "");
      if (!platform) continue;
      out.push({
        tabId: tab.id,
        platform,
        url: tab.url || "",
        chatId: extractChatId(platform, tab.url || ""),
        title: tab.title || "",
        active: !!tab.active
      });
    }
    return out;
  }
  function publishStatus(state, detail) {
    return setBridgeStatus({ state, detail: detail || "", at: Date.now() });
  }
  function sendJson(obj) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(obj));
    return true;
  }
  async function helloPayload() {
    return {
      type: "hello",
      protocolVersion: PROTOCOL_V,
      key: String(currentSettings.apiKey || ""),
      browserId,
      browserLabel: currentSettings.browserLabel || "Chrome",
      extVersion: EXT_VERSION,
      platformsEnabled: platformsEnabledList(currentSettings),
      allowCreate: currentSettings.allowCreate !== false,
      allowDestructive: !!currentSettings.allowDestructive,
      allowProjects: currentSettings.allowProjects !== false,
      tabs: await collectTabsSnapshot()
    };
  }
  async function ensureLocalKey() {
    const stored = await loadStored();
    browserId = stored.browserId;
    currentSettings = stored.settings;
    if (currentSettings.apiKey && currentSettings.apiKey.trim()) {
      return { settings: currentSettings, browserId, created: false };
    }
    const key = generateApiKey();
    currentSettings = normalizeSettings(Object.assign({}, currentSettings, { apiKey: key }));
    await saveSettings(currentSettings);
    return { settings: currentSettings, browserId, created: true, key };
  }
  async function enrollKeyToServer(settings, id) {
    const s = normalizeSettings(settings || currentSettings);
    const bid = id || browserId;
    if (!s.apiKey.trim()) throw new Error("api key required");
    if (!bid) throw new Error("browserId required");
    const res = await fetch(enrollUrl(s.host, s.port), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        key: s.apiKey.trim(),
        browserId: bid,
        browserLabel: s.browserLabel || "Chrome",
        allowCreate: s.allowCreate !== false,
        allowDestructive: !!s.allowDestructive,
        allowProjects: s.allowProjects !== false
      })
    });
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
    }
    if (!res.ok) {
      const msg = body && body.error && body.error.message || "enroll HTTP " + res.status + " (is the server running?)";
      throw new Error(msg);
    }
    return body;
  }
  function settingsPayload() {
    return {
      type: "settings",
      platformsEnabled: platformsEnabledList(currentSettings),
      allowCreate: currentSettings.allowCreate !== false,
      allowDestructive: !!currentSettings.allowDestructive,
      allowProjects: currentSettings.allowProjects !== false,
      browserLabel: currentSettings.browserLabel || "Chrome"
    };
  }
  async function pushTabsIfConnected() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    return sendJson({
      type: "tabs",
      browserId,
      tabs: await collectTabsSnapshot()
    });
  }
  function scheduleTabsSync() {
    if (tabsSyncTimer) clearTimeout(tabsSyncTimer);
    tabsSyncTimer = setTimeout(function() {
      tabsSyncTimer = null;
      pushTabsIfConnected().catch(function() {
      });
    }, 500);
  }
  function rpcResult(id, body) {
    if (body && body.ok === true) {
      return { type: "rpc.result", id, ok: true, data: body.data };
    }
    const err = body && body.error || { code: "HOST_ERROR", message: "empty response" };
    return {
      type: "rpc.result",
      id,
      ok: false,
      error: {
        code: err.code || "HOST_ERROR",
        message: String(err.message || err.code || "error"),
        details: err.details
      }
    };
  }
  function waitTabComplete(tabId) {
    return new Promise(function(resolve) {
      function onUpdated(id, info) {
        if (id !== tabId) return;
        if (info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      }
      chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError || !tab) {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
          return;
        }
        if (tab.status === "complete") {
          resolve();
          return;
        }
        chrome.tabs.onUpdated.addListener(onUpdated);
        setTimeout(function() {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }, 15e3);
      });
    });
  }
  var CREATE_FRESH_TAB = { "grok-x": true, copilot: true };
  function tabScore(tab, chatId) {
    let score = 0;
    if (chatId && String(tab.url || "").indexOf(chatId) >= 0) score += 100;
    if (!tab.discarded) score += 10;
    if (tab.status === "complete") score += 4;
    if (tab.active) score += 2;
    return score;
  }
  async function ensurePlatformTab(platform, args) {
    const chatId = args && args.chatId ? String(args.chatId) : "";
    const tabs = await chrome.tabs.query({});
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < tabs.length; i++) {
      if (!matchPlatform(platform, tabs[i].url)) continue;
      const score = tabScore(tabs[i], chatId);
      if (score > bestScore) {
        best = tabs[i];
        bestScore = score;
      }
    }
    if (best) {
      if (best.discarded) {
        await chrome.tabs.reload(best.id);
        await waitTabComplete(best.id);
      }
      return best.id;
    }
    const start = PLATFORM_START[platform];
    if (!start) throw Object.assign(new Error("unknown platform"), { code: "BAD_REQUEST" });
    const tab = await chrome.tabs.create({ url: start, active: false });
    await waitTabComplete(tab.id);
    await sleep(400);
    return tab.id;
  }
  async function resetTabToStart(tabId, platform) {
    const start = PLATFORM_START[platform];
    if (!start) return;
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url === start && tab.status === "complete") return;
    const loaded = new Promise(function(resolve) {
      let sawLoading = false;
      const timer = setTimeout(done, 2e4);
      function done() {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
      function onUpdated(id, info) {
        if (id !== tabId) return;
        if (info.status === "loading") sawLoading = true;
        else if (info.status === "complete" && sawLoading) done();
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
    await chrome.tabs.update(tabId, { url: start });
    await loaded;
    await sleep(400);
  }
  function sendMessageAsync(tabId, msg) {
    return new Promise(function(resolve) {
      chrome.tabs.sendMessage(tabId, msg, function(res) {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, error: { code: "NOT_FOUND", message: err.message, transport: true } });
          return;
        }
        resolve(res || { ok: false, error: { code: "HOST_ERROR", message: "empty response" } });
      });
    });
  }
  function isNoReceiver(res) {
    return !!(res && res.error && res.error.transport && /Receiving end|Could not establish/i.test(res.error.message || ""));
  }
  function isPortDropped(res) {
    return !!(res && res.error && res.error.transport && /back\/forward cache|message channel is closed|message port closed/i.test(res.error.message || ""));
  }
  async function pingPlatform(tabId, platform) {
    const res = await sendMessageAsync(tabId, { type: CONTENT_PING_TYPE });
    return !!(res && res.ok && Array.isArray(res.platforms) && res.platforms.indexOf(platform) >= 0);
  }
  async function injectPlatformContent(tabId, platform) {
    const files = PLATFORM_CONTENT[platform];
    if (!files) return "no content files for " + platform;
    if (!chrome.scripting || !chrome.scripting.executeScript) return "chrome.scripting unavailable";
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/page-harvest.js"],
        world: "MAIN"
      });
    } catch (e) {
    }
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files });
    } catch (e) {
      return e && e.message || String(e);
    }
    try {
      if (chrome.scripting.insertCSS) {
        await chrome.scripting.insertCSS({ target: { tabId }, files: ["styles.css"] });
      }
    } catch (e2) {
    }
    return "";
  }
  async function ensureContentReady(tabId, platform) {
    if (await pingPlatform(tabId, platform)) return;
    await waitTabComplete(tabId);
    for (let i = 0; i < 3; i++) {
      await sleep(300);
      if (await pingPlatform(tabId, platform)) return;
    }
    const injectErr = await injectPlatformContent(tabId, platform);
    for (let j = 0; j < 10; j++) {
      if (await pingPlatform(tabId, platform)) return;
      await sleep(300);
    }
    throw Object.assign(
      new Error(
        "content script for " + platform + " not responding in tab " + tabId + (injectErr ? " (inject failed: " + injectErr + ")" : " after inject")
      ),
      { code: "NOT_FOUND" }
    );
  }
  async function forwardRpc(frame) {
    const id = String(frame.id || "");
    const op = frame.op;
    const platform = frame.platform;
    const args = frame.args || {};
    if (!isPlatformEnabledIn(currentSettings, platform)) {
      return rpcResult(id, {
        ok: false,
        error: { code: "PLATFORM_DISABLED", message: "platform " + platform + " is disabled" }
      });
    }
    if (CREATE_OPS[op] && currentSettings.allowCreate === false) {
      return rpcResult(id, {
        ok: false,
        error: { code: "CREATE_DISABLED", message: "allowCreate is off" }
      });
    }
    if (PROJECT_OPS[op] && currentSettings.allowProjects === false) {
      return rpcResult(id, {
        ok: false,
        error: { code: "PROJECTS_DISABLED", message: "allowProjects is off" }
      });
    }
    if (DESTRUCTIVE_OPS[op] && !currentSettings.allowDestructive) {
      return rpcResult(id, {
        ok: false,
        error: { code: "DESTRUCTIVE_DISABLED", message: "allowDestructive is off" }
      });
    }
    const msg = { type: CONTENT_RPC_TYPE, id, op, platform, args };
    const retryable = !MUTATING_OPS[op];
    let last = null;
    try {
      const tabId = await ensurePlatformTab(platform, args);
      if (op === "chats.create" && CREATE_FRESH_TAB[platform]) await resetTabToStart(tabId, platform);
      for (let attempt = 0; attempt < 2; attempt++) {
        await ensureContentReady(tabId, platform);
        last = await sendMessageAsync(tabId, msg);
        if (isNoReceiver(last)) continue;
        if (isPortDropped(last)) {
          if (retryable && attempt === 0) {
            await waitTabComplete(tabId);
            continue;
          }
          last = {
            ok: false,
            error: {
              code: "HOST_ERROR",
              message: platform + " tab navigated away during " + op + " (page reload / bfcache); result unknown"
            }
          };
        }
        break;
      }
    } catch (e) {
      return rpcResult(id, {
        ok: false,
        error: { code: e.code || "HOST_ERROR", message: e.message || String(e) }
      });
    }
    if (last && last.error) delete last.error.transport;
    return rpcResult(id, last || { ok: false, error: { code: "NOT_FOUND", message: "content script not ready" } });
  }
  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }
  function clearKeepalive() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
    try {
      if (chrome.alarms && chrome.alarms.clear) chrome.alarms.clear(KEEPALIVE_ALARM);
    } catch (e) {
    }
  }
  function startKeepalive() {
    clearKeepalive();
    keepaliveTimer = setInterval(function() {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          sendJson(settingsPayload());
        } catch (e) {
        }
      } else if (currentSettings.serverOn && canEnableBridge(currentSettings)) {
        scheduleReconnect();
      }
    }, KEEPALIVE_MS);
    try {
      if (chrome.alarms && chrome.alarms.create) {
        chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 1 });
      }
    } catch (e) {
    }
  }
  function scheduleReconnect() {
    clearReconnect();
    if (!currentSettings.serverOn || !canEnableBridge(currentSettings)) return;
    const attempt = reconnectAttempt++;
    const delay = Math.min(3e4, 500 * Math.pow(2, Math.min(attempt, 6)));
    reconnectTimer = setTimeout(function() {
      connect();
    }, delay);
  }
  function handleServerMessage(raw) {
    let frame;
    try {
      frame = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!frame || typeof frame !== "object") return;
    if (frame.type === "welcome") {
      reconnectAttempt = 0;
      startKeepalive();
      publishStatus("connected", frame.serverVersion ? "server " + frame.serverVersion : "");
      scheduleTabsSync();
      return;
    }
    if (frame.type === "error") {
      if (frame.code === "UNAUTHORIZED") {
        publishStatus("auth_failed", frame.message || "invalid key");
        intentionalClose = true;
        if (socket) socket.close();
        return;
      }
      publishStatus("offline", frame.message || frame.code || "error");
      return;
    }
    if (frame.type === "rpc") {
      forwardRpc(frame).then(function(result) {
        sendJson(result);
      });
    }
  }
  function openSocket() {
    if (socket) {
      try {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      } catch (e) {
      }
      socket = null;
    }
    const url = wsUrl(currentSettings.host, currentSettings.port);
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      publishStatus("offline", e.message || "ws open failed");
      scheduleReconnect();
      return;
    }
    socket = ws;
    ws.onopen = function() {
      helloPayload().then(function(payload) {
        sendJson(payload);
      }).catch(function() {
        publishStatus("offline", "hello failed");
      });
    };
    ws.onmessage = function(ev) {
      handleServerMessage(ev.data);
    };
    ws.onerror = function() {
      if (ws === socket) publishStatus("offline", "connection error");
    };
    ws.onclose = function() {
      if (ws !== socket) return;
      socket = null;
      clearKeepalive();
      if (intentionalClose) {
        if (currentSettings.serverOn) publishStatus("auth_failed", "unauthorized");
        else publishStatus("offline", "");
        return;
      }
      publishStatus("offline", "disconnected");
      scheduleReconnect();
    };
  }
  function connect() {
    clearReconnect();
    if (!currentSettings.serverOn || !hasFaqConsent(currentSettings)) {
      clearKeepalive();
      publishStatus("offline", hasFaqConsent(currentSettings) ? "" : "faq consent required");
      return;
    }
    intentionalClose = false;
    publishStatus("connecting", "");
    ensureLocalKey().then(function() {
      return enrollKeyToServer(currentSettings, browserId).catch(function() {
        return null;
      });
    }).then(function() {
      openSocket();
    }).catch(function(err) {
      publishStatus("offline", err && err.message || "connect failed");
      scheduleReconnect();
    });
  }
  async function reconnectBridge() {
    reconnectAttempt = 0;
    intentionalClose = false;
    clearReconnect();
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.close();
      } catch (e) {
      }
      socket = null;
    }
    connect();
    await sleep(1200);
    const status = await getBridgeStatus();
    return {
      ok: true,
      status,
      runtime: getRuntimeState()
    };
  }
  function disconnect(reason) {
    clearReconnect();
    clearKeepalive();
    if (tabsSyncTimer) {
      clearTimeout(tabsSyncTimer);
      tabsSyncTimer = null;
    }
    intentionalClose = true;
    if (socket) {
      try {
        socket.close();
      } catch (e) {
      }
      socket = null;
    }
    publishStatus("offline", reason || "");
  }
  function applySettings(settings) {
    currentSettings = normalizeSettings(settings);
    if (!currentSettings.serverOn || !canEnableBridge(currentSettings)) {
      disconnect(!hasFaqConsent(currentSettings) ? "faq consent required" : "");
      return;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendJson(settingsPayload());
      scheduleTabsSync();
      return;
    }
    reconnectAttempt = 0;
    connect();
  }
  function pushSettingsIfConnected() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendJson(settingsPayload());
      scheduleTabsSync();
    }
  }
  function getRuntimeState() {
    return {
      browserId,
      settings: currentSettings,
      socketState: socket ? socket.readyState : -1
    };
  }
  async function testConnection() {
    try {
      const ensured = await ensureLocalKey();
      const settings = ensured.settings;
      if (!hasFaqConsent(settings)) {
        return { ok: false, state: "offline", detail: "faq consent required" };
      }
      await enrollKeyToServer(settings, ensured.browserId);
      const url = wsUrl(settings.host, settings.port);
      return await new Promise(function(resolve) {
        let settled = false;
        let ws;
        const timer = setTimeout(function() {
          finish({ ok: false, state: "offline", detail: "timeout" });
        }, 5e3);
        function finish(result) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try {
            if (ws) ws.close();
          } catch (e) {
          }
          resolve(result);
        }
        try {
          ws = new WebSocket(url);
        } catch (e) {
          finish({ ok: false, state: "offline", detail: e.message || "ws open failed" });
          return;
        }
        ws.onopen = function() {
          collectTabsSnapshot().then(function(tabs) {
            ws.send(
              JSON.stringify({
                type: "hello",
                protocolVersion: PROTOCOL_V,
                key: settings.apiKey,
                browserId: ensured.browserId,
                browserLabel: settings.browserLabel || "Chrome",
                extVersion: EXT_VERSION,
                platformsEnabled: platformsEnabledList(settings),
                allowCreate: settings.allowCreate !== false,
                allowDestructive: !!settings.allowDestructive,
                allowProjects: settings.allowProjects !== false,
                tabs
              })
            );
          }).catch(function() {
            finish({ ok: false, state: "offline", detail: "hello failed" });
          });
        };
        ws.onmessage = function(ev) {
          let frame;
          try {
            frame = JSON.parse(ev.data);
          } catch (e) {
            return;
          }
          if (frame && frame.type === "welcome") {
            finish({ ok: true, state: "connected", detail: frame.serverVersion || "" });
            return;
          }
          if (frame && frame.type === "error") {
            finish({
              ok: false,
              state: frame.code === "UNAUTHORIZED" ? "auth_failed" : "offline",
              detail: frame.message || frame.code || ""
            });
          }
        };
        ws.onerror = function() {
          finish({ ok: false, state: "offline", detail: "connection error" });
        };
        ws.onclose = function() {
          finish({ ok: false, state: "offline", detail: "closed" });
        };
      });
    } catch (err) {
      return { ok: false, state: "offline", detail: err && err.message || "enroll failed" };
    }
  }
  async function rotateLocalKey() {
    const stored = await loadStored();
    browserId = stored.browserId;
    const key = generateApiKey();
    currentSettings = normalizeSettings(Object.assign({}, stored.settings, { apiKey: key }));
    await saveSettings(currentSettings);
    try {
      await enrollKeyToServer(currentSettings, browserId);
    } catch (e) {
    }
    return { ok: true, apiKey: key, browserId, settings: currentSettings };
  }
  async function startBridge() {
    if (started) return;
    started = true;
    const stored = await loadStored();
    browserId = stored.browserId;
    currentSettings = stored.settings;
    applySettings(currentSettings);
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.browserId] && changes[STORAGE_KEYS.browserId].newValue) {
        browserId = changes[STORAGE_KEYS.browserId].newValue;
      }
      if (changes[STORAGE_KEYS.settings]) {
        applySettings(changes[STORAGE_KEYS.settings].newValue);
      }
    });
    chrome.tabs.onUpdated.addListener(function(_tabId, changeInfo) {
      if (changeInfo.url || changeInfo.status === "complete" || changeInfo.title) {
        scheduleTabsSync();
      }
    });
    chrome.tabs.onRemoved.addListener(function() {
      scheduleTabsSync();
    });
    chrome.tabs.onActivated.addListener(function() {
      scheduleTabsSync();
    });
    try {
      if (chrome.alarms && chrome.alarms.onAlarm) {
        chrome.alarms.onAlarm.addListener(function(alarm) {
          if (!alarm || alarm.name !== KEEPALIVE_ALARM) return;
          if (socket && socket.readyState === WebSocket.OPEN) {
            try {
              sendJson(settingsPayload());
            } catch (e) {
            }
            return;
          }
          if (currentSettings.serverOn && canEnableBridge(currentSettings)) {
            reconnectAttempt = 0;
            connect();
          }
        });
      }
    } catch (e) {
    }
  }

  // src/background/main.js
  function bytesToBase64(bytes) {
    var chunk = 32768;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }
  function iconKindFromUrl(url) {
    if (!url) return "idle";
    try {
      var u = new URL(url);
      var host = (u.hostname || "").toLowerCase();
      var path = u.pathname || "";
      if (host === "grok.com" || host.endsWith(".grok.com")) return "grok";
      if (host === "chatgpt.com" || host === "chat.openai.com" || host.endsWith(".chatgpt.com")) {
        return "chatgpt";
      }
      if (host === "github.com" || host.endsWith(".github.com")) {
        if (path === "/" || /^\/copilot(?:\/|$)/i.test(path)) return "copilot";
        return "idle";
      }
      if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com") || host.endsWith(".twitter.com")) {
        if (/^\/i\/grok(?:\/|$)/i.test(path)) return "x";
        return "idle";
      }
      if (host === "claude.ai" || host.endsWith(".claude.ai")) return "claude";
    } catch (e) {
    }
    return "idle";
  }
  function iconPaths(kind) {
    var k = kind || "idle";
    return {
      16: "icons/toolbar-" + k + "-16.png",
      48: "icons/toolbar-" + k + "-48.png",
      128: "icons/toolbar-" + k + "-128.png"
    };
  }
  function setTabIcon(tabId, url) {
    if (tabId == null) return;
    var kind = iconKindFromUrl(url);
    chrome.action.setIcon({ tabId, path: iconPaths(kind) }, function() {
      void chrome.runtime.lastError;
    });
  }
  function refreshTab(tabId) {
    if (tabId == null) return;
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError || !tab) return;
      setTabIcon(tab.id, tab.url);
    });
  }
  chrome.tabs.onActivated.addListener(function(info) {
    refreshTab(info.tabId);
  });
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url || changeInfo.status === "complete") {
      setTabIcon(tabId, tab && tab.url || changeInfo.url);
    }
  });
  chrome.runtime.onInstalled.addListener(function() {
    chrome.tabs.query({}, function(tabs) {
      if (!tabs) return;
      for (var i = 0; i < tabs.length; i++) {
        setTabIcon(tabs[i].id, tabs[i].url);
      }
    });
  });
  chrome.runtime.onStartup.addListener(function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0]) setTabIcon(tabs[0].id, tabs[0].url);
    });
  });
  chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "chat-export-download") {
      var b64 = msg.b64;
      if (!b64 && (msg.buffer || msg.bytes)) {
        var raw = msg.buffer || msg.bytes;
        var bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
        if (bytes.length) b64 = bytesToBase64(bytes);
      }
      if (!b64) {
        sendResponse({ ok: false, error: "empty" });
        return;
      }
      var mime = String(msg.mime || "application/octet-stream").split(";")[0].trim() || "application/octet-stream";
      var name = String(msg.filename || "chat").replace(/\\/g, "/").replace(/^\/+/, "");
      var url = "data:" + mime + ";base64," + b64;
      chrome.downloads.download(
        {
          url,
          filename: name,
          saveAs: false,
          conflictAction: "uniquify"
        },
        function(id) {
          var err = chrome.runtime.lastError;
          if (err || !id) {
            sendResponse({ ok: false, error: err ? err.message : "download failed" });
            return;
          }
          sendResponse({ ok: true, id });
        }
      );
      return true;
    }
    if (msg.type !== "ce-bridge") return;
    var action = msg.action;
    if (action === "getState") {
      Promise.all([loadStored(), getBridgeStatus()]).then(function(pair) {
        sendResponse({
          ok: true,
          browserId: pair[0].browserId,
          settings: pair[0].settings,
          status: pair[1],
          runtime: getRuntimeState()
        });
      });
      return true;
    }
    if (action === "saveSettings") {
      var next = normalizeSettings(msg.settings);
      if (next.serverOn && !hasFaqConsent(next)) next.serverOn = false;
      saveSettings(next).then(function(saved) {
        pushSettingsIfConnected();
        sendResponse({ ok: true, settings: saved });
      });
      return true;
    }
    if (action === "testConnection") {
      testConnection().then(function(result) {
        sendResponse(result);
      });
      return true;
    }
    if (action === "reconnect") {
      reconnectBridge().then(function(result) {
        sendResponse(result);
      });
      return true;
    }
    if (action === "ensureKey") {
      ensureLocalKey().then(function(result) {
        sendResponse({ ok: true, settings: result.settings, browserId: result.browserId, created: result.created });
      });
      return true;
    }
    if (action === "rotateKey") {
      rotateLocalKey().then(function(result) {
        sendResponse(result);
      });
      return true;
    }
  });
  startBridge();
})();
