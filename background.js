// WS URL: ws://127.0.0.1:${port}/ws — path /ws (see src/settings.js WS_PATH). Server BrowserHub must match.
(() => {
  // src/settings.js
  var TOS_VERSION = 1;
  var FAQ_VERSION = 2;
  var DEFAULT_HOST = "127.0.0.1";
  var DEFAULT_PORT = 8765;
  var WS_PATH = "/ws";
  var PLATFORMS = Object.freeze([
    "chatgpt",
    "grok",
    "grok-x",
    "copilot",
    "claude",
    "qwen",
    "deepseek",
    "perplexity",
    "kimi",
    "zai",
    "minimax",
    "janitorai"
  ]);
  var EXTENSION_ONLY_PLATFORMS = Object.freeze(["janitorai"]);
  var UI_SKINS = Object.freeze([
    "chatgpt",
    "grok",
    "grok-x",
    "copilot",
    "claude",
    "qwen",
    "deepseek",
    "perplexity",
    "kimi",
    "zai",
    "minimax",
    "janitorai"
  ]);
  var UI_SCHEMES = Object.freeze(["auto", "light", "dark"]);
  var UI_LOCALES = Object.freeze(["auto", "en", "ru"]);
  var EXPORT_FORMAT_IDS = Object.freeze(["md", "yaml", "json", "html", "pdf"]);
  var EXPORT_SCHEMA_IDS = Object.freeze(["chat-export/1", "sharegpt/1"]);
  var DEFAULT_EXPORT_SCHEMA_ID = "chat-export/1";
  var SHIFT_MODES = Object.freeze(["rebind", "saveAs"]);
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
      claude: true,
      qwen: true,
      deepseek: true,
      perplexity: true,
      kimi: true,
      zai: true,
      minimax: true,
      janitorai: true
    }),
    allowCreate: true,
    allowDestructive: false,
    allowProjects: true,
    rpcTimeoutS: 60,
    tosVersion: 0,
    faqVersion: 0,
    exportSchemas: Object.freeze({
      default: DEFAULT_EXPORT_SCHEMA_ID,
      byFormat: Object.freeze({
        md: null,
        yaml: null,
        json: null,
        html: null,
        pdf: null
      })
    }),
    saveFolder: Object.freeze({ shiftMode: "rebind" }),
    ui: Object.freeze({
      skin: "auto",
      scheme: "auto",
      locale: "auto"
    })
  });
  function normalizeUi(raw) {
    const u = raw && typeof raw === "object" ? raw : {};
    const skin = u.skin === "auto" || UI_SKINS.indexOf(u.skin) >= 0 ? u.skin : "auto";
    const scheme = UI_SCHEMES.indexOf(u.scheme) >= 0 ? u.scheme : "auto";
    const locale = UI_LOCALES.indexOf(u.locale) >= 0 ? u.locale : "auto";
    return { skin, scheme, locale };
  }
  function normalizeSchemaId(id) {
    const s = String(id || "").trim();
    if (EXPORT_SCHEMA_IDS.indexOf(s) >= 0) return s;
    return DEFAULT_EXPORT_SCHEMA_ID;
  }
  function normalizeExportSchemas(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const def = normalizeSchemaId(src.default);
    const byFormat = {};
    const bf = src.byFormat && typeof src.byFormat === "object" ? src.byFormat : {};
    for (let i = 0; i < EXPORT_FORMAT_IDS.length; i++) {
      const f = EXPORT_FORMAT_IDS[i];
      const v = bf[f];
      if (v == null || v === "" || v === "default") byFormat[f] = null;
      else byFormat[f] = normalizeSchemaId(v);
    }
    return { default: def, byFormat };
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
      tosVersion: Number.isFinite(Number(s.tosVersion)) ? Number(s.tosVersion) : 0,
      faqVersion: Number.isFinite(Number(s.faqVersion)) ? Number(s.faqVersion) : 0,
      exportSchemas: normalizeExportSchemas(s.exportSchemas),
      saveFolder: {
        shiftMode: SHIFT_MODES.indexOf(s.saveFolder && s.saveFolder.shiftMode) >= 0 ? s.saveFolder.shiftMode : "rebind"
      },
      ui: normalizeUi(s.ui)
    };
  }
  function hasTosConsent(settings) {
    const s = normalizeSettings(settings);
    return s.tosVersion === TOS_VERSION;
  }
  function hasFaqConsent(settings) {
    const s = normalizeSettings(settings);
    return s.faqVersion === FAQ_VERSION;
  }
  function canEnableBridge(settings) {
    const s = normalizeSettings(settings);
    return hasTosConsent(s) && hasFaqConsent(s) && !!s.apiKey.trim();
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
  function platformsEnabledForWire(settings) {
    return platformsEnabledList(settings).filter(function(id) {
      return EXTENSION_ONLY_PLATFORMS.indexOf(id) === -1;
    });
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
  function mergeSettingsPatch(existing, patch) {
    const base = existing && typeof existing === "object" ? existing : {};
    const p = patch && typeof patch === "object" ? patch : {};
    const merged = Object.assign({}, base, p);
    if (base.ui || p.ui) {
      merged.ui = Object.assign({}, base.ui || {}, p.ui || {});
    }
    if (base.platforms || p.platforms) {
      merged.platforms = Object.assign({}, base.platforms || {}, p.platforms || {});
    }
    if (base.exportSchemas || p.exportSchemas) {
      const be = base.exportSchemas && typeof base.exportSchemas === "object" ? base.exportSchemas : {};
      const pe = p.exportSchemas && typeof p.exportSchemas === "object" ? p.exportSchemas : {};
      merged.exportSchemas = Object.assign({}, be, pe);
      if (be.byFormat || pe.byFormat) {
        merged.exportSchemas.byFormat = Object.assign({}, be.byFormat || {}, pe.byFormat || {});
      }
    }
    if (base.saveFolder || p.saveFolder) {
      merged.saveFolder = Object.assign({}, base.saveFolder || {}, p.saveFolder || {});
    }
    const prevTos = Number(base.tosVersion);
    const nextTos = Number(merged.tosVersion);
    if (Number.isFinite(prevTos) && prevTos > 0 && (!Number.isFinite(nextTos) || nextTos < prevTos)) {
      merged.tosVersion = prevTos;
    }
    const prevFaq = Number(base.faqVersion);
    const nextFaq = Number(merged.faqVersion);
    if (Number.isFinite(prevFaq) && prevFaq > 0 && (!Number.isFinite(nextFaq) || nextFaq < prevFaq)) {
      merged.faqVersion = prevFaq;
    }
    return merged;
  }
  function settingsJson(settings) {
    return JSON.stringify(normalizeSettings(settings));
  }
  function settingsNeedRewrite(raw) {
    if (raw == null || typeof raw !== "object") return true;
    return JSON.stringify(raw) !== settingsJson(raw);
  }
  function loadStored() {
    return new Promise(function(resolve) {
      chrome.storage.local.get([STORAGE_KEYS.browserId, STORAGE_KEYS.settings], function(got) {
        let browserId2 = got && got[STORAGE_KEYS.browserId];
        if (typeof browserId2 !== "string" || !browserId2) {
          browserId2 = newBrowserId();
          chrome.storage.local.set({ [STORAGE_KEYS.browserId]: browserId2 });
        }
        const raw = got && got[STORAGE_KEYS.settings];
        const settings = normalizeSettings(raw);
        if (settingsNeedRewrite(raw)) {
          chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
        }
        resolve({
          browserId: browserId2,
          settings
        });
      });
    });
  }
  function saveSettings(settings) {
    return new Promise(function(resolve) {
      chrome.storage.local.get([STORAGE_KEYS.settings], function(got) {
        const existing = got && got[STORAGE_KEYS.settings];
        const merged = mergeSettingsPatch(existing, settings);
        const next = normalizeSettings(merged);
        chrome.storage.local.set({ [STORAGE_KEYS.settings]: next }, function() {
          resolve(next);
        });
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
  var EXT_VERSION = chrome.runtime.getManifest().version;
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
    claude: "https://claude.ai/new",
    qwen: "https://chat.qwen.ai/",
    deepseek: "https://chat.deepseek.com/",
    perplexity: "https://www.perplexity.ai/",
    kimi: "https://www.kimi.com/",
    zai: "https://chat.z.ai/",
    minimax: "https://agent.minimax.io/",
    janitorai: "https://janitorai.com/"
  };
  var PLATFORM_CONTENT = {
    chatgpt: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/chatgpt.js"],
    grok: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/grok.js"],
    "grok-x": ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/grok-x.js"],
    copilot: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/copilot.js"],
    claude: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/claude.js"],
    qwen: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/qwen.js"],
    deepseek: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/deepseek.js"],
    perplexity: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/perplexity.js"],
    kimi: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/kimi.js"],
    zai: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/zai.js"],
    minimax: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/minimax.js"],
    janitorai: ["vendor/fontkit.umd.min.js", "vendor/pdf-lib.min.js", "dist/shared.js", "content/janitorai.js"]
  };
  var socket = null;
  var reconnectTimer = null;
  var keepaliveTimer = null;
  var reconnectAttempt = 0;
  var intentionalClose = false;
  var connectEpoch = 0;
  var currentSettings = normalizeSettings({});
  var browserId = "";
  var started = false;
  var tabsSyncTimer = null;
  var KEEPALIVE_ALARM = "ce-bridge-keepalive";
  var KEEPALIVE_MS = 2e4;
  function isBridgeLiveAllowed(settings) {
    const s = normalizeSettings(settings == null ? currentSettings : settings);
    return !!s.serverOn && canEnableBridge(s);
  }
  function bridgeDeniedDetail(settings) {
    const s = normalizeSettings(settings == null ? currentSettings : settings);
    if (!hasTosConsent(s) || !hasFaqConsent(s)) return "faq consent required";
    return "";
  }
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
    if (platform === "qwen") {
      return host === "chat.qwen.ai" || host.endsWith(".qwen.ai");
    }
    if (platform === "deepseek") {
      return host === "chat.deepseek.com" || host.endsWith(".deepseek.com");
    }
    if (platform === "perplexity") {
      return host === "perplexity.ai" || host.endsWith(".perplexity.ai");
    }
    if (platform === "kimi") {
      return host === "kimi.com" || host === "www.kimi.com" || host.endsWith(".kimi.com");
    }
    if (platform === "zai") {
      return host === "chat.z.ai" || host.endsWith(".z.ai");
    }
    if (platform === "minimax") {
      return host === "agent.minimax.io";
    }
    if (platform === "janitorai") {
      return host === "janitorai.com" || host === "www.janitorai.com" || host.endsWith(".janitorai.com");
    }
    return false;
  }
  var COPILOT_AUTH_MESSAGE = "GitHub Copilot requires login at github.com/copilot";
  function isCopilotLanding(url, marketingOnly) {
    if (!url) return false;
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      return false;
    }
    if (!(u.hostname === "github.com" || u.hostname.endsWith(".github.com"))) return false;
    const re = marketingOnly ? /^\/features\/copilot(?:\/|$)/i : /^\/(?:features\/copilot|login|session|sessions)(?:\/|$)/i;
    return re.test(u.pathname || "");
  }
  function copilotAuthError() {
    return Object.assign(new Error(COPILOT_AUTH_MESSAGE), {
      code: "UNAUTHORIZED",
      details: { reason: "AUTH_REQUIRED" }
    });
  }
  async function assertCopilotSession(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (isCopilotLanding(tab && (tab.url || tab.pendingUrl))) throw copilotAuthError();
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
    if (platform === "qwen") {
      const m = path.match(/\/c\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "deepseek") {
      const m = path.match(/\/a\/chat\/s\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "perplexity") {
      const m = path.match(/\/(?:search|session)\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "kimi") {
      const m = path.match(/\/chat\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "zai") {
      const m = path.match(/\/c\/([^/?#]+)/);
      return m ? m[1] : "";
    }
    if (platform === "minimax") {
      const fromQuery = u.searchParams.get("chatID") || u.searchParams.get("chatId");
      if (fromQuery) return fromQuery;
      if (/^\/mavis\b/i.test(path)) {
        const mid = u.searchParams.get("id") || u.searchParams.get("session_id");
        if (mid) return mid;
      }
      const m = path.match(/\/(?:mavis|task|session|chat|c)\/([^/?#]+)/i);
      return m ? m[1] : "";
    }
    if (platform === "janitorai") {
      const m = path.match(/\/(?:[a-z]{2}\/)?chats\/(\d+)/i);
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
      platformsEnabled: platformsEnabledForWire(currentSettings),
      allowCreate: currentSettings.allowCreate !== false,
      allowDestructive: !!currentSettings.allowDestructive,
      allowProjects: currentSettings.allowProjects !== false,
      exportSchemas: currentSettings.exportSchemas || {
        default: "chat-export/1",
        byFormat: { md: null, yaml: null, json: null, html: null, pdf: null }
      },
      exportSchemaIds: ["chat-export/1", "sharegpt/1"],
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
      platformsEnabled: platformsEnabledForWire(currentSettings),
      allowCreate: currentSettings.allowCreate !== false,
      allowDestructive: !!currentSettings.allowDestructive,
      allowProjects: currentSettings.allowProjects !== false,
      browserLabel: currentSettings.browserLabel || "Chrome",
      exportSchemas: currentSettings.exportSchemas || {
        default: "chat-export/1",
        byFormat: { md: null, yaml: null, json: null, html: null, pdf: null }
      },
      exportSchemaIds: ["chat-export/1", "sharegpt/1"]
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
    let landing = null;
    for (let i = 0; i < tabs.length; i++) {
      if (platform === "copilot" && !landing && isCopilotLanding(tabs[i].url, true)) landing = tabs[i];
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
      return { tabId: best.id, created: false };
    }
    const start = PLATFORM_START[platform];
    if (!start) throw Object.assign(new Error("unknown platform"), { code: "BAD_REQUEST" });
    if (landing) {
      await navigateTab(landing.id, start);
      await assertCopilotSession(landing.id);
      return { tabId: landing.id, created: false };
    }
    const tab = await chrome.tabs.create({ url: start, active: false });
    await waitTabComplete(tab.id);
    await sleep(400);
    if (platform === "copilot") await assertCopilotSession(tab.id);
    return { tabId: tab.id, created: true };
  }
  function runTabLoad(tabId, start) {
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
    return start().then(function() {
      return loaded;
    });
  }
  async function navigateTab(tabId, url) {
    await runTabLoad(tabId, function() {
      return chrome.tabs.update(tabId, { url });
    });
    await sleep(400);
  }
  async function reloadTab(tabId) {
    await runTabLoad(tabId, function() {
      return chrome.tabs.reload(tabId);
    });
    await sleep(400);
  }
  async function resetTabToStart(tabId, platform) {
    const start = PLATFORM_START[platform];
    if (!start) return;
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url === start && tab.status === "complete") return;
    await navigateTab(tabId, start);
    if (platform === "copilot") await assertCopilotSession(tabId);
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
  async function reloadForDeclarativeInject(tabId, platform) {
    try {
      await reloadTab(tabId);
    } catch (e) {
      return "chrome.scripting unavailable; tab reload failed: " + (e && e.message || e);
    }
    for (let i = 0; i < 10; i++) {
      if (await pingPlatform(tabId, platform)) return "";
      await sleep(300);
    }
    return "chrome.scripting unavailable; content script not attached after tab reload";
  }
  async function injectPlatformContent(tabId, platform) {
    const files = PLATFORM_CONTENT[platform];
    if (!files) return "no content files for " + platform;
    if (!chrome.scripting || !chrome.scripting.executeScript) return reloadForDeclarativeInject(tabId, platform);
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
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ["styles/base.css", "styles/" + platform + ".css"]
        });
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
    if (!isBridgeLiveAllowed(currentSettings)) {
      disconnect(bridgeDeniedDetail(currentSettings));
      return rpcResult(id, {
        ok: false,
        error: { code: "UNAUTHORIZED", message: "bridge disabled (serverOff or consent)" }
      });
    }
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
    if (op === "tabs.ensure") {
      try {
        const ensured = await ensurePlatformTab(platform, args);
        const tab = await chrome.tabs.get(ensured.tabId);
        const url = tab && tab.url || "";
        scheduleTabsSync();
        return rpcResult(id, {
          ok: true,
          data: {
            tabId: ensured.tabId,
            platform,
            url,
            chatId: extractChatId(platform, url),
            title: tab && tab.title || "",
            active: !!(tab && tab.active),
            created: !!ensured.created
          }
        });
      } catch (e) {
        return rpcResult(id, {
          ok: false,
          error: { code: e.code || "HOST_ERROR", message: e.message || String(e), details: e.details }
        });
      }
    }
    const msg = { type: CONTENT_RPC_TYPE, id, op, platform, args };
    const retryable = !MUTATING_OPS[op];
    let last = null;
    try {
      const ensured = await ensurePlatformTab(platform, args);
      const tabId = ensured.tabId;
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
        error: { code: e.code || "HOST_ERROR", message: e.message || String(e), details: e.details }
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
      if (!isBridgeLiveAllowed(currentSettings)) {
        disconnect(bridgeDeniedDetail(currentSettings));
        return;
      }
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
  function openSocket(epoch) {
    if (epoch !== connectEpoch) return;
    if (!isBridgeLiveAllowed(currentSettings)) {
      disconnect(bridgeDeniedDetail(currentSettings));
      return;
    }
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
      if (epoch !== connectEpoch || !isBridgeLiveAllowed(currentSettings)) {
        intentionalClose = true;
        try {
          ws.close();
        } catch (e) {
        }
        if (socket === ws) socket = null;
        publishStatus("offline", bridgeDeniedDetail(currentSettings));
        return;
      }
      helloPayload().then(function(payload) {
        if (epoch !== connectEpoch || !isBridgeLiveAllowed(currentSettings)) {
          intentionalClose = true;
          try {
            ws.close();
          } catch (e) {
          }
          return;
        }
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
    if (!isBridgeLiveAllowed(currentSettings)) {
      clearKeepalive();
      publishStatus("offline", bridgeDeniedDetail(currentSettings));
      return;
    }
    const epoch = ++connectEpoch;
    intentionalClose = false;
    publishStatus("connecting", "");
    ensureLocalKey().then(function() {
      if (epoch !== connectEpoch || !isBridgeLiveAllowed(currentSettings)) return null;
      return enrollKeyToServer(currentSettings, browserId).catch(function() {
        return null;
      });
    }).then(function() {
      if (epoch !== connectEpoch) return;
      if (!isBridgeLiveAllowed(currentSettings)) {
        disconnect(bridgeDeniedDetail(currentSettings));
        return;
      }
      openSocket(epoch);
    }).catch(function(err) {
      if (epoch !== connectEpoch) return;
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
    connectEpoch += 1;
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
    if (!isBridgeLiveAllowed(currentSettings)) {
      disconnect(bridgeDeniedDetail(currentSettings));
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
  function commitSavedSettings(saved) {
    applySettings(saved);
    return normalizeSettings(saved);
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
      if (!hasTosConsent(settings) || !hasFaqConsent(settings)) {
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
                platformsEnabled: platformsEnabledForWire(settings),
                allowCreate: settings.allowCreate !== false,
                allowDestructive: !!settings.allowDestructive,
                allowProjects: settings.allowProjects !== false,
                exportSchemas: settings.exportSchemas || {
                  default: "chat-export/1",
                  byFormat: { md: null, yaml: null, json: null, html: null, pdf: null }
                },
                exportSchemaIds: ["chat-export/1", "sharegpt/1"],
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

  // src/hostSkin.js
  function toolbarKindFromUrl(url) {
    if (!url) return "idle";
    try {
      const u = new URL(url);
      const host = (u.hostname || "").toLowerCase();
      const path = u.pathname || "";
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
      if (host === "chat.qwen.ai" || host.endsWith(".qwen.ai")) return "qwen";
      if (host === "chat.deepseek.com" || host.endsWith(".deepseek.com")) return "deepseek";
      if (host === "perplexity.ai" || host === "www.perplexity.ai" || host.endsWith(".perplexity.ai")) {
        return "perplexity";
      }
      if (host === "kimi.com" || host === "www.kimi.com" || host.endsWith(".kimi.com")) return "kimi";
      if (host === "chat.z.ai" || host.endsWith(".z.ai")) return "zai";
      if (host === "agent.minimax.io") return "minimax";
      if (host === "janitorai.com" || host === "www.janitorai.com" || host.endsWith(".janitorai.com")) {
        return "janitorai";
      }
    } catch (e) {
    }
    return "idle";
  }

  // src/background/save.js
  var MAX_B64 = 8 * 1024 * 1024;
  var JOB_PREFIX = "ce.job.";
  var FOLDER_WIN_KEY = "ce.folderWindow";
  var OFFSCREEN_URL = "offscreen.html";
  var WIN_W = 420;
  var WIN_H = 380;
  var creating = null;
  async function ensureOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    if (!creating) {
      creating = chrome.offscreen.createDocument({
        url: OFFSCREEN_URL,
        reasons: ["BLOBS"],
        justification: "Write exported chats into the user-chosen folder"
      }).catch(function(e) {
        if (!/single offscreen/i.test(String(e && e.message))) throw e;
      }).finally(function() {
        creating = null;
      });
    }
    await creating;
  }
  async function offscreen(op, extra) {
    await ensureOffscreen();
    const res = await chrome.runtime.sendMessage(Object.assign({ target: "offscreen", op }, extra || {}));
    return res || { ok: false, reason: "error" };
  }
  function broadcast(msg) {
    chrome.runtime.sendMessage(msg).catch(function() {
    });
  }
  async function broadcastStatus() {
    const st = await offscreen("status");
    broadcast({ type: "ce-folder-changed", state: st.state, name: st.name || null });
    return st;
  }
  var queueLock = Promise.resolve();
  function serial(fn) {
    const run = queueLock.then(fn, fn);
    queueLock = run.catch(function() {
    });
    return run;
  }
  var MODE_RANK = { grant: 0, pick: 1, rebind: 2 };
  function strongerMode(a, b) {
    return (MODE_RANK[b] || 0) > (MODE_RANK[a] || 0) ? b : a;
  }
  async function readFolderWindow() {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || rec.windowId == null) return null;
    const win = await chrome.windows.get(rec.windowId, { populate: true }).catch(function() {
      return null;
    });
    const page = chrome.runtime.getURL("folder.html");
    const tab = win && (win.tabs || []).find(function(x) {
      return x.id === rec.tabId && String(x.url || x.pendingUrl || "").indexOf(page) === 0;
    });
    if (!tab) {
      await dropJobs(rec.jobs);
      await chrome.storage.session.remove(FOLDER_WIN_KEY);
      return null;
    }
    return { rec, win };
  }
  function writeFolderRecord(rec) {
    return chrome.storage.session.set({ [FOLDER_WIN_KEY]: rec });
  }
  function dropJobs(ids) {
    const keys = (ids || []).map(function(id) {
      return JOB_PREFIX + id;
    });
    return keys.length ? chrome.storage.session.remove(keys) : Promise.resolve();
  }
  function notifyQueue(rec) {
    broadcast({ type: "ce-folder-queue", tabId: rec.tabId, mode: rec.mode, count: rec.jobs.length });
  }
  async function createFolderPopup(mode, sender) {
    const url = chrome.runtime.getURL("folder.html") + "?mode=" + encodeURIComponent(mode);
    const props = { url, type: "popup", state: "normal", width: WIN_W, height: WIN_H, focused: true };
    const anchorId = sender && sender.tab ? sender.tab.windowId : null;
    const anchor = await (anchorId != null ? chrome.windows.get(anchorId) : Promise.reject()).catch(function() {
      return chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    }).catch(function() {
      return null;
    });
    if (anchor && anchor.width != null && anchor.left != null) {
      props.left = Math.max(0, Math.round(anchor.left + (anchor.width - WIN_W) / 2));
      props.top = Math.max(0, Math.round(anchor.top + (anchor.height - WIN_H) / 2));
    }
    const win = await chrome.windows.create(props);
    if (win.state !== "normal" || win.width !== WIN_W || win.height !== WIN_H) {
      const bounds = { state: "normal", width: WIN_W, height: WIN_H, focused: true };
      if (props.left != null) Object.assign(bounds, { left: props.left, top: props.top });
      await chrome.windows.update(win.id, bounds).catch(function() {
      });
    }
    return win;
  }
  function openFolderPage(mode, jobId, sender) {
    return serial(async function() {
      const open = await readFolderWindow();
      if (open) {
        const rec = open.rec;
        if (jobId && rec.jobs.indexOf(jobId) < 0) rec.jobs.push(jobId);
        rec.mode = strongerMode(rec.mode, mode);
        await writeFolderRecord(rec);
        notifyQueue(rec);
        await chrome.windows.update(rec.windowId, { focused: true }).catch(function() {
        });
        return open.win;
      }
      const win = await createFolderPopup(mode, sender);
      const tab = win.tabs && win.tabs[0];
      await writeFolderRecord({
        windowId: win.id,
        tabId: tab ? tab.id : null,
        mode,
        jobs: jobId ? [jobId] : []
      });
      return win;
    });
  }
  function dropWindowJobs(windowId) {
    return serial(async function() {
      const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
      const rec = got[FOLDER_WIN_KEY];
      if (!rec || rec.windowId !== windowId) return;
      await dropJobs(rec.jobs);
      await chrome.storage.session.remove(FOLDER_WIN_KEY);
    });
  }
  function takeQueuedJobs(tabId) {
    return serial(async function() {
      const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
      const rec = got[FOLDER_WIN_KEY];
      if (!rec || tabId != null && rec.tabId !== tabId) return [];
      const ids = rec.jobs;
      rec.jobs = [];
      await writeFolderRecord(rec);
      return ids;
    });
  }
  function requeue(tabId, ids) {
    return serial(async function() {
      const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
      const rec = got[FOLDER_WIN_KEY];
      if (!rec || rec.tabId !== tabId) return dropJobs(ids);
      rec.jobs = ids.concat(rec.jobs);
      await writeFolderRecord(rec);
    });
  }
  async function queueInfo(tabId) {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || rec.tabId !== tabId) return { ok: true, mode: null, count: 0 };
    return { ok: true, mode: rec.mode, count: rec.jobs.length };
  }
  function cancelQueue(tabId) {
    return serial(async function() {
      const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
      const rec = got[FOLDER_WIN_KEY];
      if (!rec || rec.tabId !== tabId) return { ok: true, dropped: 0 };
      const n = rec.jobs.length;
      await dropJobs(rec.jobs);
      rec.jobs = [];
      await writeFolderRecord(rec);
      return { ok: true, dropped: n };
    });
  }
  function normalizeFiles(files) {
    if (!Array.isArray(files)) return null;
    const out = [];
    for (const f of files) {
      if (!f || typeof f.b64 !== "string" || !f.name) return null;
      out.push({ name: String(f.name), mime: String(f.mime || "application/octet-stream"), b64: f.b64 });
    }
    return out.length ? out : null;
  }
  async function storeJob(job) {
    const id = crypto.randomUUID();
    await chrome.storage.session.set({ [JOB_PREFIX + id]: job });
    return id;
  }
  async function takeJob(id) {
    const key = JOB_PREFIX + id;
    const got = await chrome.storage.session.get(key);
    await chrome.storage.session.remove(key);
    return got[key] || null;
  }
  async function attachJobToSender(jobId, mode, sender) {
    const tabId = sender && sender.tab ? sender.tab.id : null;
    if (tabId == null) return false;
    return serial(async function() {
      const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
      let rec = got[FOLDER_WIN_KEY];
      if (!rec || rec.tabId !== tabId) {
        rec = {
          windowId: sender.tab.windowId != null ? sender.tab.windowId : null,
          tabId,
          mode,
          jobs: []
        };
      }
      if (rec.jobs.indexOf(jobId) < 0) rec.jobs.push(jobId);
      rec.mode = strongerMode(rec.mode, mode);
      await writeFolderRecord(rec);
      notifyQueue(rec);
      return true;
    });
  }
  async function notifyRegrant(sender, jobId, mode) {
    const tabId = sender && sender.tab ? sender.tab.id : null;
    if (tabId == null) return false;
    const opts = sender.frameId != null ? { frameId: sender.frameId } : void 0;
    try {
      await chrome.tabs.sendMessage(
        tabId,
        { type: "ce-regrant-folder", jobId, mode },
        opts
      );
      return true;
    } catch (e) {
      return false;
    }
  }
  async function deferToRegrant(job, mode, sender) {
    const jobId = await storeJob(job);
    await attachJobToSender(jobId, mode, sender);
    const pinged = await notifyRegrant(sender, jobId, mode);
    if (pinged) {
      return { ok: false, reason: "needs_regrant", jobId, pending: true };
    }
    await openFolderPage(mode, jobId, sender);
    return {
      ok: false,
      reason: mode === "pick" ? "no-folder" : "permission",
      jobId,
      pending: true
    };
  }
  async function handleSave(msg, sender) {
    const files = normalizeFiles(msg.files);
    if (!files) return { ok: false, reason: "error", error: "empty" };
    let total = 0;
    for (const f of files) total += f.b64.length;
    if (total > MAX_B64) return { ok: false, reason: "too-large" };
    const pack = msg.pack === "zip" || msg.pack === "folder" ? msg.pack : "single";
    const job = { pack, subdir: msg.subdir ? String(msg.subdir) : null, files };
    if (sender && sender.tab && sender.tab.id != null && sender.tab.id >= 0) {
      job.origin = { tabId: sender.tab.id, frameId: sender.frameId != null ? sender.frameId : null };
    }
    if (msg.rebind) return deferToRegrant(job, "rebind", sender);
    let st = await offscreen("status");
    if (st.state === "unsupported") return { ok: false, reason: "unsupported" };
    if (st.state === "none") return deferToRegrant(job, "pick", sender);
    if (st.state !== "granted") {
      const granted = await offscreen("tryGrant");
      if (granted && granted.ok) st = granted;
    }
    if (st.state !== "granted") return deferToRegrant(job, "grant", sender);
    const res = await offscreen("write", job);
    if (res.ok) return { ok: true, via: "folder", name: res.name, folder: res.folder };
    if (res.reason === "no-folder") return deferToRegrant(job, "pick", sender);
    if (res.reason === "permission") return deferToRegrant(job, "grant", sender);
    return res;
  }
  function notifyOrigin(origin, res) {
    if (!origin || origin.tabId == null) return;
    const opts = origin.frameId != null ? { frameId: origin.frameId } : void 0;
    chrome.tabs.sendMessage(origin.tabId, { type: "ce-saved", name: res.name || null, folder: res.folder || null }, opts).catch(function() {
    });
  }
  async function handlePicked(msg, sender) {
    const tabId = sender && sender.tab ? sender.tab.id : null;
    const ids = tabId != null ? await takeQueuedJobs(tabId) : [];
    if (msg.jobId && ids.indexOf(msg.jobId) < 0) ids.push(msg.jobId);
    if (msg.originTabId != null && msg.originTabId !== tabId) {
      const extra = await takeQueuedJobs(msg.originTabId);
      for (let i = 0; i < extra.length; i++) {
        if (ids.indexOf(extra[i]) < 0) ids.push(extra[i]);
      }
    }
    const written = [];
    let failure = null;
    for (let i = 0; i < ids.length; i++) {
      const job = await takeJob(ids[i]);
      if (!job) continue;
      const res = await offscreen("write", job);
      if (res.ok) {
        written.push(res.name);
        notifyOrigin(job.origin, res);
        continue;
      }
      failure = res;
      await chrome.storage.session.set({ [JOB_PREFIX + ids[i]]: job });
      if (tabId != null) await requeue(tabId, ids.slice(i));
      break;
    }
    const st = await broadcastStatus();
    const out = { ok: !failure, state: st.state, name: st.name || null, saved: written.length, written };
    if (failure) Object.assign(out, { reason: failure.reason, error: failure.error });
    return out;
  }
  async function handleStoreHandle(msg, sender) {
    const stored = await offscreen("store", { handle: msg.handle });
    if (!stored || !stored.ok) return stored || { ok: false, reason: "permission" };
    await broadcastStatus();
    const originTabId = msg.originTabId != null ? msg.originTabId : sender && sender.tab ? sender.tab.id : null;
    return handlePicked({ jobId: msg.jobId || null, originTabId }, sender);
  }
  async function handleBridge(msg, sender) {
    switch (msg.action) {
      case "folderStatus": {
        const st = await offscreen("status");
        return { ok: true, state: st.state || "unsupported", name: st.name || null };
      }
      case "folderPick": {
        const mode = msg.mode === "rebind" || msg.mode === "grant" ? msg.mode : "pick";
        await openFolderPage(mode, msg.jobId || null, sender);
        return { ok: true, opened: true };
      }
      case "folderForget":
        await offscreen("forget");
        await broadcastStatus();
        return { ok: true };
      case "folderPicked":
        return handlePicked(msg, sender);
      case "folderStore":
        return handleStoreHandle(msg, sender);
      case "folderQueue":
        return queueInfo(sender && sender.tab ? sender.tab.id : null);
      case "folderCancel":
        return cancelQueue(sender && sender.tab ? sender.tab.id : null);
      default:
        return null;
    }
  }
  var BRIDGE_ACTIONS = [
    "folderStatus",
    "folderPick",
    "folderForget",
    "folderPicked",
    "folderStore",
    "folderQueue",
    "folderCancel"
  ];
  function registerSaveHandlers() {
    chrome.windows.onRemoved.addListener(function(windowId) {
      dropWindowJobs(windowId).catch(function() {
      });
    });
    chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
      if (!msg || typeof msg !== "object") return;
      let job;
      if (msg.type === "ce-save") job = handleSave(msg, sender);
      else if (msg.type === "ce-bridge" && BRIDGE_ACTIONS.indexOf(msg.action) >= 0) job = handleBridge(msg, sender);
      else return;
      job.then(sendResponse, function(e) {
        sendResponse({ ok: false, reason: "error", error: String(e && e.message || e) });
      });
      return true;
    });
  }

  // src/background/main.js
  registerSaveHandlers();
  function bytesToBase64(bytes) {
    var chunk = 32768;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }
  function iconKindFromUrl(url) {
    return toolbarKindFromUrl(url);
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
      if (next.serverOn && (!hasTosConsent(next) || !hasFaqConsent(next))) next.serverOn = false;
      saveSettings(next).then(function(saved) {
        commitSavedSettings(saved);
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
