import {
  TOS_VERSION,
  FAQ_VERSION,
  STORAGE_KEYS,
  canEnableBridge,
  enrollUrl,
  generateApiKey,
  hasTosConsent,
  hasFaqConsent,
  isPlatformEnabledIn,
  loadStored,
  normalizeSettings,
  platformsEnabledList,
  saveSettings,
  setBridgeStatus,
  getBridgeStatus,
  wsUrl
} from '../settings.js';

const EXT_VERSION = chrome.runtime.getManifest().version;
const CONTENT_RPC_TYPE = 'chat-export-rpc';
const CONTENT_PING_TYPE = 'chat-export-ping';
const MUTATING_OPS = {
  'chats.create': true,
  'chats.send': true,
  'chats.delete': true,
  'chats.ask_selection': true,
  'chats.side_ask': true
};
const CREATE_OPS = {
  'chats.create': true,
  'chats.send': true,
  'chats.ask_selection': true,
  'chats.side_ask': true
};
const DESTRUCTIVE_OPS = {
  'chats.delete': true,
  'containers.delete': true
};
const PROJECT_OPS = {
  'containers.create': true,
  'containers.delete': true,
  'containers.move_chat': true
};
const PROTOCOL_V = 1;

const PLATFORM_START = {
  chatgpt: 'https://chatgpt.com/',
  grok: 'https://grok.com/',
  'grok-x': 'https://x.com/i/grok',
  copilot: 'https://github.com/copilot',
  claude: 'https://claude.ai/new',
  qwen: 'https://chat.qwen.ai/',
  deepseek: 'https://chat.deepseek.com/',
  perplexity: 'https://www.perplexity.ai/'
};

const PLATFORM_CONTENT = {
  chatgpt: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/chatgpt.js'],
  grok: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/grok.js'],
  'grok-x': ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/grok-x.js'],
  copilot: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/copilot.js'],
  claude: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/claude.js'],
  qwen: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/qwen.js'],
  deepseek: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/deepseek.js'],
  perplexity: ['vendor/fontkit.umd.min.js', 'vendor/pdf-lib.min.js', 'dist/shared.js', 'content/perplexity.js']
};

let socket = null;
let reconnectTimer = null;
let keepaliveTimer = null;
let reconnectAttempt = 0;
let intentionalClose = false;
let currentSettings = normalizeSettings({});
let browserId = '';
let started = false;
let tabsSyncTimer = null;
const KEEPALIVE_ALARM = 'ce-bridge-keepalive';
const KEEPALIVE_MS = 20000;

function sleep(ms) {
  return new Promise(function (resolve) {
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
  const host = (u.hostname || '').toLowerCase();
  const path = u.pathname || '';
  if (platform === 'chatgpt') {
    return host === 'chatgpt.com' || host === 'chat.openai.com' || host.endsWith('.chatgpt.com');
  }
  if (platform === 'grok') {
    return host === 'grok.com' || host.endsWith('.grok.com');
  }
  if (platform === 'grok-x') {
    if (!(host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com') || host.endsWith('.twitter.com'))) {
      return false;
    }
    return /^\/i\/grok(?:\/|$)/i.test(path);
  }
  if (platform === 'copilot') {
    if (!(host === 'github.com' || host.endsWith('.github.com'))) return false;
    return path === '/' || /^\/copilot(?:\/|$)/i.test(path);
  }
  if (platform === 'claude') {
    return host === 'claude.ai' || host.endsWith('.claude.ai');
  }
  if (platform === 'qwen') {
    return host === 'chat.qwen.ai' || host.endsWith('.qwen.ai');
  }
  if (platform === 'deepseek') {
    return host === 'chat.deepseek.com' || host.endsWith('.deepseek.com');
  }
  if (platform === 'perplexity') {
    return host === 'perplexity.ai' || host.endsWith('.perplexity.ai');
  }
  return false;
}

const COPILOT_AUTH_MESSAGE = 'GitHub Copilot requires login at github.com/copilot';

// Logged-out visitors are redirected from /copilot to the marketing page or the login flow.
function isCopilotLanding(url, marketingOnly) {
  if (!url) return false;
  let u;
  try {
    u = new URL(url);
  } catch (e) {
    return false;
  }
  if (!(u.hostname === 'github.com' || u.hostname.endsWith('.github.com'))) return false;
  const re = marketingOnly ? /^\/features\/copilot(?:\/|$)/i : /^\/(?:features\/copilot|login|session|sessions)(?:\/|$)/i;
  return re.test(u.pathname || '');
}

function copilotAuthError() {
  return Object.assign(new Error(COPILOT_AUTH_MESSAGE), {
    code: 'UNAUTHORIZED',
    details: { reason: 'AUTH_REQUIRED' }
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
  return '';
}

function extractChatId(platform, url) {
  if (!url) return '';
  let u;
  try {
    u = new URL(url);
  } catch (e) {
    return '';
  }
  const path = u.pathname || '';
  if (platform === 'chatgpt') {
    let m = path.match(/\/c\/([^/?#]+)/);
    if (m) return m[1];
    m = path.match(/\/g\/[^/]+\/c\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  if (platform === 'claude') {
    const m = path.match(/\/chat\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  if (platform === 'grok' || platform === 'grok-x') {
    const fromQuery = u.searchParams.get('conversationId') || u.searchParams.get('chatId');
    if (fromQuery) return fromQuery;
    const m = path.match(/\/(?:c|chat|conversations?)\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  if (platform === 'copilot') {
    const m = path.match(/\/(?:chat|copilot\/c)\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  if (platform === 'qwen') {
    const m = path.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  if (platform === 'deepseek') {
    const m = path.match(/\/a\/chat\/s\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  if (platform === 'perplexity') {
    const m = path.match(/\/(?:search|session)\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  return '';
}

async function collectTabsSnapshot() {
  const tabs = await chrome.tabs.query({});
  const out = [];
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const platform = platformFromUrl(tab.url || '');
    if (!platform) continue;
    out.push({
      tabId: tab.id,
      platform: platform,
      url: tab.url || '',
      chatId: extractChatId(platform, tab.url || ''),
      title: tab.title || '',
      active: !!tab.active
    });
  }
  return out;
}

function publishStatus(state, detail) {
  return setBridgeStatus({ state: state, detail: detail || '', at: Date.now() });
}

function sendJson(obj) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(obj));
  return true;
}

async function helloPayload() {
  return {
    type: 'hello',
    protocolVersion: PROTOCOL_V,
    key: String(currentSettings.apiKey || ''),
    browserId: browserId,
    browserLabel: currentSettings.browserLabel || 'Chrome',
    extVersion: EXT_VERSION,
    platformsEnabled: platformsEnabledList(currentSettings),
    allowCreate: currentSettings.allowCreate !== false,
    allowDestructive: !!currentSettings.allowDestructive,
    allowProjects: currentSettings.allowProjects !== false,
    tabs: await collectTabsSnapshot()
  };
}

/** Mint key in this browser profile if missing. */
export async function ensureLocalKey() {
  const stored = await loadStored();
  browserId = stored.browserId;
  currentSettings = stored.settings;
  if (currentSettings.apiKey && currentSettings.apiKey.trim()) {
    return { settings: currentSettings, browserId: browserId, created: false };
  }
  const key = generateApiKey();
  currentSettings = normalizeSettings(Object.assign({}, currentSettings, { apiKey: key }));
  await saveSettings(currentSettings);
  return { settings: currentSettings, browserId: browserId, created: true, key: key };
}

/**
 * Push this browser's key into the server pack (POST /enroll).
 * Many browsers → many keys on the server.
 */
export async function enrollKeyToServer(settings, id) {
  const s = normalizeSettings(settings || currentSettings);
  const bid = id || browserId;
  if (!s.apiKey.trim()) throw new Error('api key required');
  if (!bid) throw new Error('browserId required');
  const res = await fetch(enrollUrl(s.host, s.port), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      key: s.apiKey.trim(),
      browserId: bid,
      browserLabel: s.browserLabel || 'Chrome',
      allowCreate: s.allowCreate !== false,
      allowDestructive: !!s.allowDestructive,
      allowProjects: s.allowProjects !== false
    })
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {}
  if (!res.ok) {
    const msg =
      (body && body.error && body.error.message) ||
      'enroll HTTP ' + res.status + ' (is the server running?)';
    throw new Error(msg);
  }
  return body;
}

function settingsPayload() {
  return {
    type: 'settings',
    platformsEnabled: platformsEnabledList(currentSettings),
    allowCreate: currentSettings.allowCreate !== false,
    allowDestructive: !!currentSettings.allowDestructive,
    allowProjects: currentSettings.allowProjects !== false,
    browserLabel: currentSettings.browserLabel || 'Chrome'
  };
}

async function pushTabsIfConnected() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  return sendJson({
    type: 'tabs',
    browserId: browserId,
    tabs: await collectTabsSnapshot()
  });
}

function scheduleTabsSync() {
  if (tabsSyncTimer) clearTimeout(tabsSyncTimer);
  tabsSyncTimer = setTimeout(function () {
    tabsSyncTimer = null;
    pushTabsIfConnected().catch(function () {});
  }, 500);
}

function rpcResult(id, body) {
  if (body && body.ok === true) {
    return { type: 'rpc.result', id: id, ok: true, data: body.data };
  }
  const err = (body && body.error) || { code: 'HOST_ERROR', message: 'empty response' };
  return {
    type: 'rpc.result',
    id: id,
    ok: false,
    error: {
      code: err.code || 'HOST_ERROR',
      message: String(err.message || err.code || 'error'),
      details: err.details
    }
  };
}

function waitTabComplete(tabId) {
  return new Promise(function (resolve) {
    function onUpdated(id, info) {
      if (id !== tabId) return;
      if (info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError || !tab) {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
        return;
      }
      if (tab.status === 'complete') {
        resolve();
        return;
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(function () {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, 15000);
    });
  });
}

// Platforms whose in-page "new chat" navigation is unreliable (full reload / bfcache drops the RPC port).
const CREATE_FRESH_TAB = { 'grok-x': true, copilot: true };

function tabScore(tab, chatId) {
  let score = 0;
  if (chatId && String(tab.url || '').indexOf(chatId) >= 0) score += 100;
  if (!tab.discarded) score += 10;
  if (tab.status === 'complete') score += 4;
  if (tab.active) score += 2;
  return score;
}

async function ensurePlatformTab(platform, args) {
  const chatId = args && args.chatId ? String(args.chatId) : '';
  const tabs = await chrome.tabs.query({});
  let best = null;
  let bestScore = -1;
  let landing = null;
  for (let i = 0; i < tabs.length; i++) {
    if (platform === 'copilot' && !landing && isCopilotLanding(tabs[i].url, true)) landing = tabs[i];
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
  if (!start) throw Object.assign(new Error('unknown platform'), { code: 'BAD_REQUEST' });
  if (landing) {
    await navigateTab(landing.id, start);
    await assertCopilotSession(landing.id);
    return landing.id;
  }
  const tab = await chrome.tabs.create({ url: start, active: false });
  await waitTabComplete(tab.id);
  await sleep(400);
  if (platform === 'copilot') await assertCopilotSession(tab.id);
  return tab.id;
}

function runTabLoad(tabId, start) {
  const loaded = new Promise(function (resolve) {
    let sawLoading = false;
    const timer = setTimeout(done, 20000);
    function done() {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }
    function onUpdated(id, info) {
      if (id !== tabId) return;
      if (info.status === 'loading') sawLoading = true;
      else if (info.status === 'complete' && sawLoading) done();
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
  return start().then(function () {
    return loaded;
  });
}

async function navigateTab(tabId, url) {
  await runTabLoad(tabId, function () {
    return chrome.tabs.update(tabId, { url: url });
  });
  await sleep(400);
}

async function reloadTab(tabId) {
  await runTabLoad(tabId, function () {
    return chrome.tabs.reload(tabId);
  });
  await sleep(400);
}

async function resetTabToStart(tabId, platform) {
  const start = PLATFORM_START[platform];
  if (!start) return;
  const tab = await chrome.tabs.get(tabId);
  if (tab && tab.url === start && tab.status === 'complete') return;
  await navigateTab(tabId, start);
  if (platform === 'copilot') await assertCopilotSession(tabId);
}

function sendMessageAsync(tabId, msg) {
  return new Promise(function (resolve) {
    chrome.tabs.sendMessage(tabId, msg, function (res) {
      const err = chrome.runtime.lastError;
      if (err) {
        resolve({ ok: false, error: { code: 'NOT_FOUND', message: err.message, transport: true } });
        return;
      }
      resolve(res || { ok: false, error: { code: 'HOST_ERROR', message: 'empty response' } });
    });
  });
}

function isNoReceiver(res) {
  return !!(
    res &&
    res.error &&
    res.error.transport &&
    /Receiving end|Could not establish/i.test(res.error.message || '')
  );
}

function isPortDropped(res) {
  return !!(
    res &&
    res.error &&
    res.error.transport &&
    /back\/forward cache|message channel is closed|message port closed/i.test(res.error.message || '')
  );
}

async function pingPlatform(tabId, platform) {
  const res = await sendMessageAsync(tabId, { type: CONTENT_PING_TYPE });
  return !!(res && res.ok && Array.isArray(res.platforms) && res.platforms.indexOf(platform) >= 0);
}

// Old service workers can lack chrome.scripting; a reload makes the manifest content_scripts attach instead.
async function reloadForDeclarativeInject(tabId, platform) {
  try {
    await reloadTab(tabId);
  } catch (e) {
    return 'chrome.scripting unavailable; tab reload failed: ' + ((e && e.message) || e);
  }
  for (let i = 0; i < 10; i++) {
    if (await pingPlatform(tabId, platform)) return '';
    await sleep(300);
  }
  return 'chrome.scripting unavailable; content script not attached after tab reload';
}

async function injectPlatformContent(tabId, platform) {
  const files = PLATFORM_CONTENT[platform];
  if (!files) return 'no content files for ' + platform;
  if (!chrome.scripting || !chrome.scripting.executeScript) return reloadForDeclarativeInject(tabId, platform);
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/page-harvest.js'],
      world: 'MAIN'
    });
  } catch (e) {}
  try {
    await chrome.scripting.executeScript({ target: { tabId: tabId }, files: files });
  } catch (e) {
    return (e && e.message) || String(e);
  }
  try {
    if (chrome.scripting.insertCSS) {
      await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['styles.css'] });
    }
  } catch (e2) {}
  return '';
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
      'content script for ' +
        platform +
        ' not responding in tab ' +
        tabId +
        (injectErr ? ' (inject failed: ' + injectErr + ')' : ' after inject')
    ),
    { code: 'NOT_FOUND' }
  );
}

async function forwardRpc(frame) {
  const id = String(frame.id || '');
  const op = frame.op;
  const platform = frame.platform;
  const args = frame.args || {};

  if (!isPlatformEnabledIn(currentSettings, platform)) {
    return rpcResult(id, {
      ok: false,
      error: { code: 'PLATFORM_DISABLED', message: 'platform ' + platform + ' is disabled' }
    });
  }
  if (CREATE_OPS[op] && currentSettings.allowCreate === false) {
    return rpcResult(id, {
      ok: false,
      error: { code: 'CREATE_DISABLED', message: 'allowCreate is off' }
    });
  }
  if (PROJECT_OPS[op] && currentSettings.allowProjects === false) {
    return rpcResult(id, {
      ok: false,
      error: { code: 'PROJECTS_DISABLED', message: 'allowProjects is off' }
    });
  }
  if (DESTRUCTIVE_OPS[op] && !currentSettings.allowDestructive) {
    return rpcResult(id, {
      ok: false,
      error: { code: 'DESTRUCTIVE_DISABLED', message: 'allowDestructive is off' }
    });
  }

  const msg = { type: CONTENT_RPC_TYPE, id: id, op: op, platform: platform, args: args };
  const retryable = !MUTATING_OPS[op];
  let last = null;
  try {
    const tabId = await ensurePlatformTab(platform, args);
    if (op === 'chats.create' && CREATE_FRESH_TAB[platform]) await resetTabToStart(tabId, platform);
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
            code: 'HOST_ERROR',
            message: platform + ' tab navigated away during ' + op + ' (page reload / bfcache); result unknown'
          }
        };
      }
      break;
    }
  } catch (e) {
    return rpcResult(id, {
      ok: false,
      error: { code: e.code || 'HOST_ERROR', message: e.message || String(e), details: e.details }
    });
  }
  if (last && last.error) delete last.error.transport;
  return rpcResult(id, last || { ok: false, error: { code: 'NOT_FOUND', message: 'content script not ready' } });
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
  } catch (e) {}
}

function startKeepalive() {
  clearKeepalive();
  keepaliveTimer = setInterval(function () {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        sendJson(settingsPayload());
      } catch (e) {}
    } else if (currentSettings.serverOn && canEnableBridge(currentSettings)) {
      scheduleReconnect();
    }
  }, KEEPALIVE_MS);
  try {
    if (chrome.alarms && chrome.alarms.create) {
      chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 1 });
    }
  } catch (e) {}
}

function scheduleReconnect() {
  clearReconnect();
  if (!currentSettings.serverOn || !canEnableBridge(currentSettings)) return;
  const attempt = reconnectAttempt++;
  const delay = Math.min(30000, 500 * Math.pow(2, Math.min(attempt, 6)));
  reconnectTimer = setTimeout(function () {
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
  if (!frame || typeof frame !== 'object') return;

  if (frame.type === 'welcome') {
    reconnectAttempt = 0;
    startKeepalive();
    publishStatus('connected', frame.serverVersion ? 'server ' + frame.serverVersion : '');
    scheduleTabsSync();
    return;
  }
  if (frame.type === 'error') {
    if (frame.code === 'UNAUTHORIZED') {
      publishStatus('auth_failed', frame.message || 'invalid key');
      intentionalClose = true;
      if (socket) socket.close();
      return;
    }
    publishStatus('offline', frame.message || frame.code || 'error');
    return;
  }
  if (frame.type === 'rpc') {
    forwardRpc(frame).then(function (result) {
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
    } catch (e) {}
    socket = null;
  }

  const url = wsUrl(currentSettings.host, currentSettings.port);
  let ws;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    publishStatus('offline', e.message || 'ws open failed');
    scheduleReconnect();
    return;
  }
  socket = ws;

  ws.onopen = function () {
    helloPayload()
      .then(function (payload) {
        sendJson(payload);
      })
      .catch(function () {
        publishStatus('offline', 'hello failed');
      });
  };
  ws.onmessage = function (ev) {
    handleServerMessage(ev.data);
  };
  ws.onerror = function () {
    if (ws === socket) publishStatus('offline', 'connection error');
  };
  ws.onclose = function () {
    if (ws !== socket) return;
    socket = null;
    clearKeepalive();
    if (intentionalClose) {
      if (currentSettings.serverOn) publishStatus('auth_failed', 'unauthorized');
      else publishStatus('offline', '');
      return;
    }
    publishStatus('offline', 'disconnected');
    scheduleReconnect();
  };
}

function connect() {
  clearReconnect();
  const consented = hasTosConsent(currentSettings) && hasFaqConsent(currentSettings);
  if (!currentSettings.serverOn || !consented) {
    clearKeepalive();
    publishStatus('offline', consented ? '' : 'faq consent required');
    return;
  }

  intentionalClose = false;
  publishStatus('connecting', '');

  ensureLocalKey()
    .then(function () {
      // HTTP /enroll can fail under Chrome private-network rules; WS hello still carries the key.
      return enrollKeyToServer(currentSettings, browserId).catch(function () {
        return null;
      });
    })
    .then(function () {
      openSocket();
    })
    .catch(function (err) {
      publishStatus('offline', (err && err.message) || 'connect failed');
      scheduleReconnect();
    });
}

export async function reconnectBridge() {
  reconnectAttempt = 0;
  intentionalClose = false;
  clearReconnect();
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.close();
    } catch (e) {}
    socket = null;
  }
  connect();
  await sleep(1200);
  const status = await getBridgeStatus();
  return {
    ok: true,
    status: status,
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
    } catch (e) {}
    socket = null;
  }
  publishStatus('offline', reason || '');
}

function applySettings(settings) {
  currentSettings = normalizeSettings(settings);
  const consented = hasTosConsent(currentSettings) && hasFaqConsent(currentSettings);
  if (!currentSettings.serverOn || !canEnableBridge(currentSettings)) {
    disconnect(!consented ? 'faq consent required' : '');
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

export function pushSettingsIfConnected() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendJson(settingsPayload());
    scheduleTabsSync();
  }
}

export function getRuntimeState() {
  return {
    browserId: browserId,
    settings: currentSettings,
    socketState: socket ? socket.readyState : -1
  };
}

export async function testConnection() {
  try {
    const ensured = await ensureLocalKey();
    const settings = ensured.settings;
    if (!hasTosConsent(settings) || !hasFaqConsent(settings)) {
      return { ok: false, state: 'offline', detail: 'faq consent required' };
    }
    await enrollKeyToServer(settings, ensured.browserId);
    const url = wsUrl(settings.host, settings.port);
    return await new Promise(function (resolve) {
      let settled = false;
      let ws;
      const timer = setTimeout(function () {
        finish({ ok: false, state: 'offline', detail: 'timeout' });
      }, 5000);
      function finish(result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          if (ws) ws.close();
        } catch (e) {}
        resolve(result);
      }
      try {
        ws = new WebSocket(url);
      } catch (e) {
        finish({ ok: false, state: 'offline', detail: e.message || 'ws open failed' });
        return;
      }
      ws.onopen = function () {
        collectTabsSnapshot()
          .then(function (tabs) {
            ws.send(
              JSON.stringify({
                type: 'hello',
                protocolVersion: PROTOCOL_V,
                key: settings.apiKey,
                browserId: ensured.browserId,
                browserLabel: settings.browserLabel || 'Chrome',
                extVersion: EXT_VERSION,
                platformsEnabled: platformsEnabledList(settings),
                allowCreate: settings.allowCreate !== false,
                allowDestructive: !!settings.allowDestructive,
                allowProjects: settings.allowProjects !== false,
                tabs: tabs
              })
            );
          })
          .catch(function () {
            finish({ ok: false, state: 'offline', detail: 'hello failed' });
          });
      };
      ws.onmessage = function (ev) {
        let frame;
        try {
          frame = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        if (frame && frame.type === 'welcome') {
          finish({ ok: true, state: 'connected', detail: frame.serverVersion || '' });
          return;
        }
        if (frame && frame.type === 'error') {
          finish({
            ok: false,
            state: frame.code === 'UNAUTHORIZED' ? 'auth_failed' : 'offline',
            detail: frame.message || frame.code || ''
          });
        }
      };
      ws.onerror = function () {
        finish({ ok: false, state: 'offline', detail: 'connection error' });
      };
      ws.onclose = function () {
        finish({ ok: false, state: 'offline', detail: 'closed' });
      };
    });
  } catch (err) {
    return { ok: false, state: 'offline', detail: (err && err.message) || 'enroll failed' };
  }
}

export async function rotateLocalKey() {
  const stored = await loadStored();
  browserId = stored.browserId;
  const key = generateApiKey();
  currentSettings = normalizeSettings(Object.assign({}, stored.settings, { apiKey: key }));
  await saveSettings(currentSettings);
  try {
    await enrollKeyToServer(currentSettings, browserId);
  } catch (e) {
    /* server may be offline — key still saved locally */
  }
  return { ok: true, apiKey: key, browserId: browserId, settings: currentSettings };
}

export async function startBridge() {
  if (started) return;
  started = true;
  const stored = await loadStored();
  browserId = stored.browserId;
  currentSettings = stored.settings;
  applySettings(currentSettings);

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes[STORAGE_KEYS.browserId] && changes[STORAGE_KEYS.browserId].newValue) {
      browserId = changes[STORAGE_KEYS.browserId].newValue;
    }
    if (changes[STORAGE_KEYS.settings]) {
      applySettings(changes[STORAGE_KEYS.settings].newValue);
    }
  });

  chrome.tabs.onUpdated.addListener(function (_tabId, changeInfo) {
    if (changeInfo.url || changeInfo.status === 'complete' || changeInfo.title) {
      scheduleTabsSync();
    }
  });
  chrome.tabs.onRemoved.addListener(function () {
    scheduleTabsSync();
  });
  chrome.tabs.onActivated.addListener(function () {
    scheduleTabsSync();
  });

  try {
    if (chrome.alarms && chrome.alarms.onAlarm) {
      chrome.alarms.onAlarm.addListener(function (alarm) {
        if (!alarm || alarm.name !== KEEPALIVE_ALARM) return;
        if (socket && socket.readyState === WebSocket.OPEN) {
          try {
            sendJson(settingsPayload());
          } catch (e) {}
          return;
        }
        if (currentSettings.serverOn && canEnableBridge(currentSettings)) {
          reconnectAttempt = 0;
          connect();
        }
      });
    }
  } catch (e) {}
}

export { TOS_VERSION, FAQ_VERSION, CONTENT_RPC_TYPE };
