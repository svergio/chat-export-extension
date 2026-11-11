export const FAQ_VERSION = 1;

export const DEFAULT_HOST = '127.0.0.1';

export const DEFAULT_PORT = 8765;

export const WS_PATH = '/ws';

export const PLATFORMS = Object.freeze([
  'chatgpt',
  'grok',
  'grok-x',
  'copilot',
  'claude',
  'qwen',
  'deepseek',
  'perplexity'
]);

export const UI_SKINS = Object.freeze([
  'chatgpt',
  'grok',
  'grok-x',
  'copilot',
  'claude',
  'qwen',
  'deepseek',
  'perplexity'
]);

export const UI_SCHEMES = Object.freeze(['auto', 'light', 'dark']);

export const UI_LOCALES = Object.freeze(['auto', 'en', 'ru']);

export const STORAGE_KEYS = Object.freeze({
  browserId: 'ce.browserId',
  settings: 'ce.settings',
  status: 'ce.bridgeStatus'
});

export const DEFAULT_SETTINGS = Object.freeze({
  serverOn: false,
  host: DEFAULT_HOST,
  port: DEFAULT_PORT,
  apiKey: '',
  browserLabel: 'Chrome',
  platforms: Object.freeze({
    chatgpt: true,
    grok: true,
    'grok-x': true,
    copilot: true,
    claude: true,
    qwen: true,
    deepseek: true,
    perplexity: true
  }),
  allowCreate: true,
  allowDestructive: false,
  allowProjects: true,
  rpcTimeoutS: 60,
  faqVersion: 0,
  ui: Object.freeze({
    skin: 'chatgpt',
    scheme: 'auto',
    locale: 'auto'
  })
});

function normalizeUi(raw) {
  const u = raw && typeof raw === 'object' ? raw : {};
  const skin = UI_SKINS.indexOf(u.skin) >= 0 ? u.skin : 'chatgpt';
  const scheme = UI_SCHEMES.indexOf(u.scheme) >= 0 ? u.scheme : 'auto';
  const locale = UI_LOCALES.indexOf(u.locale) >= 0 ? u.locale : 'auto';
  return { skin: skin, scheme: scheme, locale: locale };
}

export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const platforms = {};
  for (let i = 0; i < PLATFORMS.length; i++) {
    const id = PLATFORMS[i];
    const v = s.platforms && typeof s.platforms === 'object' ? s.platforms[id] : undefined;
    platforms[id] = v === false ? false : true;
  }
  const port = Number(s.port);
  const rpcRaw = Number(s.rpcTimeoutS);
  const host =
    typeof s.host === 'string' && s.host.trim() ? s.host.trim() : DEFAULT_HOST;
  return {
    serverOn: !!s.serverOn,
    host: host,
    port: Number.isFinite(port) && port > 0 && port < 65536 ? Math.floor(port) : DEFAULT_PORT,
    apiKey: typeof s.apiKey === 'string' ? s.apiKey : '',
    browserLabel: typeof s.browserLabel === 'string' && s.browserLabel.trim() ? s.browserLabel.trim() : 'Chrome',
    platforms: platforms,
    allowCreate: s.allowCreate === false ? false : true,
    allowDestructive: !!s.allowDestructive,
    allowProjects: s.allowProjects === false ? false : true,
    rpcTimeoutS:
      Number.isFinite(rpcRaw) && rpcRaw >= 5 && rpcRaw <= 600 ? Math.floor(rpcRaw) : 60,
    faqVersion: Number.isFinite(Number(s.faqVersion)) ? Number(s.faqVersion) : 0,
    ui: normalizeUi(s.ui)
  };
}

export function resolveUiScheme(scheme, prefersDark) {
  if (scheme === 'light') return 'light';
  if (scheme === 'dark') return 'dark';
  return prefersDark ? 'dark' : 'light';
}

export function hasFaqConsent(settings) {
  const s = normalizeSettings(settings);
  return s.faqVersion === FAQ_VERSION;
}

export function canEnableBridge(settings) {
  const s = normalizeSettings(settings);
  return hasFaqConsent(s) && !!s.apiKey.trim();
}

export function platformsEnabledList(settings) {
  const s = normalizeSettings(settings);
  const out = [];
  for (let i = 0; i < PLATFORMS.length; i++) {
    const id = PLATFORMS[i];
    if (s.platforms[id] !== false) out.push(id);
  }
  return out;
}

export function isPlatformEnabledIn(settings, platformId) {
  const s = normalizeSettings(settings);
  return s.platforms[platformId] !== false;
}

export function wsUrl(host, port) {
  if (port === undefined) {
    port = host;
    host = DEFAULT_HOST;
  }
  const h = typeof host === 'string' && host.trim() ? host.trim() : DEFAULT_HOST;
  const p = Number(port);
  const safe = Number.isFinite(p) && p > 0 ? Math.floor(p) : DEFAULT_PORT;
  return 'ws://' + h + ':' + safe + WS_PATH;
}

export function newBrowserId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'b-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 4; i++) bytes[i] = (Math.random() * 256) | 0;
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return 'b-' + hex;
}

/** Extension-owned key (not minted by the server). */
export function generateApiKey() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0;
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return 'ceb_' + hex;
}

export function enrollUrl(host, port) {
  if (port === undefined) {
    port = host;
    host = DEFAULT_HOST;
  }
  const h = typeof host === 'string' && host.trim() ? host.trim() : DEFAULT_HOST;
  const p = Number(port);
  const safe = Number.isFinite(p) && p > 0 ? Math.floor(p) : DEFAULT_PORT;
  return 'http://' + h + ':' + safe + '/enroll';
}

/**
 * @returns {Promise<{ browserId: string, settings: ReturnType<typeof normalizeSettings> }>}
 */
export function loadStored() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([STORAGE_KEYS.browserId, STORAGE_KEYS.settings], function (got) {
      let browserId = got && got[STORAGE_KEYS.browserId];
      if (typeof browserId !== 'string' || !browserId) {
        browserId = newBrowserId();
        chrome.storage.local.set({ [STORAGE_KEYS.browserId]: browserId });
      }
      resolve({
        browserId: browserId,
        settings: normalizeSettings(got && got[STORAGE_KEYS.settings])
      });
    });
  });
}

export function saveSettings(settings) {
  const next = normalizeSettings(settings);
  return new Promise(function (resolve) {
    chrome.storage.local.set({ [STORAGE_KEYS.settings]: next }, function () {
      resolve(next);
    });
  });
}

export function setBridgeStatus(status) {
  return new Promise(function (resolve) {
    chrome.storage.local.set({ [STORAGE_KEYS.status]: status }, function () {
      resolve(status);
    });
  });
}

export function getBridgeStatus() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([STORAGE_KEYS.status], function (got) {
      resolve((got && got[STORAGE_KEYS.status]) || { state: 'offline', detail: '' });
    });
  });
}
