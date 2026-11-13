(() => {
  // src/settings.js
  var DEFAULT_HOST = "127.0.0.1";
  var DEFAULT_PORT = 8765;
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
  function resolveUiScheme(scheme, prefersDark) {
    if (scheme === "light") return "light";
    if (scheme === "dark") return "dark";
    return prefersDark ? "dark" : "light";
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
        let browserId = got && got[STORAGE_KEYS.browserId];
        if (typeof browserId !== "string" || !browserId) {
          browserId = newBrowserId();
          chrome.storage.local.set({ [STORAGE_KEYS.browserId]: browserId });
        }
        const raw = got && got[STORAGE_KEYS.settings];
        const settings = normalizeSettings(raw);
        if (settingsNeedRewrite(raw)) {
          chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
        }
        resolve({
          browserId,
          settings
        });
      });
    });
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
  function toolbarKindToSkinId(kind) {
    if (!kind || kind === "idle") return null;
    if (kind === "x") return "grok-x";
    return kind;
  }

  // src/skinResolve.js
  var SKIN_AUTO_FALLBACK = "chatgpt";
  function resolvedSkinFromUrl(url) {
    const kind = toolbarKindFromUrl(url);
    const mapped = toolbarKindToSkinId(kind);
    const skin = mapped || SKIN_AUTO_FALLBACK;
    if (UI_SKINS.indexOf(skin) >= 0) return skin;
    return SKIN_AUTO_FALLBACK;
  }
  function dataSkinFromSettingAndUrl(uiSkin, url) {
    if (uiSkin === "auto") return resolvedSkinFromUrl(url);
    if (UI_SKINS.indexOf(uiSkin) >= 0) return uiSkin;
    return SKIN_AUTO_FALLBACK;
  }
  function tabUrl(tab) {
    return tab && typeof tab.url === "string" ? tab.url : "";
  }
  function queryActiveTabUrlFromNormalWindow() {
    return new Promise(function(resolve) {
      chrome.windows.getLastFocused({ windowTypes: ["normal"] }, function(win) {
        void chrome.runtime.lastError;
        const query = win && win.id != null ? { active: true, windowId: win.id } : { active: true, lastFocusedWindow: true };
        chrome.tabs.query(query, function(tabs) {
          void chrome.runtime.lastError;
          resolve(tabUrl(tabs && tabs[0]));
        });
      });
    });
  }
  function queryActiveTabUrlForFolder() {
    return queryActiveTabUrlFromNormalWindow();
  }
  async function resolveUiDataSkinForFolder(ui) {
    const setting = ui && ui.skin || "auto";
    if (setting !== "auto") return dataSkinFromSettingAndUrl(setting, "");
    const url = await queryActiveTabUrlForFolder();
    return resolvedSkinFromUrl(url);
  }

  // locales/LN_en.json
  var LN_en_default = {
    "app.title": "Chat Export",
    "app.titleServer": "Chat Export Server",
    "app.loading": "Loading\u2026",
    "status.connected": "Connected",
    "status.offline": "Offline",
    "status.connecting": "Connecting\u2026",
    "status.auth_failed": "Auth failed",
    "label.style": "Style",
    "label.theme": "Theme",
    "label.language": "Language",
    "label.server": "Server",
    "label.gateway": "Gateway for server (MCP)",
    "label.host": "IP / Host",
    "label.port": "Port",
    "label.apiKey": "API key (this browser)",
    "label.gatewayToken": "Browser gateway token (ceb_\u2026)",
    "label.permissions": "Automation permissions",
    "label.allowCreate": "Allow creating and sending chats",
    "label.allowProjects": "Allow project management",
    "label.rpcTimeout": "Operation timeout (sec)",
    "label.browserLabel": "Browser label",
    "label.browserId": "Browser id (per Chrome profile)",
    "label.platforms": "Platforms",
    "label.destructive": "Allow deleting chats and projects",
    "label.exportSchemas": "Export schemas",
    "label.schemaDefault": "Default schema",
    "label.schemaByFormat": "Schema per format",
    "label.schemaInherit": "Use default",
    "label.saveFolder": "Default folder",
    "label.shiftMode": "Shift + click",
    "label.schemaPerFormat": "Per format",
    "schema.inherit": "As default",
    "saveFolder.none": "Not chosen \u2014 will ask on first download",
    "saveFolder.prompt": "Access expired \u2014 restore",
    "saveFolder.unsupported": "Not supported \u2014 Chrome Downloads is used",
    "shiftMode.rebind": "Choose new default folder",
    "shiftMode.saveAs": "Ask where to save (one time)",
    "hint.shiftMode": "Normal click saves silently into the default folder.",
    "schema.chat-export/1": "chat-export \u2014 1",
    "schema.sharegpt/1": "sharegpt \u2014 1",
    "schema.hint": "Formats on the page bar stay the same. Schema controls how MD/JSON/YAML/HTML/PDF text is shaped. Default is chat-export \u2014 1.",
    "format.md": "Markdown",
    "format.yaml": "YAML",
    "format.json": "JSON",
    "format.html": "HTML",
    "format.pdf": "PDF",
    "label.tos": "Legal / Terms of Use",
    "label.faq": "Advanced Mode Terms & FAQ",
    "label.on": "On",
    "label.off": "Off",
    "skin.auto": "Auto (match site)",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
    "skin.qwen": "Qwen",
    "skin.deepseek": "DeepSeek",
    "skin.perplexity": "Perplexity",
    "skin.kimi": "Kimi",
    "skin.zai": "Z.ai",
    "skin.minimax": "MiniMax",
    "skin.janitorai": "JanitorAI",
    "theme.auto": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "lang.auto": "Auto",
    "lang.en": "English",
    "lang.ru": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    "platform.chatgpt": "ChatGPT",
    "platform.grok": "Grok",
    "platform.grok-x": "X Grok",
    "platform.copilot": "Copilot",
    "platform.claude": "Claude",
    "platform.qwen": "Qwen",
    "platform.deepseek": "DeepSeek",
    "platform.perplexity": "Perplexity",
    "platform.kimi": "Kimi",
    "platform.zai": "Z.ai",
    "platform.minimax": "MiniMax",
    "platform.janitorai": "JanitorAI",
    "section.exportSettings": "Export settings",
    "bar.pack": "Pack",
    "bar.pack.folder": "Folder",
    "bar.pack.zip": "Zip",
    "bar.format": "Export format",
    "bar.download": "Download chat",
    "bar.dl.single": "Download {fmt}. Shift: {shiftHint}",
    "bar.dl.multi": "Download {fmt}. Shift: {shiftHint}",
    "toast.saved": "Saved to \xAB{folder}\xBB: {name}",
    "toast.downloaded": "Downloaded: {name}",
    "toast.failed": "Export failed",
    "toast.empty": "Nothing to export yet",
    "bar.shift.rebind": "new default folder",
    "bar.shift.saveAs": "ask where to save",
    "btn.generate": "Generate",
    "btn.rotate": "Rotate",
    "btn.copy": "Copy",
    "btn.continue": "Continue",
    "btn.acceptTos": "Accept & Continue",
    "btn.showExportSettings": "Export settings",
    "btn.hideExportSettings": "Hide export settings",
    "btn.chooseFolder": "Choose folder",
    "btn.changeFolder": "Change folder",
    "btn.forgetFolder": "Forget",
    "btn.showAdvanced": "Advanced",
    "btn.hideAdvanced": "Hide advanced",
    "test.connection": "Test connection",
    "test.ok": "OK \xB7 passed",
    "test.fail": "Failed",
    "test.testing": "Testing\u2026",
    "key.generated": "Key generated",
    "key.generateFailed": "Key generate failed",
    "key.copied": "Key copied",
    "key.copyFailed": "Copy failed",
    "key.placeholder": "Generate ceb_ token\u2026",
    "key.hint": "The extension mints a ceb_ token per browser. Rotating or re-enrolling replaces the previous token \u2014 old ceb_/cek_ keys for this browser stop working. On connect the token is registered on the local server.",
    "key.hintId": "Id:",
    "browser.hint": "Each Chrome profile needs its own ceb_ token and shows up separately on the dashboard Browsers page.",
    "tos.title": "Terms of Use & Risk Disclaimer",
    "tos.lead": "Please read and accept before using Chat Export:",
    "tos.1": 'Open-source software provided "AS IS" under the MIT License, without warranty of any kind.',
    "tos.2": "Account & ToS Risk: Chat Export interacts with third-party web UIs and internal page APIs inside your logged-in browser session. We cannot guarantee that DOM harvesting, internal API requests, or high-frequency exports will not violate provider Terms of Service or result in rate-limiting, temporary suspension, or permanent account ban. Use at your own risk.",
    "tos.3": "Local-Only Privacy: All exports are generated locally in your browser. No chat content, credentials, or analytics are transmitted to external servers.",
    "tos.4": "Provider UI updates can break parsing at any time. If something stops working, please report an issue at https://github.com/svergio/chat-export-extension/issues",
    "tos.agree": "I understand the risks and agree to the Terms of Use",
    "faq.lead": "Advanced Mode Terms (Local MCP Gateway & Agent Automation):",
    "faq.agree": "I understand the automation risks and agree to Advanced Mode Terms",
    "faq.1": "Enabling the Local MCP Gateway allows external AI agents (Cursor, Claude Desktop, LangChain-based local LLM agents, and other MCP clients) connected to 127.0.0.1 to list, read, create, send, and (if enabled) delete chats in your logged-in browser tabs.",
    "faq.2": "Higher Account Restriction Risk: Automated prompt sending (chat_ask / chats_create) and batch operations act directly on your live accounts and carry elevated risk of rate limits, CAPTCHAs, or account suspension by providers.",
    "faq.3": "Local Loopback Only: The extension and server communicate strictly over 127.0.0.1 using per-browser ceb_ tokens. Site passwords and cookies are never extracted or sent to the agent.",
    "faq.4": "Permission Gates: Creating/sending chats can be toggled off, and destructive actions (deleting chats or projects) are disabled by default and require explicit confirmation.",
    "faq.5": 'You are solely responsible for all actions performed by connected agents and for complying with provider Terms of Service. Provided "AS IS" without liability.',
    "faq.6": "If an adapter or RPC command breaks after a provider update, open an issue at https://github.com/svergio/chat-export-extension/issues",
    "folderPage.title": "Chat Export \u2014 save folder",
    "folderPage.pick": "Choose folder",
    "folderPage.grant": "Restore access to \xAB{name}\xBB",
    "folderPage.saved": "Saved to \xAB{name}\xBB",
    "folderPage.cancelled": "Cancelled. Nothing saved.",
    "folderPage.hint": "Choose or create a subfolder, for example Downloads/Chat Export. Chrome does not allow the Downloads, Desktop or Documents folder itself.",
    "folderPage.pending": "The export will be saved as soon as you choose a folder.",
    "folderPage.notPicked": "No folder chosen yet. Pick a subfolder and try again.",
    "folderPage.cancel": "Cancel export",
    "folderPage.pendingMany": "{count} exports will be saved as soon as you choose a folder.",
    "folderPage.savedMany": "Saved {count} exports to \xAB{name}\xBB"
  };

  // locales/LN_ru.json
  var LN_ru_default = {
    "app.title": "Chat Export",
    "app.titleServer": "Chat Export Server",
    "app.loading": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
    "status.connected": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    "status.offline": "\u041E\u0444\u043B\u0430\u0439\u043D",
    "status.connecting": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u2026",
    "status.auth_failed": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
    "label.style": "\u0421\u0442\u0438\u043B\u044C",
    "label.theme": "\u0422\u0435\u043C\u0430",
    "label.language": "\u042F\u0437\u044B\u043A",
    "label.server": "\u0421\u0435\u0440\u0432\u0435\u0440",
    "label.gateway": "\u0428\u043B\u044E\u0437 \u0434\u043B\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (MCP)",
    "label.host": "IP / Host",
    "label.port": "\u041F\u043E\u0440\u0442",
    "label.apiKey": "API-\u043A\u043B\u044E\u0447 (\u044D\u0442\u043E\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440)",
    "label.gatewayToken": "\u0422\u043E\u043A\u0435\u043D \u0448\u043B\u044E\u0437\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 (ceb_\u2026)",
    "label.permissions": "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438",
    "label.allowCreate": "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0443 \u0447\u0430\u0442\u043E\u0432",
    "label.allowProjects": "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438",
    "label.rpcTimeout": "\u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 (\u0441\u0435\u043A)",
    "label.browserLabel": "\u041C\u0435\u0442\u043A\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430",
    "label.browserId": "Id \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 (\u043D\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044C Chrome)",
    "label.platforms": "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B",
    "label.destructive": "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u043E\u0432 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432",
    "label.exportSchemas": "\u0421\u0445\u0435\u043C\u044B \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "label.schemaDefault": "\u0421\u0445\u0435\u043C\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "label.schemaByFormat": "\u0421\u0445\u0435\u043C\u0430 \u043D\u0430 \u0444\u043E\u0440\u043C\u0430\u0442",
    "label.schemaInherit": "\u041A\u0430\u043A \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "label.saveFolder": "\u041F\u0430\u043F\u043A\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "label.shiftMode": "Shift + \u043A\u043B\u0438\u043A",
    "label.schemaPerFormat": "\u041F\u043E \u0444\u043E\u0440\u043C\u0430\u0442\u0430\u043C",
    "schema.inherit": "\u041A\u0430\u043A \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "saveFolder.none": "\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430 \u2014 \u0441\u043F\u0440\u043E\u0441\u0438\u043C \u043F\u0440\u0438 \u043F\u0435\u0440\u0432\u043E\u043C \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0438",
    "saveFolder.prompt": "\u0414\u043E\u0441\u0442\u0443\u043F \u0438\u0441\u0442\u0451\u043A \u2014 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C",
    "saveFolder.unsupported": "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442\u0441\u044F \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438 Chrome",
    "shiftMode.rebind": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u043F\u0430\u043F\u043A\u0443 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "shiftMode.saveAs": "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C, \u043A\u0443\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C (\u0440\u0430\u0437\u043E\u0432\u043E)",
    "hint.shiftMode": "\u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u043A\u043B\u0438\u043A \u0442\u0438\u0445\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0432 \u043F\u0430\u043F\u043A\u0443 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E.",
    "schema.chat-export/1": "chat-export \u2014 1",
    "schema.sharegpt/1": "sharegpt \u2014 1",
    "schema.hint": "\u041A\u043D\u043E\u043F\u043A\u0438 \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F. \u0421\u0445\u0435\u043C\u0430 \u0437\u0430\u0434\u0430\u0451\u0442, \u043A\u0430\u043A \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0442\u0435\u043A\u0441\u0442 MD/JSON/YAML/HTML/PDF. \u0414\u0435\u0444\u043E\u043B\u0442 \u2014 chat-export \u2014 1.",
    "format.md": "Markdown",
    "format.yaml": "YAML",
    "format.json": "JSON",
    "format.html": "HTML",
    "format.pdf": "PDF",
    "label.tos": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F / \u0420\u0438\u0441\u043A\u0438",
    "label.faq": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430 \u0438 FAQ",
    "label.on": "\u0412\u043A\u043B",
    "label.off": "\u0412\u044B\u043A\u043B",
    "skin.auto": "\u0410\u0432\u0442\u043E (\u043F\u043E \u0441\u0430\u0439\u0442\u0443)",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
    "skin.qwen": "Qwen",
    "skin.deepseek": "DeepSeek",
    "skin.perplexity": "Perplexity",
    "skin.kimi": "Kimi",
    "skin.zai": "Z.ai",
    "skin.minimax": "MiniMax",
    "skin.janitorai": "JanitorAI",
    "theme.auto": "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439",
    "theme.light": "\u0421\u0432\u0435\u0442\u043B\u0430\u044F",
    "theme.dark": "\u0422\u0451\u043C\u043D\u0430\u044F",
    "lang.auto": "\u0410\u0432\u0442\u043E",
    "lang.en": "English",
    "lang.ru": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    "platform.chatgpt": "ChatGPT",
    "platform.grok": "Grok",
    "platform.grok-x": "X Grok",
    "platform.copilot": "Copilot",
    "platform.claude": "Claude",
    "platform.qwen": "Qwen",
    "platform.deepseek": "DeepSeek",
    "platform.perplexity": "Perplexity",
    "platform.kimi": "Kimi",
    "platform.zai": "Z.ai",
    "platform.minimax": "MiniMax",
    "platform.janitorai": "JanitorAI",
    "section.exportSettings": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "bar.pack": "\u0423\u043F\u0430\u043A\u043E\u0432\u043A\u0430",
    "bar.pack.folder": "\u041F\u0430\u043F\u043A\u0430",
    "bar.pack.zip": "\u0410\u0440\u0445\u0438\u0432",
    "bar.format": "\u0424\u043E\u0440\u043C\u0430\u0442 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "bar.download": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0447\u0430\u0442",
    "bar.dl.single": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C {fmt}. Shift: {shiftHint}",
    "bar.dl.multi": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C {fmt}. Shift: {shiftHint}",
    "toast.saved": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u0432 \xAB{folder}\xBB: {name}",
    "toast.downloaded": "\u0421\u043A\u0430\u0447\u0430\u043D\u043E: {name}",
    "toast.failed": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F",
    "toast.empty": "\u041F\u043E\u043A\u0430 \u043D\u0435\u0447\u0435\u0433\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "bar.shift.rebind": "\u043D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "bar.shift.saveAs": "\u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C, \u043A\u0443\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
    "btn.generate": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C",
    "btn.rotate": "\u0421\u043C\u0435\u043D\u0438\u0442\u044C",
    "btn.copy": "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "btn.continue": "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    "btn.acceptTos": "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    "btn.showExportSettings": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "btn.hideExportSettings": "\u0421\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "btn.chooseFolder": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "btn.changeFolder": "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "btn.forgetFolder": "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C",
    "btn.showAdvanced": "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435",
    "btn.hideAdvanced": "\u0421\u043A\u0440\u044B\u0442\u044C \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435",
    "test.connection": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435",
    "test.ok": "OK \xB7 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E",
    "test.fail": "\u041E\u0448\u0438\u0431\u043A\u0430",
    "test.testing": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430\u2026",
    "key.generated": "\u041A\u043B\u044E\u0447 \u0441\u043E\u0437\u0434\u0430\u043D",
    "key.generateFailed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043B\u044E\u0447",
    "key.copied": "\u041A\u043B\u044E\u0447 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D",
    "key.copyFailed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "key.placeholder": "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043E\u043A\u0435\u043D ceb_\u2026",
    "key.hint": "\u0422\u043E\u043A\u0435\u043D ceb_ \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u0432 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0438 (\u043D\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0441\u0432\u043E\u0439). \u0420\u043E\u0442\u0430\u0446\u0438\u044F \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u0430\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u043C\u0435\u043D\u044F\u0435\u0442 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0442\u043E\u043A\u0435\u043D \u2014 \u0441\u0442\u0430\u0440\u044B\u0435 ceb_/cek_ \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u044E\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C. \u041F\u0440\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438 \u0442\u043E\u043A\u0435\u043D \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043D\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C \u0441\u0435\u0440\u0432\u0435\u0440\u0435.",
    "key.hintId": "Id:",
    "browser.hint": "\u0423 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F Chrome \u0441\u0432\u043E\u0439 \u0442\u043E\u043A\u0435\u043D ceb_ \u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 Browsers \u0432 \u0434\u0430\u0448\u0431\u043E\u0440\u0434\u0435.",
    "tos.title": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435 \u043E \u0440\u0438\u0441\u043A\u0430\u0445",
    "tos.lead": "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0437\u043D\u0430\u043A\u043E\u043C\u044C\u0442\u0435\u0441\u044C \u0438 \u043F\u0440\u0438\u043C\u0438\u0442\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0435\u0440\u0435\u0434 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435\u043C Chat Export:",
    "tos.1": "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u043D\u043E\u0435 \u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u0435 \u0441 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u043C \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u043C \u043A\u043E\u0434\u043E\u043C \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \xAB\u041A\u0410\u041A \u0415\u0421\u0422\u042C\xBB (AS IS) \u043F\u043E \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 MIT \u0431\u0435\u0437 \u043A\u0430\u043A\u0438\u0445-\u043B\u0438\u0431\u043E \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0439.",
    "tos.2": "\u0420\u0438\u0441\u043A \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0438 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u0432 (ToS): Chat Export \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0441 \u0432\u0435\u0431-\u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430\u043C\u0438 \u0438 \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u043C\u0438 API \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u0432 \u0432\u0430\u0448\u0435\u0439 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043D\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438. \u041C\u044B \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u0443\u0435\u043C, \u0447\u0442\u043E \u0440\u0430\u0437\u0431\u043E\u0440 DOM, \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u043A \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u043C API \u0438\u043B\u0438 \u0447\u0430\u0441\u0442\u044B\u0439 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u0431\u0443\u0434\u0443\u0442 \u0440\u0430\u0441\u0446\u0435\u043D\u0435\u043D\u044B \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430\u043C\u0438 \u043A\u0430\u043A \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435 \u0438\u0445 \u043F\u0440\u0430\u0432\u0438\u043B (Terms of Service) \u0438 \u043D\u0435 \u043F\u0440\u0438\u0432\u0435\u0434\u0443\u0442 \u043A \u043B\u0438\u043C\u0438\u0442\u0430\u043C (rate-limit), \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u043C \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\u043C \u0438\u043B\u0438 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0435 (\u0431\u0430\u043D\u0443) \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430. \u0412\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u043D\u0430 \u0441\u0432\u043E\u0439 \u0441\u0442\u0440\u0430\u0445 \u0438 \u0440\u0438\u0441\u043A.",
    "tos.3": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438 \u043F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0441\u0442\u044C: \u0412\u0441\u0435 \u0444\u0430\u0439\u043B\u044B \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u0444\u043E\u0440\u043C\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0447\u0430\u0442\u043E\u0432, \u043F\u0430\u0440\u043E\u043B\u0438 \u0438 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u044F \u043D\u0438\u043A\u0443\u0434\u0430 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F.",
    "tos.4": "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0432\u0435\u0440\u0441\u0442\u043A\u0438 \u0441\u0430\u0439\u0442\u043E\u0432 \u043C\u043E\u0433\u0443\u0442 \u0432 \u043B\u044E\u0431\u043E\u0439 \u043C\u043E\u043C\u0435\u043D\u0442 \u043D\u0430\u0440\u0443\u0448\u0438\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u043F\u0430\u0440\u0441\u0435\u0440\u0430. \u0415\u0441\u043B\u0438 \u0447\u0442\u043E-\u0442\u043E \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043B\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C, \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0438\u0448\u044C\u044E: https://github.com/svergio/chat-export-extension/issues",
    "tos.agree": "\u042F \u043F\u043E\u043D\u0438\u043C\u0430\u044E \u0440\u0438\u0441\u043A\u0438 \u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F",
    "faq.lead": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430 (\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 MCP-\u0448\u043B\u044E\u0437 \u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0430\u0433\u0435\u043D\u0442\u0430\u043C\u0438):",
    "faq.agree": "\u042F \u043F\u043E\u043D\u0438\u043C\u0430\u044E \u0440\u0438\u0441\u043A\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438 \u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430",
    "faq.1": "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E MCP-\u0448\u043B\u044E\u0437\u0430 \u043F\u043E\u0437\u0432\u043E\u043B\u044F\u0435\u0442 \u0432\u043D\u0435\u0448\u043D\u0438\u043C \u0418\u0418-\u0430\u0433\u0435\u043D\u0442\u0430\u043C (Cursor, Claude Desktop, \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u043C \u0430\u0433\u0435\u043D\u0442\u0430\u043C \u0447\u0435\u0440\u0435\u0437 LangChain \u0438 \u0434\u0440\u0443\u0433\u0438\u043C MCP-\u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C), \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u043C \u043A 127.0.0.1, \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u0438 \u0447\u0430\u0442\u043E\u0432, \u0447\u0438\u0442\u0430\u0442\u044C, \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C, \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438 (\u0435\u0441\u043B\u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E) \u0443\u0434\u0430\u043B\u044F\u0442\u044C \u0447\u0430\u0442\u044B \u0432 \u0432\u0430\u0448\u0438\u0445 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0432\u043A\u043B\u0430\u0434\u043A\u0430\u0445.",
    "faq.2": "\u041F\u043E\u0432\u044B\u0448\u0435\u043D\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430: \u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 (chat_ask / chats_create) \u0438 \u043F\u0430\u043A\u0435\u0442\u043D\u044B\u0435 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0442\u0441\u044F \u043E\u0442 \u043B\u0438\u0446\u0430 \u0432\u0430\u0448\u0435\u0439 \u0443\u0447\u0435\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u0438 \u043D\u0435\u0441\u0443\u0442 \u043F\u043E\u0432\u044B\u0448\u0435\u043D\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u0441\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u043D\u0438\u044F \u0430\u043D\u0442\u0438\u0444\u0440\u043E\u0434-\u0441\u0438\u0441\u0442\u0435\u043C, \u043A\u0430\u043F\u0447\u0438 \u0438\u043B\u0438 \u0431\u0430\u043D\u0430 \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432.",
    "faq.3": "\u0422\u043E\u043B\u044C\u043A\u043E \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0443\u0440: \u041E\u0431\u043C\u0435\u043D \u043C\u0435\u0436\u0434\u0443 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C \u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u0438\u0434\u0435\u0442 \u0441\u0442\u0440\u043E\u0433\u043E \u0447\u0435\u0440\u0435\u0437 127.0.0.1 \u043F\u043E \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u0442\u043E\u043A\u0435\u043D\u0430\u043C ceb_. \u041F\u0430\u0440\u043E\u043B\u0438 \u0438 cookies \u0441\u0430\u0439\u0442\u043E\u0432 \u043D\u0435 \u0438\u0437\u0432\u043B\u0435\u043A\u0430\u044E\u0442\u0441\u044F \u0438 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F \u0430\u0433\u0435\u043D\u0442\u0443.",
    "faq.4": "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u043F\u0440\u0430\u0432: \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0443 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C, \u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u043E\u0432 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0438 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u044F\u0432\u043D\u043E\u0433\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F.",
    "faq.5": "\u0412\u044B \u043D\u0435\u0441\u0435\u0442\u0435 \u043F\u043E\u043B\u043D\u0443\u044E \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0437\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044B\u0445 \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u0438 \u0441\u043E\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u0432 (ToS). \u041F\u041E \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \xAB\u041A\u0410\u041A \u0415\u0421\u0422\u042C\xBB \u0431\u0435\u0437 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u043E\u0432.",
    "faq.6": "\u0415\u0441\u043B\u0438 \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u0438\u043B\u0438 RPC-\u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441\u043B\u043E\u043C\u0430\u043B\u0438\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0441\u0430\u0439\u0442\u0430, \u0441\u043E\u043E\u0431\u0449\u0438\u0442\u0435 \u0432 \u0438\u0448\u044C\u044E: https://github.com/svergio/chat-export-extension/issues",
    "folderPage.title": "Chat Export \u2014 \u043F\u0430\u043F\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F",
    "folderPage.pick": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "folderPage.grant": "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \xAB{name}\xBB",
    "folderPage.saved": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u0432 \xAB{name}\xBB",
    "folderPage.cancelled": "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E. \u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E.",
    "folderPage.hint": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0443, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438/Chat Export. Chrome \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u0435\u0442 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u0430\u043C\u0438 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438, \u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u0441\u0442\u043E\u043B \u0438\u043B\u0438 \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B.",
    "folderPage.pending": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0431\u043E\u0440\u0430 \u043F\u0430\u043F\u043A\u0438.",
    "folderPage.notPicked": "\u041F\u0430\u043F\u043A\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.",
    "folderPage.cancel": "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442",
    "folderPage.pendingMany": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u043E\u0432 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438: {count}. \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u043C \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0431\u043E\u0440\u0430 \u043F\u0430\u043F\u043A\u0438.",
    "folderPage.savedMany": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u043E\u0432: {count} \u0432 \xAB{name}\xBB"
  };

  // src/i18n/index.js
  var LOCALES = Object.freeze(["auto", "en", "ru"]);
  var PACKS = Object.freeze({
    en: LN_en_default,
    ru: LN_ru_default
  });
  function detectBrowserLocale() {
    let raw = "";
    try {
      if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getUILanguage === "function") {
        raw = String(chrome.i18n.getUILanguage() || "");
      }
    } catch (e) {
      raw = "";
    }
    if (!raw && typeof navigator !== "undefined") {
      raw = String(navigator.language || navigator.userLanguage || "");
    }
    const low = raw.toLowerCase();
    if (low.indexOf("ru") === 0) return "ru";
    return "en";
  }
  function resolveLocale(localeSetting) {
    if (localeSetting === "en" || localeSetting === "ru") return localeSetting;
    return detectBrowserLocale();
  }
  function createTranslator(localeCode) {
    const code = localeCode === "ru" ? "ru" : "en";
    const pack = PACKS[code] || PACKS.en;
    const fallback = PACKS.en;
    return function t2(key) {
      const k = String(key || "");
      if (Object.prototype.hasOwnProperty.call(pack, k) && pack[k] != null) return String(pack[k]);
      if (Object.prototype.hasOwnProperty.call(fallback, k) && fallback[k] != null) return String(fallback[k]);
      return k;
    };
  }

  // src/folder/store.js
  var DB_NAME = "chat-export-fs-ext";
  var STORE = "handles";
  var KEY = "default";
  function openDb() {
    return new Promise(function(resolve, reject) {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function() {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function() {
        resolve(req.result);
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  }
  function tx(mode, fn) {
    return openDb().then(function(db) {
      return new Promise(function(resolve, reject) {
        const t2 = db.transaction(STORE, mode);
        const req = fn(t2.objectStore(STORE));
        t2.oncomplete = function() {
          db.close();
          resolve(req && req.result);
        };
        t2.onerror = t2.onabort = function() {
          db.close();
          reject(t2.error);
        };
      });
    });
  }
  function loadHandle() {
    return tx("readonly", function(s) {
      return s.get(KEY);
    }).then(function(h) {
      return h || null;
    });
  }
  function saveHandle(handle) {
    return tx("readwrite", function(s) {
      return s.put(handle, KEY);
    });
  }
  function canPickFolder() {
    const g = typeof globalThis !== "undefined" ? globalThis : self;
    return typeof g.showDirectoryPicker === "function";
  }
  function fsSupported() {
    return canPickFolder();
  }

  // src/folder/main.js
  var MODES = ["pick", "rebind", "grant"];
  var params = new URLSearchParams(location.search);
  var titleEl = document.getElementById("title");
  var leadEl = document.getElementById("lead");
  var hintEl = document.getElementById("hint");
  var actionEl = document.getElementById("action");
  var cancelEl = document.getElementById("cancel");
  var msgEl = document.getElementById("msg");
  var state = {
    mode: MODES.indexOf(params.get("mode")) >= 0 ? params.get("mode") : "pick",
    count: 0,
    tabId: null,
    existing: null,
    grantFailed: false,
    finished: false,
    busy: false
  };
  var t = createTranslator(resolveLocale("auto"));
  function fill(key, vars) {
    let s = t(key);
    for (const k in vars) s = s.replace("{" + k + "}", vars[k] == null ? "" : String(vars[k]));
    return s;
  }
  function say(text, tone) {
    msgEl.textContent = text || "";
    if (tone) msgEl.dataset.tone = tone;
    else delete msgEl.dataset.tone;
  }
  function sendBridge(action, extra) {
    return chrome.runtime.sendMessage(Object.assign({ type: "ce-bridge", action }, extra || {}));
  }
  function closeSoon() {
    setTimeout(function() {
      chrome.windows.getCurrent(function(win) {
        if (!win || win.type === "popup" || state.tabId == null) window.close();
        else chrome.tabs.remove(state.tabId);
      });
    }, 1200);
  }
  function render() {
    if (state.finished) return;
    if (state.count > 0) {
      leadEl.textContent = state.count === 1 ? t("folderPage.pending") : fill("folderPage.pendingMany", { count: state.count });
    } else if (state.existing) {
      leadEl.textContent = t("label.saveFolder") + ": " + state.existing.name;
    }
    leadEl.hidden = !(state.count > 0 || state.existing);
    cancelEl.hidden = state.count === 0;
    const grant = state.mode === "grant" && state.existing && !state.grantFailed;
    hintEl.hidden = !!grant;
    actionEl.textContent = grant ? fill("folderPage.grant", { name: state.existing.name }) : t("folderPage.pick");
    actionEl.hidden = false;
  }
  function savedText(res, name) {
    const n = res && res.saved || 0;
    if (n === 0) return t("label.saveFolder") + ": " + name;
    if (n === 1) return fill("folderPage.saved", { name });
    return fill("folderPage.savedMany", { count: n, name });
  }
  async function finish(name) {
    const res = await sendBridge("folderPicked").catch(function(e) {
      return { ok: false, error: String(e && e.message || e) };
    });
    if (res && res.ok) {
      state.finished = true;
      actionEl.hidden = true;
      cancelEl.hidden = true;
      say(savedText(res, name), "ok");
      closeSoon();
      return;
    }
    await refreshQueue();
    say(String(res && (res.error || res.reason) || "error"), "danger");
  }
  function pickerFailed(e) {
    hintEl.classList.add("is-alert");
    if (e && e.name === "AbortError") say(t("folderPage.notPicked"), "warn");
    else say(String(e && e.message || e), "danger");
  }
  async function requestGranted(handle) {
    const perm = await handle.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") throw new DOMException("permission " + perm, "AbortError");
  }
  async function onPick() {
    const handle = await showDirectoryPicker({ mode: "readwrite", id: "chat-export", startIn: "downloads" });
    await requestGranted(handle);
    await saveHandle(handle);
    state.existing = handle;
    await finish(handle.name);
  }
  async function onGrant() {
    try {
      await requestGranted(state.existing);
    } catch (e) {
      state.grantFailed = true;
      render();
      throw e;
    }
    await finish(state.existing.name);
  }
  function onAction() {
    if (state.busy || state.finished) return;
    state.busy = true;
    actionEl.disabled = true;
    say("");
    const grant = state.mode === "grant" && state.existing && !state.grantFailed;
    (grant ? onGrant() : onPick()).catch(pickerFailed).finally(function() {
      state.busy = false;
      actionEl.disabled = false;
    });
  }
  async function onCancel() {
    await sendBridge("folderCancel").catch(function() {
    });
    state.finished = true;
    actionEl.hidden = true;
    cancelEl.hidden = true;
    say(t("folderPage.cancelled"), "warn");
    closeSoon();
  }
  async function refreshQueue() {
    const q = await sendBridge("folderQueue").catch(function() {
      return null;
    });
    if (q && q.ok) {
      state.count = q.count || 0;
      if (q.mode) state.mode = q.mode;
    }
    render();
  }
  function applyTheme(ui, dataSkin) {
    const root = document.documentElement;
    const scheme = resolveUiScheme(ui.scheme, matchMedia("(prefers-color-scheme: dark)").matches);
    root.lang = resolveLocale(ui.locale);
    root.dataset.skin = dataSkin || SKIN_AUTO_FALLBACK;
    root.dataset.scheme = scheme;
    root.style.colorScheme = scheme;
  }
  async function init() {
    const stored = await loadStored().catch(function() {
      return null;
    });
    const ui = stored && stored.settings && stored.settings.ui || {};
    t = createTranslator(resolveLocale(ui.locale));
    const dataSkin = await resolveUiDataSkinForFolder(ui);
    applyTheme(ui, dataSkin);
    document.title = t("folderPage.title");
    titleEl.textContent = t("folderPage.title");
    hintEl.textContent = t("folderPage.hint");
    document.body.classList.add("is-ready");
    const tab = await chrome.tabs.getCurrent().catch(function() {
      return null;
    });
    state.tabId = tab ? tab.id : null;
    if (!fsSupported()) {
      hintEl.hidden = true;
      say(t("saveFolder.unsupported"), "warn");
      await sendBridge("folderCancel").catch(function() {
      });
      return;
    }
    state.existing = await loadHandle().catch(function() {
      return null;
    });
    actionEl.onclick = onAction;
    cancelEl.textContent = t("folderPage.cancel");
    cancelEl.onclick = onCancel;
    chrome.runtime.onMessage.addListener(function(msg) {
      if (!msg || msg.type !== "ce-folder-queue" || msg.tabId !== state.tabId) return;
      state.count = msg.count || 0;
      if (msg.mode) state.mode = msg.mode;
      render();
    });
    await refreshQueue();
    actionEl.focus();
  }
  init();
})();
