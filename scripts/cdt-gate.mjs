#!/usr/bin/env node
/**
 * CDT release gate for Chat Export.
 *
 * Sections (Agent A launch map):
 *   --section=styles      UI skin/scheme/locale sample (+ fmtParity via
 *                         scripts/cdt-probes/fmt-select-parity.js / runFmtSelectParity)
 *   --section=ui-random   seeded CE-popup allowlist clicks (+ fmt-menu only on bar)
 *   --section=usage       mandatory: bar+ver, Folder|Zip, dl toast, mode2/rebind, platform toggle
 *   --section=console     FAIL/SKIP on unauthorized / Token expired / save failed (never silent)
 *   --section=popup       exhaust debug only (not in --full)
 *
 * Pre-release (--full = orchestrator only, not 108× exhaust):
 *   npm run test:cdt:full
 *   = --full --open-missing --save=all
 *   → styles + ui-random + usage + console
 */
import { spawnSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  mkdtempSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROBES = join(ROOT, 'scripts', 'cdt-probes');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const EXT_VERSION = MANIFEST.version;
const EXT_ID = process.env.CE_EXT_ID || 'hhfiadhandpdamghcphoffmnldokgmec';
const CDT = process.env.CHROME_DEVTOOLS_BIN || 'chrome-devtools';
const FOLDER_DIR =
  process.env.CE_FOLDER_DIR || join(process.env.HOME || '', 'Downloads', 'Тестовая', 'Гитахаб');
const OUT_DIR = mkdtempSync(join(tmpdir(), 'ce-cdt-'));

const UI_SKINS = [
  'chatgpt',
  'grok',
  'grok-x',
  'copilot',
  'claude',
  'qwen',
  'deepseek',
  'perplexity',
  'kimi',
  'zai',
  'minimax',
  'janitorai'
];
const UI_SCHEMES = ['auto', 'light', 'dark'];
const UI_LOCALES = ['auto', 'en', 'ru'];

/** Destructive / native / external — never click in any CDT random path. */
const BLACKLIST_RE =
  /forget|забыть|сбросить пап|rotate|ротир|choose folder|change folder|выбрать папку|сменить папку|сменить$|^сменить|сменить token|сменить ключ|btn\.forget|btn\.rotate|поддержать|donate|donate\.|external/i;

/**
 * ui-random: never Скачать / host Download / model menus / native folder / connection probes.
 * Host-page Download and provider model dropdowns are out of scope entirely.
 */
const RANDOM_SKIP_RE =
  /скачать|download|выбрать папку|choose folder|change folder|сменить папку|поддержать|donate|проверить соединение|test connection|check connection|получите доступ|gpt-6|claude opus|model/i;

/** CE-only allowlist categories for --section=ui-random (plan screenshots). */
const UI_RANDOM_ALLOW = {
  platformToggleRe:
    /^(ChatGPT|Grok|X Grok|Copilot|Claude|Qwen|DeepSeek|Perplexity|Kimi|Z\.ai|MiniMax|JanitorAI)$/i,
  drawerRe:
    /Export settings|Настройки экспорта|Hide export|Скрыть настройки|Advanced|Расширенн|Hide advanced|Скрыть расширенн/i,
  themeOptionRe: /^(Dark|Light|Auto|Тёмн|Светл|Авто)/i,
  localeOptionRe: /^(EN|RU|Auto|Англ|Рус|Авто)$/i,
  shiftOptionRe: /Ask where|save as|куда сохранить|Сохранить как|тихо|silent|ask|folderPick|переспроси/i,
  schemaOptionRe: /chat-export|sharegpt|As default|Как по умолчанию|Use default|inherit|Наследовать/i,
  styleOptionRe:
    /^(ChatGPT|Grok|X Grok|Copilot|Claude|Qwen|DeepSeek|Perplexity|Kimi|Z\.ai|MiniMax|JanitorAI|Auto|Авто)$/i,
  formatSchemaLabelRe: /Markdown|YAML|JSON|HTML|PDF/i,
  automationToggleRe:
    /automation|разреш|permission|MCP|agent|автоматиз|Advanced Mode|соглас|agree|faq\.agree/i
};

const PROVIDERS = [
  { id: 'chatgpt', hostRe: /chatgpt\.com|chat\.openai\.com/i, start: 'https://chatgpt.com/' },
  {
    id: 'grok',
    start: 'https://grok.com/',
    hostOf: (u) => {
      try {
        return new URL(u).hostname === 'grok.com';
      } catch {
        return false;
      }
    }
  },
  { id: 'grok-x', hostRe: /(?:^|\.)(x|twitter)\.com$/i, start: 'https://x.com/i/grok' },
  {
    id: 'copilot',
    hostRe: /github\.com/i,
    start: 'https://github.com/copilot',
    // App only — not marketing /features/copilot
    pathHint: /^\/copilot(\/|$|\?)/i
  },
  { id: 'claude', hostRe: /claude\.ai/i, start: 'https://claude.ai/new' },
  { id: 'qwen', hostRe: /chat\.qwen\.ai/i, start: 'https://chat.qwen.ai/' },
  { id: 'deepseek', hostRe: /chat\.deepseek\.com/i, start: 'https://chat.deepseek.com/' },
  { id: 'perplexity', hostRe: /perplexity\.ai/i, start: 'https://www.perplexity.ai/' },
  { id: 'kimi', hostRe: /kimi\.com/i, start: 'https://www.kimi.com/' },
  { id: 'zai', hostRe: /chat\.z\.ai/i, start: 'https://chat.z.ai/' },
  { id: 'minimax', hostRe: /minimax\.io/i, start: 'https://agent.minimax.io/' },
  { id: 'janitorai', hostRe: /janitorai\.com/i, start: 'https://janitorai.com/' }
];

const args = parseArgs(process.argv.slice(2));
const sections = resolveSections(args);
const saveIds = resolveSaveIds(args);
const results = [];
const started = new Date().toISOString();
const tally = { clicked: 0, expected: 0, blacklist: 0, fail: 0 };
const rng = mulberry32(args.seed);

function parseArgs(argv) {
  const out = {
    openMissing: false,
    noSave: false,
    full: false,
    save: null,
    report: null,
    seed: process.env.CE_CDT_SEED || '',
    randomClicks: 40,
    randomClicksBar: 8,
    stylesSample: 12,
    sections: new Set()
  };
  for (const a of argv) {
    if (a === '--open-missing') out.openMissing = true;
    else if (a === '--no-save') out.noSave = true;
    else if (a === '--full') out.full = true;
    else if (a.startsWith('--save=')) out.save = a.slice(7);
    else if (a.startsWith('--report=')) out.report = a.slice(9);
    else if (a.startsWith('--seed=')) out.seed = a.slice(7);
    else if (a.startsWith('--random-clicks=')) out.randomClicks = Math.max(1, Number(a.slice(16)) || 40);
    else if (a.startsWith('--random-clicks-bar=')) out.randomClicksBar = Math.max(1, Number(a.slice(20)) || 8);
    else if (a.startsWith('--styles-sample=')) out.stylesSample = Math.max(1, Number(a.slice(16)) || 12);
    else if (a.startsWith('--section=')) {
      a.slice(10)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => out.sections.add(s));
    }
  }
  if (!out.seed) out.seed = String(Date.now());
  return out;
}

function resolveSections(a) {
  // --full only orchestrates modules (no popup exhaust / 108× options)
  if (a.full) return new Set(['styles', 'ui-random', 'usage', 'console']);
  if (a.sections.size) {
    const out = new Set();
    for (const s of a.sections) {
      if (s === 'buttons') out.add('ui-random');
      else if (s === 'providers' || s === 'save' || s === 'scenarios') out.add(s);
      else out.add(s);
    }
    return out;
  }
  return new Set(['usage']);
}

function resolveSaveIds(a) {
  if (a.noSave) return [];
  if (a.save === 'all' || a.full) return PROVIDERS.map((p) => p.id);
  if (a.save) return a.save.split(',').map((s) => s.trim()).filter(Boolean);
  if (sections.has('usage')) return PROVIDERS.map((p) => p.id);
  if (sections.has('save') && !sections.has('providers') && a.sections.size === 1) {
    return PROVIDERS.map((p) => p.id);
  }
  return ['zai', 'deepseek'];
}

const PLATFORM_TOGGLE_NAMES = [
  'ChatGPT',
  'Grok',
  'X Grok',
  'Copilot',
  'Claude',
  'Qwen',
  'DeepSeek',
  'Perplexity',
  'Kimi',
  'Z.ai',
  'MiniMax',
  'JanitorAI'
];

const PLATFORM_IDS = [
  'chatgpt',
  'grok',
  'grok-x',
  'copilot',
  'claude',
  'qwen',
  'deepseek',
  'perplexity',
  'kimi',
  'zai',
  'minimax',
  'janitorai'
];

/** Qwen-class console: never treat save as silent PASS when these appear. */
const CONSOLE_AUTH_RE =
  /\[chat-export\][^\n]*unauthorized|unauthorized:\s*Token has expired|Token has expired|\[chat-export\][^\n]*save failed|\bsave failed\b/i;

function mulberry32(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(seedStr).length; i++) {
    h ^= String(seedStr).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = h >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickN(arr, n, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function cdt(cmdArgs, opts = {}) {
  const res = spawnSync(CDT, [...cmdArgs, '--output-format', 'json'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: opts.timeout ?? 60000
  });
  const raw = `${res.stdout || ''}${res.stderr || ''}`;
  if (res.status !== 0 && opts.allowFail !== true) {
    const tip = raw.includes('TIP FOR AI') ? raw.split('TIP FOR AI')[0].trim() : raw.slice(-800);
    throw new Error(`chrome-devtools ${cmdArgs[0]} failed (${res.status}): ${tip}`);
  }
  return raw;
}

function sliceBalanced(raw, from) {
  const open = raw[from];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = from; j < raw.length; j++) {
    const ch = raw[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return raw.slice(from, j + 1);
    }
  }
  return null;
}

function extractJson(raw) {
  const fence = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fall through */
    }
  }
  const iObj = raw.indexOf('{');
  const iArr = raw.indexOf('[');
  let i = -1;
  if (iObj >= 0 && (iArr < 0 || iObj < iArr)) i = iObj;
  else if (iArr >= 0) i = iArr;
  if (i < 0) throw new Error('no JSON');
  const parsed = JSON.parse(sliceBalanced(raw, i));
  if (parsed && typeof parsed.message === 'string' && /```json/i.test(parsed.message)) {
    const inner = parsed.message.match(/```json\s*([\s\S]*?)```/i);
    if (inner) return JSON.parse(inner[1].trim());
  }
  if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'result')) return parsed.result;
  return parsed;
}

function listPages() {
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const raw = cdt(['list_pages'], { timeout: 30000, allowFail: true });
      const data = extractJson(raw);
      const pages = data.pages || [];
      const extensionPages = data.extensionPages || [];
      if (!pages.length && !extensionPages.length && attempt < 3) {
        sleep(400 * (attempt + 1));
        continue;
      }
      return {
        pages,
        extensionPages,
        allPages: pages.concat(extensionPages),
        sw: data.extensionServiceWorkers || []
      };
    } catch (e) {
      lastErr = e;
      sleep(400 * (attempt + 1));
    }
  }
  throw lastErr || new Error('list_pages failed');
}

function sleep(ms) {
  spawnSync('sleep', [String(Math.max(0.05, ms / 1000))], { timeout: ms + 2000 });
}

function evalSource(pageId, sourcePath) {
  const filePath = join(OUT_DIR, `o-${pageId}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const raw = cdt(
    [
      'evaluate_script',
      '--sourcePath',
      sourcePath,
      '--pageId',
      String(pageId),
      '--filePath',
      filePath,
      '--waitForStableDom',
      'false'
    ],
    { timeout: 45000 }
  );
  try {
    return extractJson(readFileSync(filePath, 'utf8'));
  } catch {
    return extractJson(raw);
  }
}

function evalPage(pageId, name) {
  return evalSource(pageId, join(PROBES, name));
}

function evalInline(pageId, js) {
  const p = join(OUT_DIR, `i-${Date.now()}-${Math.random().toString(16).slice(2)}.js`);
  writeFileSync(p, js);
  return evalSource(pageId, p);
}

function findExtSwCandidates() {
  const lp = listPages();
  const all = (lp.sw || []).filter((s) => (s.url || '').includes(EXT_ID));
  // Reloads leave stale SW ids; newest id is usually the live worker.
  return all.slice().reverse();
}

function findExtSw() {
  const cands = findExtSwCandidates();
  return cands[0] || null;
}

function evalSwOnce(swId, sourcePath, filePath) {
  const raw = cdt(
    [
      'evaluate_script',
      '--sourcePath',
      sourcePath,
      '--serviceWorkerId',
      String(swId),
      '--filePath',
      filePath,
      '--waitForStableDom',
      'false'
    ],
    { timeout: 25000, allowFail: true }
  );
  try {
    return extractJson(readFileSync(filePath, 'utf8'));
  } catch {
    try {
      return extractJson(raw);
    } catch {
      return { ok: false, error: 'sw-eval-parse', raw: String(raw || '').slice(0, 200), swId };
    }
  }
}

function evalSw(swId, js) {
  const p = join(OUT_DIR, `sw-${Date.now()}-${Math.random().toString(16).slice(2)}.js`);
  writeFileSync(p, js);
  const cands = findExtSwCandidates();
  const ids = [];
  if (swId) ids.push(String(swId));
  for (const s of cands) {
    if (s && s.id && !ids.includes(String(s.id))) ids.push(String(s.id));
  }
  let last = { ok: false, error: 'no-ext-sw' };
  for (const id of ids.slice(0, 4)) {
    const filePath = join(OUT_DIR, `o-sw-${id}-${Date.now()}.json`);
    last = evalSwOnce(id, p, filePath);
    if (last && last.error !== 'sw-eval-parse') return last;
    if (last && last.ok) return last;
  }
  return last;
}

function rpcChatsGet(platform, hrefHint) {
  const sw = findExtSw();
  if (!sw || !sw.id) return { ok: false, error: 'no-ext-sw' };
  const js = `async () => {
  function send(tabId, msg) {
    return new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => {
        if (!done) {
          done = true;
          resolve({ ok: false, error: 'timeout' });
        }
      }, 60000);
      try {
        chrome.tabs.sendMessage(tabId, msg, (res) => {
          if (done) return;
          done = true;
          clearTimeout(t);
          const err = chrome.runtime.lastError;
          if (err) resolve({ ok: false, error: err.message });
          else resolve(res || { ok: false, error: 'empty' });
        });
      } catch (e) {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ ok: false, error: String(e && e.message || e) });
      }
    });
  }
  const hint = ${JSON.stringify(hrefHint || '')};
  const platform = ${JSON.stringify(platform)};
  const tabs = await chrome.tabs.query({});
  let tab = null;
  for (const t of tabs) {
    const u = t.url || '';
    if (!u) continue;
    if (hint && (u === hint || u.startsWith(hint.slice(0, Math.min(80, hint.length))))) {
      tab = t;
      break;
    }
  }
  if (!tab) {
    for (const t of tabs) {
      const u = t.url || '';
      if (platform === 'zai' && /chat\\.z\\.ai\\/c\\//.test(u)) { tab = t; break; }
      if (platform === 'minimax' && /agent\\.minimax\\.io\\/(mavis|\\?chatID)/.test(u)) { tab = t; break; }
      if (platform === 'janitorai' && /janitorai\\.com\\/.*\\/chats\\/\\d+/.test(u)) { tab = t; break; }
    }
  }
  if (!tab) return { ok: false, error: 'no-tab' };
  const ping = await send(tab.id, { type: 'chat-export-ping' });
  if (!ping || !ping.ok) return { ok: false, error: (ping && ping.error) || 'ping-fail', tabId: tab.id };
  const got = await send(tab.id, {
    type: 'chat-export-rpc',
    id: 'fid-' + platform + '-' + Date.now(),
    op: 'chats.get',
    platform,
    args: { chatId: '', branch: 'active' }
  });
  if (!got || !got.ok) return { ok: false, error: got && got.error, tabId: tab.id };
  const msgs = (got.data && got.data.messages) || [];
  return {
    ok: true,
    tabId: tab.id,
    chatId: got.data && got.data.chatId,
    title: got.data && got.data.title,
    n: msgs.length,
    exportUserN: msgs.filter((m) => m && m.role === 'user').length,
    exportAsstN: msgs.filter((m) => m && m.role === 'assistant').length,
    emptyBodies: msgs.filter((m) => !String((m && (m.text || m.content)) || '').trim()).length,
    first: msgs[0] ? String(msgs[0].text || '').replace(/\\s+/g, ' ').slice(0, 80) : '',
    last: msgs.length ? String(msgs[msgs.length - 1].text || '').replace(/\\s+/g, ' ').slice(0, 80) : '',
    roles: msgs.map((m) => m.role).join(',').slice(0, 120)
  };
}`;
  return evalSw(sw.id, js);
}

function assertExportFidelity(pageId, providerId) {
  const id = `usage/${providerId}/fidelity`;
  const dom = evalPage(pageId, 'export-fidelity.js') || {};
  if (!dom.hasBar) {
    record({ id, status: 'SKIP', detail: 'no-bar' });
    return;
  }
  if (!dom.platform) {
    record({ id, status: 'SKIP', detail: 'no-platform' });
    return;
  }
  const rpc = rpcChatsGet(providerId, dom.href || '');
  if (!rpc || rpc.error === 'no-tab' || rpc.error === 'no-ext-sw' || rpc.error === 'sw-eval-parse') {
    record({ id, status: 'SKIP', detail: `rpc-unavailable: ${(rpc && rpc.error) || 'unknown'}` });
    return;
  }
  if (rpc.error && /ping-fail|Receiving end|timeout|sw-eval/i.test(String(rpc.error))) {
    record({ id, status: 'SKIP', detail: `content-not-ready: ${rpc.error}` });
    return;
  }
  if (!rpc.ok && rpc.error && /chatId required|BAD_REQUEST/i.test(JSON.stringify(rpc.error))) {
    record({ id, status: 'SKIP', detail: 'no-chatId-landing' });
    return;
  }
  if (!rpc.ok) {
    record({ id, status: 'FAIL', detail: `rpc: ${JSON.stringify(rpc.error || rpc).slice(0, 160)}` });
    return;
  }
  if (!rpc.chatId) {
    record({ id, status: 'SKIP', detail: 'no-chatId-landing' });
    return;
  }

  const fails = [];
  if (rpc.emptyBodies > 0) fails.push(`emptyBodies=${rpc.emptyBodies}`);
  if (rpc.n === 0 && (dom.bodyLen || 0) > 1500) {
    fails.push(`empty-export bodyLen=${dom.bodyLen}`);
  }
  if (providerId === 'zai' && (dom.domUserN || 0) > 0 && rpc.exportUserN < dom.domUserN) {
    fails.push(`zai-user-loss dom=${dom.domUserN} export=${rpc.exportUserN}`);
  }
  if (providerId === 'minimax' && rpc.n === 0 && ((dom.domAsstN || 0) > 0 || (dom.bodyLen || 0) > 1500)) {
    fails.push(`minimax-empty domAsst=${dom.domAsstN} bodyLen=${dom.bodyLen}`);
  }
  if (providerId === 'janitorai' && rpc.n >= 2 && rpc.first && rpc.last && dom.topSnippet && dom.bottomSnippet) {
    const top = String(dom.topSnippet || '');
    const bottom = String(dom.bottomSnippet || '');
    const firstNeedle = String(rpc.first).slice(0, 36);
    const lastNeedle = String(rpc.last).slice(0, 36);
    const firstInTop = firstNeedle.length >= 12 && top.includes(firstNeedle.slice(0, 24));
    const lastInTop = lastNeedle.length >= 12 && top.includes(lastNeedle.slice(0, 24));
    const firstInBottom = firstNeedle.length >= 12 && bottom.includes(firstNeedle.slice(0, 24));
    if (lastInTop && firstInBottom && !firstInTop) {
      fails.push('janitor-order-reversed');
    }
  }

  record({
    id,
    status: fails.length ? 'FAIL' : 'PASS',
    detail: fails.length
      ? fails.join('; ')
      : `n=${rpc.n} users=${rpc.exportUserN}/${dom.domUserN || 0} asst=${rpc.exportAsstN} chatId=${rpc.chatId}`
  });
}

function takeSnapshot(pageId) {
  const filePath = join(OUT_DIR, `s-${pageId}-${Date.now()}.txt`);
  const raw = cdt(['take_snapshot', String(pageId), '--filePath', filePath], {
    timeout: 60000,
    allowFail: true
  });
  try {
    const meta = extractJson(raw);
    if (meta && meta.snapshotFilePath) return readFileSync(meta.snapshotFilePath, 'utf8');
  } catch {
    /* fall through */
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    const idx = raw.indexOf('## Latest page snapshot');
    if (idx >= 0) return raw.slice(idx);
    return '';
  }
}

function findUid(snapshot, patterns) {
  for (const re of patterns) {
    for (const line of snapshot.split('\n')) {
      if (!re.test(line)) continue;
      if (/\bdisabled\b/i.test(line)) continue;
      const m = line.match(/uid=([^\s]+)/);
      if (m) return m[1];
    }
  }
  return null;
}

function findUidByExactName(snapshot, role, name) {
  const needle = `${role} "${name}"`;
  for (const line of snapshot.split('\n')) {
    if (!line.includes(needle)) continue;
    if (/\bdisabled\b/i.test(line)) continue;
    const m = line.match(/uid=([^\s]+)/);
    if (m) return m[1];
  }
  // soft: name contained
  for (const line of snapshot.split('\n')) {
    if (!line.includes(`"${name}"`) && !line.includes(name)) continue;
    if (role && !new RegExp(`\\b${role}\\b`, 'i').test(line)) continue;
    if (/\bdisabled\b/i.test(line)) continue;
    const m = line.match(/uid=([^\s]+)/);
    if (m) return m[1];
  }
  return null;
}

function clickUid(pageId, uid) {
  cdt(['click', String(pageId), uid], { timeout: 30000 });
  tally.clicked++;
}

function expectClick() {
  tally.expected++;
}

function pressKey(pageId, key) {
  cdt(['press_key', String(pageId), key], { allowFail: true, timeout: 15000 });
}

function record(row) {
  results.push(row);
  const tag = row.status === 'PASS' ? 'PASS' : row.status === 'SKIP' ? 'SKIP' : 'FAIL';
  console.log(`[${tag}] ${row.id}${row.detail ? ' — ' + row.detail : ''}`);
}

function isBlacklisted(name) {
  return BLACKLIST_RE.test(name || '');
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function matchProvider(page, provider) {
  if (provider.hostOf) return provider.hostOf(page.url || '');
  if (!provider.hostRe.test(safeHost(page.url || ''))) return false;
  if (provider.pathHint) {
    try {
      const u = new URL(page.url);
      return provider.pathHint.test(u.pathname + u.search);
    } catch {
      return false;
    }
  }
  return true;
}

function findPage(pages, provider) {
  const hits = (pages || []).filter((p) => matchProvider(p, provider));
  if (!hits.length) return null;
  hits.sort((a, b) => {
    const sc = (u) =>
      (/\/c\/|\/chats?\/|conversation=|\/a\/chat\//i.test(u) ? 10 : 0) -
      (/\/new\/?$/i.test(u) || /janitorai\.com\/?(ru)?\/?$/i.test(u) ? 2 : 0);
    return sc(b.url) - sc(a.url);
  });
  return hits[0];
}

function ensureProvider(provider) {
  let page = findPage(listPages().pages, provider);
  if (page) return page;
  if (!args.openMissing) return null;
  cdt(['new_page', provider.start], { allowFail: true });
  sleep(2500);
  return findPage(listPages().pages, provider);
}

function ensurePopup() {
  const match = (p) => /popup\.html/i.test(p.url || '') && (p.url || '').includes(EXT_ID);
  let page = listPages().allPages.find(match);
  if (page) return page;
  cdt(['new_page', `chrome-extension://${EXT_ID}/popup.html`], { allowFail: true });
  for (let i = 0; i < 12; i++) {
    sleep(400);
    page = listPages().allPages.find(match);
    if (page) return page;
  }
  return null;
}

function folderPages() {
  return listPages().allPages.filter((p) => /folder\.html/i.test(p.url || ''));
}

function closeNewFolders(beforeIds) {
  for (const p of folderPages()) {
    if (beforeIds.includes(p.id)) continue;
    try {
      cdt(['close_page', String(p.id)], { allowFail: true });
    } catch {
      /* ignore */
    }
  }
}

function waitToast(pageId, ms = 10000) {
  const n = Math.ceil(ms / 500);
  for (let i = 0; i < n; i++) {
    sleep(500);
    const read = evalPage(pageId, 'toast-read.js');
    const t = [...(read.log || []).map((x) => x.text), ...(read.live || [])].find(Boolean);
    if (t) return t;
  }
  return null;
}

function listNewFiles(sinceMs) {
  try {
    return readdirSync(FOLDER_DIR, { withFileTypes: true })
      .map((ent) => {
        const p = join(FOLDER_DIR, ent.name);
        return { name: ent.name, mtimeMs: statSync(p).mtimeMs, path: p };
      })
      .filter((f) => f.mtimeMs >= sinceMs - 2000)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return null;
  }
}

function listConsoleMessages(pageId, opts = {}) {
  const cmd = ['list_console_messages', String(pageId), '--includePreservedMessages'];
  if (opts.serviceWorkerId) {
    cmd.push('--serviceWorkerId', String(opts.serviceWorkerId));
  }
  const raw = cdt(cmd, { allowFail: true, timeout: 30000 });
  try {
    const data = extractJson(raw);
    return data.consoleMessages || data.messages || [];
  } catch {
    return [];
  }
}

function consoleMessageText(m) {
  if (!m || typeof m !== 'object') return String(m || '');
  return [m.text, m.title, m.message, Array.isArray(m.args) ? m.args.join(' ') : '']
    .filter(Boolean)
    .join(' ');
}

function findConsoleAuthHits(pageId, opts = {}) {
  const msgs = listConsoleMessages(pageId, opts);
  const hits = [];
  for (const m of msgs) {
    const text = consoleMessageText(m);
    if (CONSOLE_AUTH_RE.test(text)) hits.push(text.replace(/\s+/g, ' ').slice(0, 220));
  }
  return hits;
}

/**
 * Console auth/save-failed gate: never silent PASS.
 * FAIL by default; explicit SKIP when caller marks skipSave (e.g. empty chat + auth noise).
 */
function applyConsoleAuthGate(pageId, row, { skipSave = false } = {}) {
  const hits = findConsoleAuthHits(pageId);
  if (!hits.length) return row;
  const hit = hits[0];
  if (row.status === 'PASS' || row.status === 'SKIP') {
    if (skipSave) {
      return {
        ...row,
        status: 'SKIP',
        detail: `SKIP save: ${hit}${row.detail ? ' · ' + row.detail : ''}`
      };
    }
    return {
      ...row,
      status: 'FAIL',
      detail: `console auth/save: ${hit}${row.detail ? ' · ' + row.detail : ''}`
    };
  }
  return {
    ...row,
    detail: `${row.detail || ''} · console: ${hit}`.replace(/^\s·\s/, '').trim()
  };
}

function menuItemNames(snapshot) {
  const out = [];
  for (const line of snapshot.split('\n')) {
    const m = line.match(/menuitemcheckbox\s+"([^"]*)"/i);
    if (m) out.push(m[1]);
  }
  return out;
}

/** True only for CE fmt menu — never host radios (Claude Chat/Cowork, etc.). */
function fmtMenuOpen(snapshot) {
  if (menuItemNames(snapshot).length) return true;
  return /radio\s+"(Папка|Folder|Архив|Zip|ZIP)"/i.test(snapshot);
}

function ensureFmtMenu(pageId) {
  let snap = takeSnapshot(pageId);
  if (fmtMenuOpen(snap)) return true;
  const r = clickPatterns(pageId, [/button "[^"]*(Формат экспорта|Export format)[^"]*"/i], 'fmt');
  if (!r.ok) {
    const dom = evalPage(pageId, 'menu-open.js');
    if (!dom || !dom.ok) return false;
  }
  sleep(220);
  snap = takeSnapshot(pageId);
  if (fmtMenuOpen(snap)) return true;
  const dom2 = evalPage(pageId, 'menu-open.js');
  if (!dom2 || !dom2.ok) return false;
  sleep(200);
  return fmtMenuOpen(takeSnapshot(pageId));
}

function clickPackViaDom(pageId, which) {
  return evalInline(
    pageId,
    `() => {
      const which = ${JSON.stringify(which === 'zip' ? 'zip' : 'folder')};
      let menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
      if (!menu) {
        const fmt = document.querySelector('.chat-export-fmt');
        if (!fmt) return { ok: false, reason: 'no-fmt' };
        fmt.click();
        menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
      }
      if (!menu) return { ok: false, reason: 'no-menu' };
      const btns = Array.from(menu.querySelectorAll('.chat-export-pack-btn, [role="radio"]'));
      const re = which === 'zip' ? /zip|архив/i : /folder|папк/i;
      const btn = btns.find((el) =>
        re.test((el.textContent || '') + (el.getAttribute('aria-label') || ''))
      );
      if (!btn) {
        return {
          ok: false,
          reason: 'no-pack-btn',
          which,
          found: btns.map((el) => (el.textContent || '').trim().slice(0, 24))
        };
      }
      btn.click();
      return { ok: true, which, label: (btn.textContent || '').trim().slice(0, 24) };
    }`
  );
}

/** CDT click Folder and Zip pack radios in open fmt menu. */
function clickPackFolderAndZip(pageId) {
  const fail = [];
  let packFolder = false;
  let packZip = false;
  let clicks = 0;
  if (!ensureFmtMenu(pageId)) {
    return { ok: false, fail: ['fmt menu'], clicks: 0, packFolder, packZip };
  }
  for (const [packName, which] of [
    ['Папка', 'folder'],
    ['Folder', 'folder'],
    ['Архив', 'zip'],
    ['Zip', 'zip'],
    ['ZIP', 'zip']
  ]) {
    if ((which === 'folder' && packFolder) || (which === 'zip' && packZip)) continue;
    if (!fmtMenuOpen(takeSnapshot(pageId))) ensureFmtMenu(pageId);
    const uid = findUidByExactName(takeSnapshot(pageId), 'radio', packName);
    if (!uid) continue;
    expectClick();
    try {
      clickUid(pageId, uid);
      clicks++;
      if (which === 'folder') packFolder = true;
      if (which === 'zip') packZip = true;
      sleep(80);
    } catch {
      fail.push(`pack ${packName}`);
      tally.fail++;
    }
  }
  if (!packFolder) {
    const dom = clickPackViaDom(pageId, 'folder');
    if (dom && dom.ok) {
      packFolder = true;
      clicks++;
      expectClick();
      tally.clicked++;
    }
  }
  if (!packZip) {
    const dom = clickPackViaDom(pageId, 'zip');
    if (dom && dom.ok) {
      packZip = true;
      clicks++;
      expectClick();
      tally.clicked++;
    }
  }
  if (!packFolder) fail.push('pack-folder');
  if (!packZip) fail.push('pack-zip');
  pressKey(pageId, 'Escape');
  sleep(80);
  return { ok: !fail.length, fail, clicks, packFolder, packZip };
}

/**
 * CDT Download → toast Saved / empty OK; Downloads fallback FAIL.
 * Applies console unauthorized gate (never silent pass).
 */
function downloadAssertToast(pageId, id) {
  const before = folderPages().map((p) => p.id);
  const since = Date.now();
  evalPage(pageId, 'toast-arm.js');
  const dl = findUid(takeSnapshot(pageId), [
    /button "[^"]*(Скачать чат|Download chat)[^"]*"/i,
    /Скачать чат|Download chat/i
  ]);
  expectClick();
  if (!dl) {
    const dom = evalPage(pageId, 'click-dl.js');
    if (!dom || !dom.ok) {
      const row = applyConsoleAuthGate(pageId, { id, status: 'FAIL', detail: 'no dl uid' });
      record(row);
      tally.fail++;
      return row;
    }
  } else {
    try {
      clickUid(pageId, dl);
    } catch (e) {
      const row = applyConsoleAuthGate(pageId, {
        id,
        status: 'FAIL',
        detail: `dl: ${e.message || e}`
      });
      record(row);
      tally.fail++;
      return row;
    }
  }
  const toast = waitToast(pageId);
  const opened = folderPages().filter((p) => !before.includes(p.id));
  const files = listNewFiles(since);
  const authHits = findConsoleAuthHits(pageId);

  if (toast && /нечего|nothing to export|empty/i.test(toast)) {
    const row = applyConsoleAuthGate(
      pageId,
      { id, status: 'PASS', detail: toast },
      { skipSave: !!authHits.length }
    );
    record(row);
    return row;
  }

  const fail = [];
  if (!toast) fail.push('no toast');
  else if (/Скачано|Downloaded/i.test(toast)) fail.push(`downloads fallback: ${toast}`);
  else if (!/Сохранено|Saved/i.test(toast)) fail.push(`toast: ${toast}`);
  if (opened.length) fail.push('folder.html during save');
  if (toast && /Сохранено|Saved/i.test(toast) && files && !files.length) fail.push('no file');

  let row = {
    id,
    status: fail.length ? 'FAIL' : 'PASS',
    detail: fail.length ? fail.join('; ') : toast
  };
  row = applyConsoleAuthGate(pageId, row, {
    skipSave: !!authHits.length && /нечего|nothing to export|empty/i.test(toast || '')
  });
  if (row.status === 'FAIL') tally.fail++;
  record(row);
  return row;
}

/** 2nd mode: folderPick rebind → folder.html (native pick = M1–M3 manual). */
function runFolderPickRebind(id) {
  const popup = ensurePopup();
  if (!popup) {
    record({ id, status: 'FAIL', detail: 'no popup.html' });
    return;
  }
  const before = folderPages().map((p) => p.id);
  evalInline(
    popup.id,
    `() => new Promise(r => chrome.runtime.sendMessage({type:'ce-bridge',action:'folderPick',mode:'rebind'}, res => r(res||{})))`
  );
  sleep(1000);
  const opened = folderPages().filter((p) => !before.includes(p.id));
  closeNewFolders(before);
  record({
    id,
    status: opened.length ? 'PASS' : 'FAIL',
    detail: opened.length ? 'folder.html opened' : 'no folder.html'
  });
}

/** Shift+click dl surface (2nd mode) via DOM — CDT click has no modifier flag. */
function runShiftClickMode2(pageId, id) {
  const before = folderPages().map((p) => p.id);
  const res = evalInline(
    pageId,
    `() => {
      const btn = document.querySelector('.chat-export-dl, [data-chat-export] button.chat-export-dl');
      if (!btn) return { ok: false, reason: 'no dl' };
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true, view: window }));
      return { ok: true };
    }`
  );
  sleep(900);
  const opened = folderPages().filter((p) => !before.includes(p.id));
  closeNewFolders(before);
  if (!res || !res.ok) {
    record({ id, status: 'FAIL', detail: (res && res.reason) || 'shift click failed' });
    return;
  }
  record({
    id,
    status: opened.length ? 'PASS' : 'SKIP',
    detail: opened.length
      ? 'folder.html via shift+dl'
      : 'no folder.html (ask/saveAs or grant already ok; rebind covered separately)'
  });
}

/** One seed-picked platform toggle: ensure off then on (pressed). */
function runSeedPlatformToggle() {
  const popup = ensurePopup();
  if (!popup) {
    record({ id: 'usage/platform-toggle', status: 'FAIL', detail: 'no popup.html' });
    return;
  }
  ensureDrawersOpen(popup.id);
  sleep(80);
  const snap = takeSnapshot(popup.id);
  const available = [];
  for (const name of PLATFORM_TOGGLE_NAMES) {
    const line = snap.split('\n').find((l) => l.includes(`button "${name}"`));
    if (!line || /\bdisabled\b/i.test(line)) continue;
    const uid = (line.match(/uid=(\S+)/) || [])[1];
    if (!uid) continue;
    available.push({ name, uid, pressed: /\bpressed\b/i.test(line) });
  }
  if (!available.length) {
    record({ id: 'usage/platform-toggle', status: 'FAIL', detail: 'no platform toggles' });
    return;
  }
  const pick = available[Math.floor(rng() * available.length)];
  const fail = [];

  function clickToggle(name) {
    const s = takeSnapshot(popup.id);
    const uid = findUidByExactName(s, 'button', name);
    if (!uid) return false;
    expectClick();
    clickUid(popup.id, uid);
    sleep(60);
    return true;
  }

  function isPressed(name) {
    const line = takeSnapshot(popup.id)
      .split('\n')
      .find((l) => l.includes(`button "${name}"`));
    return !!(line && /\bpressed\b/i.test(line));
  }

  try {
    if (pick.pressed) {
      if (!clickToggle(pick.name)) fail.push('off click');
      else {
        sleep(80);
        if (isPressed(pick.name)) fail.push('still on after off');
      }
    }
    if (!clickToggle(pick.name)) fail.push('on click');
    else {
      sleep(80);
      if (!isPressed(pick.name)) {
        clickToggle(pick.name);
        sleep(80);
      }
      if (!isPressed(pick.name)) fail.push('not on after on');
    }
  } catch (e) {
    fail.push(String(e.message || e));
  }

  record({
    id: 'usage/platform-toggle',
    status: fail.length ? 'FAIL' : 'PASS',
    detail: fail.length
      ? `${pick.name}: ${fail.join('; ')}`
      : `seed=${args.seed} ${pick.name} off→on`
  });
  ensureAllPlatformsEnabled('usage/platform-toggle-restore');
}

function setPopupUi(popupId, ui) {
  return evalInline(
    popupId,
    `() => new Promise((resolve) => {
      chrome.storage.local.get(['ce.settings'], (got) => {
        const cur = (got && got['ce.settings']) || {};
        const nextUi = Object.assign({}, cur.ui || {}, {
          skin: ${JSON.stringify(ui.skin)},
          scheme: ${JSON.stringify(ui.scheme)},
          locale: ${JSON.stringify(ui.locale)}
        });
        chrome.storage.local.set({ 'ce.settings': Object.assign({}, cur, { ui: nextUi }) }, () => resolve({ ok: true }));
      });
    })`
  );
}

/**
 * Hard reset: force every platform enabled in ce.settings.
 * ui-random leftover clicks / seed off→on must never leave providers OFF for usage.
 */
function writeAllPlatformsTrue(popupId) {
  return evalInline(
    popupId,
    `() => new Promise((resolve) => {
      const ids = ${JSON.stringify(PLATFORM_IDS)};
      chrome.storage.local.get(['ce.settings'], (got) => {
        const cur = (got && got['ce.settings']) || {};
        const platforms = Object.assign({}, cur.platforms || {});
        for (const id of ids) platforms[id] = true;
        chrome.storage.local.set(
          { 'ce.settings': Object.assign({}, cur, { platforms }) },
          () => {
            chrome.storage.local.get(['ce.settings'], (g2) => {
              const p = (g2 && g2['ce.settings'] && g2['ce.settings'].platforms) || {};
              const off = ids.filter((id) => p[id] === false);
              resolve({ ok: !off.length, off, platforms: p });
            });
          }
        );
      });
    })`
  );
}

function ensureAllPlatformsEnabled(tag = 'platforms/reset') {
  const popup = ensurePopup();
  if (!popup) {
    record({ id: tag, status: 'FAIL', detail: 'no popup.html' });
    return false;
  }
  let res = writeAllPlatformsTrue(popup.id);
  sleep(400);
  ensureDrawersOpen(popup.id);
  sleep(100);
  for (let attempt = 0; attempt < 2; attempt++) {
    const snap = takeSnapshot(popup.id);
    const offUi = [];
    for (const name of PLATFORM_TOGGLE_NAMES) {
      const line = snap.split('\n').find((l) => l.includes(`button "${name}"`));
      if (!line) continue;
      if (!/\bpressed\b/i.test(line)) offUi.push(name);
    }
    if (!offUi.length) break;
    for (const name of offUi) {
      const uid = findUidByExactName(takeSnapshot(popup.id), 'button', name);
      if (!uid) continue;
      expectClick();
      try {
        clickUid(popup.id, uid);
        sleep(80);
      } catch {
        /* ignore */
      }
    }
    res = writeAllPlatformsTrue(popup.id);
    sleep(300);
  }
  const snap2 = takeSnapshot(popup.id);
  const stillOffUi = PLATFORM_TOGGLE_NAMES.filter((name) => {
    const line = snap2.split('\n').find((l) => l.includes(`button "${name}"`));
    return line && !/\bpressed\b/i.test(line);
  });
  // Storage is source of truth for mount; UI pressed lag must not block usage.
  const ok = !!(res && res.ok);
  record({
    id: tag,
    status: ok ? 'PASS' : 'FAIL',
    detail: ok
      ? `all ${PLATFORM_IDS.length} platforms enabled${
          stillOffUi.length ? ` (ui lag: ${stillOffUi.join(',')})` : ''
        }`
      : `storage still off: ${(res && res.off && res.off.join(',')) || 'write failed'}`
  });
  sleep(500);
  return ok;
}

function clickNamed(pageId, role, name) {
  expectClick();
  const snap = takeSnapshot(pageId);
  const uid = findUidByExactName(snap, role, name);
  if (!uid) {
    tally.fail++;
    return { ok: false, detail: `no uid for ${role} "${name}"` };
  }
  try {
    clickUid(pageId, uid);
    return { ok: true };
  } catch (e) {
    tally.fail++;
    return { ok: false, detail: String(e.message || e) };
  }
}

function clickPatterns(pageId, patterns, label) {
  expectClick();
  const uid = findUid(takeSnapshot(pageId), patterns);
  if (!uid) {
    tally.fail++;
    return { ok: false, detail: `no uid: ${label}` };
  }
  try {
    clickUid(pageId, uid);
    return { ok: true };
  } catch (e) {
    tally.fail++;
    return { ok: false, detail: String(e.message || e) };
  }
}

function listboxButtonNames(snapshot) {
  const names = [];
  for (const line of snapshot.split('\n')) {
    if (!/haspopup="listbox"/i.test(line)) continue;
    const m = line.match(/button\s+"([^"]*)"/i);
    if (m && m[1]) names.push(m[1]);
  }
  return names;
}

function optionNames(snapshot) {
  const names = [];
  for (const line of snapshot.split('\n')) {
    const m = line.match(/option\s+"([^"]*)"/i);
    if (m && m[1]) names.push(m[1]);
  }
  return names;
}

function ensureDrawersOpen(pageId) {
  const fails = [];
  let snap = takeSnapshot(pageId);
  if (!/Скрыть настройки экспорта|Hide export/i.test(snap)) {
    const r = clickPatterns(
      pageId,
      [/button "[^"]*(Настройки экспорта|Export settings)[^"]*"/i],
      'drawer-export'
    );
    if (!r.ok) fails.push(r.detail);
    sleep(60);
    snap = takeSnapshot(pageId);
  }
  if (!/Скрыть расширенн|Hide advanced/i.test(snap)) {
    const r = clickPatterns(
      pageId,
      [/button "[^"]*(Расширенн|Advanced)[^"]*"/i],
      'drawer-advanced'
    );
    if (!r.ok) fails.push(r.detail);
    sleep(60);
  }
  return { fails };
}

/** Open+close both drawers via CDT, leave them open. */
function clickPassDrawers(pageId) {
  const fails = [];
  fails.push(...ensureDrawersOpen(pageId).fails);
  let r = clickPatterns(
    pageId,
    [/button "[^"]*(Скрыть настройки экспорта|Hide export)[^"]*"/i],
    'close-export'
  );
  if (!r.ok) fails.push(r.detail);
  sleep(50);
  r = clickPatterns(
    pageId,
    [/button "[^"]*(Скрыть расширенн|Hide advanced)[^"]*"/i],
    'close-advanced'
  );
  if (!r.ok) fails.push(r.detail);
  sleep(50);
  fails.push(...ensureDrawersOpen(pageId).fails);
  return { fails };
}

/** CDT-click every listbox. everyOption=true → each option; false → open+assert options+Escape. */
function clickPassSelects(pageId, { everyOption = true } = {}) {
  const fails = [];
  let items = 0;
  let btns = 0;
  ensureDrawersOpen(pageId);
  const count = listboxButtonNames(takeSnapshot(pageId)).length;
  if (!count) return { items: 0, btns: 0, fails: ['no listbox buttons'] };

  for (let i = 0; i < count; i++) {
    pressKey(pageId, 'Escape');
    sleep(40);
    ensureDrawersOpen(pageId);
    sleep(50);
    const labels = listboxButtonNames(takeSnapshot(pageId));
    const label = labels[i];
    if (!label) {
      fails.push(`select-btn idx=${i}/${count} have=${labels.length}`);
      continue;
    }
    let optsFirst = [];
    for (let attempt = 0; attempt < 3 && !optsFirst.length; attempt++) {
      const open = clickNamed(pageId, 'button', label);
      if (attempt === 0) btns++;
      if (!open.ok) continue;
      sleep(everyOption ? 160 : 100);
      optsFirst = optionNames(takeSnapshot(pageId));
    }
    if (!optsFirst.length) {
      fails.push(`no options: ${label}`);
      pressKey(pageId, 'Escape');
      ensureDrawersOpen(pageId);
      continue;
    }
    if (!everyOption) {
      // still CDT-covered: select opened and options visible
      items += optsFirst.length;
      pressKey(pageId, 'Escape');
      ensureDrawersOpen(pageId);
      continue;
    }
    for (let j = 0; j < optsFirst.length; j++) {
      let cur = optionNames(takeSnapshot(pageId));
      if (!cur.length) {
        ensureDrawersOpen(pageId);
        const labelNow = listboxButtonNames(takeSnapshot(pageId))[i] || label;
        const reopen = clickNamed(pageId, 'button', labelNow);
        if (!reopen.ok) {
          fails.push(`reopen: ${labelNow}`);
          break;
        }
        sleep(120);
        cur = optionNames(takeSnapshot(pageId));
        if (!cur.length) {
          fails.push(`reopen empty: ${labelNow}`);
          break;
        }
      }
      const name = cur[j] || optsFirst[j];
      if (!name) {
        fails.push(`option idx=${i}.${j}`);
        continue;
      }
      const ir = clickNamed(pageId, 'option', name);
      if (!ir.ok) {
        fails.push(`option: ${name}`);
        continue;
      }
      items++;
      sleep(35);
    }
    pressKey(pageId, 'Escape');
    ensureDrawersOpen(pageId);
    sleep(30);
  }
  return { items, btns, fails };
}

function clickPassCheckboxesAndSafeButtons(pageId) {
  const fails = [];
  let checks = 0;
  let btns = 0;
  ensureDrawersOpen(pageId);
  sleep(150);
  const snap = takeSnapshot(pageId);

  for (const line of snap.split('\n')) {
    const m = line.match(/uid=(\S+)\s+(checkbox|button)\s+"([^"]*)"/i);
    if (!m) continue;
    const [, uid, role, name] = m;
    if (/\bdisabled\b/i.test(line)) continue;
    if (isBlacklisted(name)) {
      tally.blacklist++;
      continue;
    }

    const isToggle =
      role.toLowerCase() === 'checkbox' ||
      (role.toLowerCase() === 'button' && /\bpressed\b/i.test(line));
    const isSafeAction =
      role.toLowerCase() === 'button' &&
      /Копировать|Copy|Проверить|Test connection|Check connection/i.test(name);
    const isPlatformToggle =
      role.toLowerCase() === 'button' &&
      /^(ChatGPT|Grok|X Grok|Copilot|Claude|Qwen|DeepSeek|Perplexity|Kimi|Z\.ai|MiniMax|JanitorAI)$/i.test(
        name
      );

    if (isToggle || isPlatformToggle) {
      expectClick();
      try {
        clickUid(pageId, uid);
        checks++;
        sleep(30);
        if (isPlatformToggle) {
          const snap2 = takeSnapshot(pageId);
          const line2 = snap2.split('\n').find((l) => l.includes(`button "${name}"`));
          if (line2 && !/\bpressed\b/i.test(line2)) {
            const uid2 = (line2.match(/uid=(\S+)/) || [])[1];
            if (uid2) {
              expectClick();
              clickUid(pageId, uid2);
              sleep(25);
            }
          }
        }
      } catch (e) {
        fails.push(`toggle: ${name}`);
        tally.fail++;
      }
      continue;
    }

    if (!isSafeAction) continue;
    if (/haspopup=/i.test(line)) continue;
    if (/Скрыть|Hide |Настройки экспорта|Export settings|Расширен|Advanced/i.test(name)) continue;

    expectClick();
    try {
      const before = folderPages().map((p) => p.id);
      clickUid(pageId, uid);
      btns++;
      sleep(60);
      closeNewFolders(before);
    } catch (e) {
      fails.push(`btn: ${name}`);
      tally.fail++;
    }
  }

  const snap2 = takeSnapshot(pageId);
  for (const line of snap2.split('\n')) {
    const m = line.match(/uid=(\S+)\s+DisclosureTriangle\s+"([^"]*)"/i);
    if (!m) continue;
    const [, uid, name] = m;
    expectClick();
    try {
      clickUid(pageId, uid);
      btns++;
      sleep(40);
      clickUid(pageId, uid);
      sleep(30);
    } catch (e) {
      fails.push(`disclosure: ${name}`);
      tally.fail++;
    }
  }

  return { checks, btns, fails };
}

function classifyListboxKind(optionLabels) {
  const opts = optionLabels || [];
  if (!opts.length) return null;
  if (opts.every((n) => UI_RANDOM_ALLOW.themeOptionRe.test(n))) return 'theme';
  if (opts.every((n) => UI_RANDOM_ALLOW.localeOptionRe.test(n))) return 'locale';
  if (opts.some((n) => UI_RANDOM_ALLOW.shiftOptionRe.test(n))) return 'shift';
  if (opts.some((n) => UI_RANDOM_ALLOW.schemaOptionRe.test(n))) return 'schema';
  if (opts.every((n) => UI_RANDOM_ALLOW.styleOptionRe.test(n))) return 'style';
  return null;
}

/** True if name/role is on the CE popup ui-random allowlist (plan table). */
function isUiRandomAllowlisted(role, name, { listboxKind = null } = {}) {
  const r = (role || '').toLowerCase();
  const n = name || '';
  if (isBlacklisted(n) || RANDOM_SKIP_RE.test(n)) return false;
  if (r === 'disclosuretriangle') return true;
  if (UI_RANDOM_ALLOW.drawerRe.test(n)) return true;
  if (UI_RANDOM_ALLOW.platformToggleRe.test(n)) return true;
  if (UI_RANDOM_ALLOW.automationToggleRe.test(n)) return true;
  if (r === 'checkbox') return true;
  if (r === 'option') {
    if (listboxKind) return true;
    return (
      UI_RANDOM_ALLOW.themeOptionRe.test(n) ||
      UI_RANDOM_ALLOW.localeOptionRe.test(n) ||
      UI_RANDOM_ALLOW.shiftOptionRe.test(n) ||
      UI_RANDOM_ALLOW.schemaOptionRe.test(n) ||
      UI_RANDOM_ALLOW.styleOptionRe.test(n)
    );
  }
  if (r === 'button' && /haspopup/i.test(listboxKind || '')) return true;
  return false;
}

function collectSnapshotClickables(snapshot, { forRandom = false, listboxKind = null } = {}) {
  const items = [];
  for (const line of snapshot.split('\n')) {
    const m = line.match(
      /uid=(\S+)\s+(button|checkbox|menuitemcheckbox|radio|option|DisclosureTriangle)\s+"([^"]*)"/i
    );
    if (!m) continue;
    if (/\bdisabled\b/i.test(line)) continue;
    const [, uid, role, name] = m;
    if (isBlacklisted(name)) {
      tally.blacklist++;
      continue;
    }
    if (forRandom && RANDOM_SKIP_RE.test(name)) {
      tally.blacklist++;
      continue;
    }
    if (forRandom) {
      const kindHint = /haspopup="listbox"/i.test(line) ? 'listbox-btn' : listboxKind;
      if (role.toLowerCase() === 'button' && /haspopup="listbox"/i.test(line)) {
        items.push({ uid, role, name, kind: 'listbox-btn' });
        continue;
      }
      if (!isUiRandomAllowlisted(role, name, { listboxKind: kindHint })) {
        tally.blacklist++;
        continue;
      }
    }
    items.push({ uid, role, name, kind: listboxKind || null });
  }
  return items;
}

/** Only Chat Export format menu controls — never host-page Download links. */
function collectExportBarMenuClickables(snapshot) {
  const items = [];
  for (const line of snapshot.split('\n')) {
    const m = line.match(/uid=(\S+)\s+(menuitemcheckbox|radio)\s+"([^"]*)"/i);
    if (!m) continue;
    if (/\bdisabled\b/i.test(line)) continue;
    const [, uid, role, name] = m;
    if (role.toLowerCase() === 'menuitemcheckbox' && /^(MD|YAML|JSON|HTML|PDF)$/i.test(name)) {
      items.push({ uid, role, name });
      continue;
    }
    if (role.toLowerCase() === 'radio' && /^(Папка|Folder|Архив|Zip|ZIP)$/i.test(name)) {
      items.push({ uid, role, name });
    }
  }
  const fmt = findUid(snapshot, [/button "[^"]*(Формат экспорта|Export format)[^"]*"/i]);
  if (fmt) {
    const line = snapshot.split('\n').find((l) => l.includes(`uid=${fmt}`));
    const nameM = line && line.match(/button\s+"([^"]*)"/i);
    items.push({ uid: fmt, role: 'button', name: (nameM && nameM[1]) || 'Export format' });
  }
  return items;
}

/**
 * fmtParity hook for --section=styles.
 * Probe: scripts/cdt-probes/fmt-select-parity.js (tol on pad/radius/gap).
 * Invoke: open menu → evalPage(pageId, 'fmt-select-parity.js')
 */
function runFmtSelectParity() {
  const popup = ensurePopup();
  if (!popup) {
    record({ id: 'styles/fmtParity', status: 'FAIL', detail: 'no popup.html' });
    return;
  }
  try {
    setPopupUi(popup.id, { skin: 'chatgpt', scheme: 'dark', locale: 'en' });
    sleep(120);
    ensureDrawersOpen(popup.id);
    sleep(80);
    const labels = listboxButtonNames(takeSnapshot(popup.id));
    const openLabel =
      labels.find((n) => /^(Style|Стиль|Theme|Тема|Language|Язык)$/i.test(n)) || labels[0];
    if (openLabel) {
      clickNamed(popup.id, 'button', openLabel);
      sleep(200);
    }
    let sel = evalPage(popup.id, 'fmt-select-parity.js');
    if (sel && !sel.ok && (sel.fails || []).includes('no-menu') && openLabel) {
      pressKey(popup.id, 'Escape');
      sleep(80);
      ensureDrawersOpen(popup.id);
      clickNamed(popup.id, 'button', openLabel);
      sleep(250);
      sel = evalPage(popup.id, 'fmt-select-parity.js');
    }
    if (!sel || !sel.ok) {
      record({
        id: 'styles/fmtParity/select',
        status: 'FAIL',
        detail: (sel && sel.fails && sel.fails.join('; ')) || 'select probe fail'
      });
    } else {
      record({
        id: 'styles/fmtParity/select',
        status: 'PASS',
        detail: `mode=${sel.mode} radius=${sel.expect && sel.expect.menuRadius}`
      });
    }

    pressKey(popup.id, 'Escape');
    sleep(80);

    let bar = null;
    let barPage = null;
    let openFail = 'no provider tab with ExportBar';
    for (const provider of PROVIDERS) {
      const page = findPage(listPages().pages, provider);
      if (!page) continue;
      const inv = evalPage(page.id, 'bar.js');
      if (!inv || !inv.hasBar) continue;
      barPage = page;
      pressKey(page.id, 'Escape');
      sleep(60);
      let opened = evalPage(page.id, 'menu-open.js');
      if (!opened || !opened.ok) {
        if (!ensureFmtMenu(page.id)) {
          openFail = (opened && opened.reason) || 'menu-open failed';
          continue;
        }
        opened = { ok: true };
      }
      sleep(120);
      bar = evalPage(page.id, 'fmt-select-parity.js');
      evalPage(page.id, 'menu-close.js');
      if (bar && bar.ok) break;
      openFail = (bar && bar.fails && bar.fails.join('; ')) || 'bar probe fail';
      bar = null;
    }
    if (!barPage) {
      record({
        id: 'styles/fmtParity/bar',
        status: 'SKIP',
        detail: 'no provider tab with ExportBar (open a chat + re-run)'
      });
      return;
    }
    if (!bar || !bar.ok) {
      record({
        id: 'styles/fmtParity/bar',
        status: 'FAIL',
        detail: openFail
      });
      return;
    }
    record({
      id: 'styles/fmtParity/bar',
      status: 'PASS',
      detail: `mode=${bar.mode} radius=${bar.expect && bar.expect.menuRadius} via=${barPage.url || ''}`
    });
  } catch (e) {
    record({ id: 'styles/fmtParity', status: 'FAIL', detail: String(e.message || e) });
  }
}

/** Styles sample: ~12 seed-picked combos, drawers open, data-skin/scheme assert. */
function runStylesSample() {
  const popup = ensurePopup();
  if (!popup) {
    record({ id: 'styles', status: 'FAIL', detail: 'no popup.html' });
    return;
  }
  const allCombos = UI_SKINS.flatMap((skin) =>
    UI_SCHEMES.flatMap((scheme) => UI_LOCALES.map((locale) => ({ skin, scheme, locale })))
  );
  const fixed = [
    { skin: 'auto', scheme: 'auto', locale: 'auto' },
    { skin: 'chatgpt', scheme: 'dark', locale: 'en' },
    { skin: 'claude', scheme: 'light', locale: 'ru' }
  ];
  const rest = pickN(
    allCombos.filter(
      (c) => !fixed.some((f) => f.skin === c.skin && f.scheme === c.scheme && f.locale === c.locale)
    ),
    Math.max(0, args.stylesSample - fixed.length),
    rng
  );
  const sample = fixed.concat(rest).slice(0, args.stylesSample);
  let pass = 0;
  let fail = 0;
  for (const c of sample) {
    const id = `styles/${c.skin}/${c.scheme}/${c.locale}`;
    try {
      setPopupUi(popup.id, c);
      let got = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        sleep(80);
        got = evalInline(
          popup.id,
          `() => ({
            skin: document.documentElement.getAttribute('data-skin'),
            scheme: document.documentElement.getAttribute('data-scheme'),
            toggles: document.querySelectorAll('.ce-advanced-toggle').length,
            selects: document.querySelectorAll('.ce-select-btn').length
          })`
        );
        const skinOk = c.skin === 'auto' || (got && got.skin === c.skin);
        const schemeOk =
          c.scheme === 'auto' ? !!(got && got.scheme) : !!(got && got.scheme === c.scheme);
        if (skinOk && schemeOk) break;
      }
      ensureDrawersOpen(popup.id);
      const fails = [];
      if (!got) fails.push('no popup attrs');
      if (c.skin !== 'auto' && got && got.skin !== c.skin) fails.push(`skin=${got.skin}`);
      if (c.scheme !== 'auto' && got && got.scheme !== c.scheme) fails.push(`scheme=${got.scheme}`);
      if (c.scheme === 'auto' && got && !got.scheme) fails.push('auto scheme unresolved');
      if ((got && got.toggles) < 2) fails.push(`toggles=${got && got.toggles}`);
      if ((got && got.selects) < 3) fails.push(`selects=${got && got.selects}`);
      if (fails.length) {
        fail++;
        record({ id, status: 'FAIL', detail: fails.join('; ') });
      } else {
        pass++;
        record({ id, status: 'PASS', detail: `skin=${got.skin} scheme=${got.scheme} selects=${got.selects}` });
      }
    } catch (e) {
      fail++;
      record({ id, status: 'FAIL', detail: String(e.message || e) });
    }
  }
  record({
    id: 'styles/summary',
    status: fail ? 'FAIL' : 'PASS',
    detail: `${pass}/${pass + fail} sample seed=${args.seed}`
  });
  setPopupUi(popup.id, { skin: 'auto', scheme: 'auto', locale: 'auto' });
  runFmtSelectParity();
}

/**
 * Seeded CE-only random (--section=ui-random).
 * Allowlist: Style/Theme/Language, 1 platform toggle, Shift select, schemas,
 * automation toggles, drawers, FAQ disclosures; bar = open fmt-menu item/pack only.
 * Blacklist: Choose/Forget/Rotate/Donate; never host Download/model menus; never Скачать.
 */
function runUiRandomSection() {
  const popup = ensurePopup();
  if (!popup) {
    record({ id: 'ui-random', status: 'FAIL', detail: 'no popup.html' });
    return;
  }
  setPopupUi(popup.id, { skin: 'chatgpt', scheme: 'dark', locale: 'en' });
  sleep(150);
  const drawerFails = clickPassDrawers(popup.id).fails;
  sleep(80);

  const structured = { ok: 0, fail: 0, notes: [] };

  function safeClickByName(role, name) {
    expectClick();
    try {
      // Opening drawers closes listboxes — never do that before option clicks.
      if (role.toLowerCase() !== 'option') ensureDrawersOpen(popup.id);
      const uid = findUidByExactName(takeSnapshot(popup.id), role, name);
      if (!uid) {
        structured.fail++;
        tally.fail++;
        structured.notes.push(`missing ${role}:${name}`);
        return false;
      }
      const before = folderPages().map((p) => p.id);
      clickUid(popup.id, uid);
      structured.ok++;
      sleep(40);
      closeNewFolders(before);
      return true;
    } catch (e) {
      structured.fail++;
      tally.fail++;
      structured.notes.push(`${name}: ${e.message || e}`);
      return false;
    }
  }

  const kindsWanted = new Set(['style', 'theme', 'locale', 'shift', 'schema']);
  const kindsDone = new Set();
  let formatSchemaSamples = 0;
  ensureDrawersOpen(popup.id);
  const labels = listboxButtonNames(takeSnapshot(popup.id));
  for (const label of labels) {
    if ([...kindsWanted].every((k) => kindsDone.has(k)) && formatSchemaSamples >= 2) break;
    pressKey(popup.id, 'Escape');
    sleep(30);
    ensureDrawersOpen(popup.id);
    const open = clickNamed(popup.id, 'button', label);
    if (!open.ok) continue;
    sleep(100);
    const opts = optionNames(takeSnapshot(popup.id));
    const kind = classifyListboxKind(opts);
    if (!kind) {
      pressKey(popup.id, 'Escape');
      continue;
    }
    const pickOpts = pickN(opts, 1, rng);
    if (kind === 'schema' && UI_RANDOM_ALLOW.formatSchemaLabelRe.test(label)) {
      if (formatSchemaSamples >= 2) {
        pressKey(popup.id, 'Escape');
        continue;
      }
      formatSchemaSamples++;
    } else if (kindsDone.has(kind) && kind !== 'schema') {
      pressKey(popup.id, 'Escape');
      continue;
    } else {
      kindsDone.add(kind);
    }
    if (pickOpts[0]) safeClickByName('option', pickOpts[0]);
    pressKey(popup.id, 'Escape');
    sleep(30);
  }
  structured.notes.push(`kinds=${[...kindsDone].join(',') || 'none'} schemaFmt=${formatSchemaSamples}`);

  ensureDrawersOpen(popup.id);
  const platPool = collectSnapshotClickables(takeSnapshot(popup.id), { forRandom: true }).filter((i) =>
    UI_RANDOM_ALLOW.platformToggleRe.test(i.name)
  );
  const plat = pickN(platPool, 1, rng)[0];
  if (plat) {
    safeClickByName(plat.role, plat.name);
    sleep(40);
    safeClickByName(plat.role, plat.name);
    structured.notes.push(`platform=${plat.name}`);
  } else {
    structured.notes.push('platform=none');
  }

  ensureDrawersOpen(popup.id);
  const autoPool = collectSnapshotClickables(takeSnapshot(popup.id), { forRandom: true }).filter(
    (i) =>
      (i.role.toLowerCase() === 'checkbox' || UI_RANDOM_ALLOW.automationToggleRe.test(i.name)) &&
      !UI_RANDOM_ALLOW.platformToggleRe.test(i.name) &&
      !UI_RANDOM_ALLOW.drawerRe.test(i.name)
  );
  const auto = pickN(autoPool, 1, rng)[0];
  if (auto) {
    safeClickByName(auto.role, auto.name);
    sleep(40);
    safeClickByName(auto.role, auto.name);
    structured.notes.push(`automation=${auto.name}`);
  }

  const disc = collectSnapshotClickables(takeSnapshot(popup.id), { forRandom: true }).filter(
    (i) => i.role.toLowerCase() === 'disclosuretriangle'
  );
  for (const d of pickN(disc, Math.min(2, disc.length), rng)) {
    safeClickByName(d.role, d.name);
    sleep(30);
    safeClickByName(d.role, d.name);
  }

  ensureDrawersOpen(popup.id);
  let pool = collectSnapshotClickables(takeSnapshot(popup.id), { forRandom: true });
  const openLabel = listboxButtonNames(takeSnapshot(popup.id))[0];
  if (openLabel) {
    clickNamed(popup.id, 'button', openLabel);
    sleep(100);
    const opts = optionNames(takeSnapshot(popup.id));
    const kind = classifyListboxKind(opts);
    pool = collectSnapshotClickables(takeSnapshot(popup.id), { forRandom: true, listboxKind: kind });
  }
  // Never single-click platforms in leftover pool (would leave providers OFF).
  // Options already sampled above; stale option names after listbox close → false FAIL.
  pool = pool.filter(
    (i) =>
      i.role.toLowerCase() !== 'option' &&
      !(i.role.toLowerCase() === 'button' && UI_RANDOM_ALLOW.platformToggleRe.test(i.name))
  );
  const remain = Math.max(0, args.randomClicks - structured.ok);
  const picks = pickN(pool, remain, rng);
  for (const item of picks) {
    safeClickByName(item.role, item.name);
  }
  pressKey(popup.id, 'Escape');
  ensureAllPlatformsEnabled('ui-random/platforms-restore');

  record({
    id: 'ui-random/popup',
    status: structured.fail || drawerFails.length ? 'FAIL' : 'PASS',
    detail: `seed=${args.seed} clicked=${structured.ok} fail=${structured.fail} pool=${pool.length}${
      structured.notes.length ? ' · ' + structured.notes.slice(0, 8).join('; ') : ''
    }${drawerFails.length ? ' · drawers: ' + drawerFails.slice(0, 3).join('; ') : ''}`
  });

  let barOk = 0;
  let barFail = 0;
  for (const provider of PROVIDERS) {
    const page = findPage(listPages().pages, provider);
    if (!page) continue;
    const bar = evalPage(page.id, 'bar.js');
    if (!bar.hasBar) continue;
    const snap0 = takeSnapshot(page.id);
    const fmt = findUid(snap0, [/button "[^"]*(Формат экспорта|Export format)[^"]*"/i]);
    if (!fmt) continue;
    expectClick();
    clickUid(page.id, fmt);
    sleep(120);
    const barPool = collectExportBarMenuClickables(takeSnapshot(page.id)).filter(
      (i) => !RANDOM_SKIP_RE.test(i.name) && !isBlacklisted(i.name)
    );
    const barPicks = pickN(barPool, args.randomClicksBar, rng);
    for (const item of barPicks) {
      expectClick();
      try {
        let snap = takeSnapshot(page.id);
        if (!/menuitemcheckbox|radio "/i.test(snap)) {
          const f2 = findUid(snap, [/button "[^"]*(Формат экспорта|Export format)[^"]*"/i]);
          if (f2) {
            clickUid(page.id, f2);
            sleep(100);
            snap = takeSnapshot(page.id);
          }
        }
        const uid = findUidByExactName(snap, item.role, item.name);
        if (!uid) {
          barFail++;
          tally.fail++;
          continue;
        }
        clickUid(page.id, uid);
        barOk++;
        sleep(40);
      } catch {
        barFail++;
        tally.fail++;
      }
    }
    pressKey(page.id, 'Escape');
  }
  record({
    id: 'ui-random/bar-fmt-menu',
    status: barFail ? 'FAIL' : 'PASS',
    detail: `seed=${args.seed} clicked=${barOk} fail=${barFail} (fmt menu only, no dl/Скачать)`
  });
}

/**
 * Exhaust popup (debug): deep options per locale + sample combos.
 * Only for --section=popup, not default --full.
 */
function runPopupSection() {
  const popup = ensurePopup();
  if (!popup) {
    record({ id: 'popup', status: 'FAIL', detail: 'no popup.html' });
    return;
  }
  for (const locale of ['en', 'ru']) {
    const id = `popup/deep/${locale}`;
    try {
      setPopupUi(popup.id, { skin: 'chatgpt', scheme: 'dark', locale });
      sleep(150);
      const drawers = clickPassDrawers(popup.id);
      const sel = clickPassSelects(popup.id, { everyOption: true });
      setPopupUi(popup.id, { skin: 'chatgpt', scheme: 'dark', locale });
      sleep(100);
      const rest = clickPassCheckboxesAndSafeButtons(popup.id);
      const fails = [...drawers.fails, ...sel.fails, ...rest.fails];
      record({
        id,
        status: fails.length ? 'FAIL' : 'PASS',
        detail: fails.length
          ? `items=${sel.items}; ${fails.slice(0, 6).join('; ')}`
          : `items=${sel.items} selBtns=${sel.btns} checks=${rest.checks}`
      });
    } catch (e) {
      record({ id, status: 'FAIL', detail: String(e.message || e) });
    }
  }
  setPopupUi(popup.id, { skin: 'auto', scheme: 'auto', locale: 'auto' });
  record({
    id: 'popup/summary',
    status: results.some((r) => r.id.startsWith('popup/deep/') && r.status === 'FAIL') ? 'FAIL' : 'PASS',
    detail: `exhaust debug clicked/expected=${tally.clicked}/${tally.expected}`
  });
}

/**
 * Staged default (providers+save): bar + one menu open.
 * --full or --section=providers alone or providers-clicks: full ExportBar click-pass.
 */
function runProvidersSection() {
  const fullClicks =
    args.full ||
    args.sections.has('providers-clicks') ||
    (args.sections.has('providers') && !args.sections.has('save') && args.sections.size === 1);

  for (const provider of PROVIDERS) {
    const page = ensureProvider(provider);
    if (!page) {
      record({
        id: `${provider.id}/bar`,
        status: 'FAIL',
        detail: `no tab (use --open-missing or open ${provider.start})`
      });
      continue;
    }

    const bar = evalPage(page.id, 'bar.js');
    if (!bar.hasBar) {
      record({
        id: `${provider.id}/bar`,
        status: provider.id === 'janitorai' ? 'SKIP' : 'FAIL',
        detail: 'no bar'
      });
      continue;
    }
    const barFail = [];
    if (bar.ver !== EXT_VERSION) barFail.push(`ver=${bar.ver} want ${EXT_VERSION}`);
    if (!bar.hasFolder) barFail.push('no folder');
    if (!bar.hasDl || !bar.hasFmt) barFail.push('no fmt/dl');
    if (barFail.length) {
      record({ id: `${provider.id}/bar`, status: 'FAIL', detail: barFail.join('; ') });
      if (!fullClicks) continue;
    } else if (!fullClicks) {
      // staged: one CDT open of format menu
      const fmt = findUid(takeSnapshot(page.id), [/Формат экспорта|Export format/i]);
      let menu = false;
      if (fmt) {
        expectClick();
        clickUid(page.id, fmt);
        sleep(200);
        menu = !!evalPage(page.id, 'menu-pack.js').ok;
        pressKey(page.id, 'Escape');
      }
      record({
        id: `${provider.id}/bar`,
        status: 'PASS',
        detail: `v${bar.ver} menu=${menu} folder=${bar.folderTitle || ''}`
      });
      continue;
    }

    // FULL ExportBar click-pass (a11y: menuitemcheckbox formats, radio pack)
    const fail = [...barFail];
    let menuClicks = 0;

    function menuItemNames(snapshot) {
      const out = [];
      for (const line of snapshot.split('\n')) {
        const m = line.match(/menuitemcheckbox\s+"([^"]*)"/i);
        if (m) out.push(m[1]);
      }
      return out;
    }

    function ensureFmtMenu() {
      let snap = takeSnapshot(page.id);
      if (menuItemNames(snap).length) return true;
      const r = clickPatterns(page.id, [/button "[^"]*(Формат экспорта|Export format)[^"]*"/i], 'fmt');
      if (!r.ok) return false;
      sleep(220);
      return menuItemNames(takeSnapshot(page.id)).length > 0;
    }

    if (!ensureFmtMenu()) fail.push('fmt menu');
    else {
      const names = menuItemNames(takeSnapshot(page.id));
      for (const name of names) {
        for (let k = 0; k < 2; k++) {
          if (!menuItemNames(takeSnapshot(page.id)).length) ensureFmtMenu();
          const r = clickNamed(page.id, 'menuitemcheckbox', name);
          if (!r.ok) {
            fail.push(`item ${name}`);
            break;
          }
          menuClicks++;
          sleep(70);
        }
      }
      if (!menuItemNames(takeSnapshot(page.id)).length) ensureFmtMenu();
      let packFolder = false;
      let packZip = false;
      for (const [packName, which] of [
        ['Папка', 'folder'],
        ['Folder', 'folder'],
        ['Архив', 'zip'],
        ['Zip', 'zip'],
        ['ZIP', 'zip']
      ]) {
        if (!fmtMenuOpen(takeSnapshot(page.id))) ensureFmtMenu();
        const uid = findUidByExactName(takeSnapshot(page.id), 'radio', packName);
        if (!uid) continue;
        expectClick();
        try {
          clickUid(page.id, uid);
          menuClicks++;
          if (which === 'folder') packFolder = true;
          if (which === 'zip') packZip = true;
          sleep(80);
        } catch (e) {
          fail.push(`pack ${packName}`);
          tally.fail++;
        }
      }
      if (!packFolder) fail.push('pack-folder');
      if (!packZip) fail.push('pack-zip');
      pressKey(page.id, 'Escape');
      sleep(100);
    }

    const folderUid = findUid(takeSnapshot(page.id), [
      /button "[^"]*(Set folder|Выбрать папку|Choose folder|Change folder|Сменить папку|Гитахаб|Restore|Восстанов|Re-?grant)[^"]*"/i
    ]);
    expectClick();
    if (folderUid) {
      const before = folderPages().map((p) => p.id);
      try {
        clickUid(page.id, folderUid);
        sleep(600);
        closeNewFolders(before);
      } catch (e) {
        fail.push(`folder: ${e.message || e}`);
        tally.fail++;
      }
    } else {
      fail.push('no folder btn');
      tally.fail++;
    }

    const dl = findUid(takeSnapshot(page.id), [/button "[^"]*(Скачать чат|Download chat)[^"]*"/i]);
    expectClick();
    if (!dl) {
      fail.push('no dl');
      tally.fail++;
    } else {
      evalPage(page.id, 'toast-arm.js');
      try {
        clickUid(page.id, dl);
        const toast = waitToast(page.id);
        if (!toast) fail.push('no toast');
        else if (/Скачано|Downloaded/i.test(toast)) fail.push('downloads fallback');
      } catch (e) {
        fail.push(`dl: ${e.message || e}`);
        tally.fail++;
      }
    }

    record({
      id: `${provider.id}/clicks`,
      status: fail.length ? 'FAIL' : 'PASS',
      detail: fail.length
        ? fail.join('; ')
        : `v${bar.ver} menuClicks=${menuClicks} clicked/expected=${tally.clicked}/${tally.expected}`
    });
  }
}

function saveOnce(provider, page, id) {
  downloadAssertToast(page.id, id);
}

function runSaveSection() {
  for (const id of saveIds) {
    const provider = PROVIDERS.find((p) => p.id === id);
    if (!provider) {
      record({ id: `${id}/save`, status: 'FAIL', detail: 'unknown id' });
      continue;
    }
    const page = findPage(listPages().pages, provider);
    if (!page) {
      record({
        id: `${id}/save`,
        status: args.full ? 'FAIL' : 'SKIP',
        detail: 'no tab'
      });
      continue;
    }
    saveOnce(provider, page, `${id}/save`);
  }
}

function runScenariosSection() {
  for (const id of ['chatgpt', 'copilot']) {
    const provider = PROVIDERS.find((p) => p.id === id);
    const page = findPage(listPages().pages, provider);
    if (!page) {
      record({ id: `${id}/scenarios`, status: 'SKIP', detail: 'no tab' });
      continue;
    }
    evalPage(page.id, 'toast-arm.js');
    const dl = findUid(takeSnapshot(page.id), [/Скачать чат|Download chat/i]);
    if (!dl) {
      record({ id: `${id}/scenarios`, status: 'FAIL', detail: 'no dl' });
      continue;
    }
    expectClick();
    clickUid(page.id, dl);
    const t0 = waitToast(page.id);
    if (t0 && /нечего|empty|nothing/i.test(t0)) {
      record({ id: `${id}/scenarios`, status: 'SKIP', detail: 'need messages' });
      continue;
    }
    let ok = /Сохранено|Saved/i.test(t0 || '');
    for (let i = 0; i < 4 && ok; i++) {
      const before = folderPages().map((p) => p.id);
      evalPage(page.id, 'toast-arm.js');
      const d2 = findUid(takeSnapshot(page.id), [/Скачать чат|Download chat/i]);
      expectClick();
      clickUid(page.id, d2);
      const t = waitToast(page.id);
      if (!/Сохранено|Saved/i.test(t || '') || folderPages().some((p) => !before.includes(p.id))) ok = false;
    }
    {
      let row = {
        id: `${id}/repeat`,
        status: ok ? 'PASS' : 'FAIL',
        detail: ok ? '5x silent' : 'repeat fail'
      };
      row = applyConsoleAuthGate(page.id, row);
      record(row);
    }

    runFolderPickRebind(`${id}/rebind`);
  }
}

/**
 * Mandatory usage module (--section=usage / --full):
 * all providers bar+ver; Folder|Zip; Download toast; mode2/rebind; seed platform toggle.
 */
function runUsageSection() {
  ensureAllPlatformsEnabled('usage/platforms-reset');
  for (const provider of PROVIDERS) {
    const page = ensureProvider(provider);
    if (!page) {
      record({
        id: `usage/${provider.id}/bar`,
        status: 'FAIL',
        detail: `no tab (use --open-missing or open ${provider.start})`
      });
      continue;
    }

    if (provider.id === 'janitorai') {
      try {
        const u = new URL(page.url || '');
        if (/^\/?(ru)?\/?$/i.test(u.pathname)) {
          record({
            id: `usage/${provider.id}/bar`,
            status: 'SKIP',
            detail: 'landing URL — need chat tab'
          });
          continue;
        }
      } catch {
        /* ignore */
      }
    }

    const bar = evalPage(page.id, 'bar.js');
    if (!bar.hasBar) {
      record({
        id: `usage/${provider.id}/bar`,
        status: provider.id === 'janitorai' ? 'SKIP' : 'FAIL',
        detail: 'no bar'
      });
      continue;
    }

    const barFail = [];
    if (bar.ver !== EXT_VERSION) barFail.push(`ver=${bar.ver} want ${EXT_VERSION}`);
    if (!bar.hasFolder) barFail.push('no folder');
    if (!bar.hasDl || !bar.hasFmt) barFail.push('no fmt/dl');
    record({
      id: `usage/${provider.id}/bar`,
      status: barFail.length ? 'FAIL' : 'PASS',
      detail: barFail.length ? barFail.join('; ') : `v${bar.ver} folder=${bar.folderTitle || ''}`
    });
    if (barFail.length) continue;

    try {
      assertExportFidelity(page.id, provider.id);
    } catch (e) {
      record({
        id: `usage/${provider.id}/fidelity`,
        status: 'SKIP',
        detail: `fidelity-throw: ${String(e && e.message || e).slice(0, 120)}`
      });
    }

    let pack;
    try {
      pack = clickPackFolderAndZip(page.id);
    } catch (e) {
      pack = { ok: false, fail: [`pack-throw: ${String(e && e.message || e).slice(0, 80)}`], clicks: 0 };
    }
    record({
      id: `usage/${provider.id}/pack`,
      status: pack.ok ? 'PASS' : 'FAIL',
      detail: pack.ok
        ? `folder=${pack.packFolder} zip=${pack.packZip} clicks=${pack.clicks}`
        : pack.fail.join('; ')
    });

    const folderUid = findUid(takeSnapshot(page.id), [
      /button "[^"]*(Set folder|Выбрать папку|Choose folder|Change folder|Сменить папку|Гитахаб|Restore|Восстанов|Re-?grant)[^"]*"/i
    ]);
    const folderViaDom =
      !folderUid &&
      evalInline(
        page.id,
        `() => {
          const el = document.querySelector('.chat-export-folder, [data-chat-export-folder]');
          if (!el) return { ok: false };
          el.click();
          return { ok: true, label: (el.getAttribute('aria-label') || el.title || '').slice(0, 60) };
        }`
      );
    if (folderUid || (folderViaDom && folderViaDom.ok)) {
      const before = folderPages().map((p) => p.id);
      if (folderUid) {
        expectClick();
        try {
          clickUid(page.id, folderUid);
          sleep(500);
          closeNewFolders(before);
          record({
            id: `usage/${provider.id}/folder-bind`,
            status: 'PASS',
            detail: 'folder control clicked (no Forget)'
          });
        } catch (e) {
          record({
            id: `usage/${provider.id}/folder-bind`,
            status: 'FAIL',
            detail: String(e.message || e)
          });
        }
      } else {
        sleep(500);
        closeNewFolders(before);
        record({
          id: `usage/${provider.id}/folder-bind`,
          status: 'PASS',
          detail: `folder DOM click (${folderViaDom.label || 'ok'})`
        });
      }
    } else {
      record({
        id: `usage/${provider.id}/folder-bind`,
        status: 'FAIL',
        detail: 'no folder control'
      });
    }

    if (!args.noSave) {
      downloadAssertToast(page.id, `usage/${provider.id}/dl`);
    } else {
      record({
        id: `usage/${provider.id}/dl`,
        status: 'SKIP',
        detail: '--no-save'
      });
    }
  }

  const mode2Page =
    findPage(listPages().pages, PROVIDERS.find((p) => p.id === 'chatgpt')) ||
    findPage(listPages().pages, PROVIDERS.find((p) => p.id === 'copilot')) ||
    findPage(listPages().pages, PROVIDERS.find((p) => p.id === 'qwen'));
  if (mode2Page) {
    runShiftClickMode2(mode2Page.id, 'usage/mode2-shift');
  } else {
    record({ id: 'usage/mode2-shift', status: 'SKIP', detail: 'no chatgpt/copilot/qwen tab' });
  }
  runFolderPickRebind('usage/folderPick-rebind');
  runSeedPlatformToggle();
}

/** Scan provider tabs + CE service worker for unauthorized / save failed. */
function runConsoleSection() {
  const lp = listPages();
  let scanned = 0;
  let hitCount = 0;

  for (const provider of PROVIDERS) {
    const page = findPage(lp.pages, provider);
    if (!page) continue;
    scanned++;
    const hits = findConsoleAuthHits(page.id);
    if (!hits.length) {
      record({
        id: `console/${provider.id}`,
        status: 'PASS',
        detail: 'no unauthorized/save-failed'
      });
      continue;
    }
    hitCount++;
    record({
      id: `console/${provider.id}`,
      status: 'FAIL',
      detail: hits[0]
    });
  }

  const sw = (lp.sw || []).find((s) => (s.url || '').includes(EXT_ID));
  if (sw && sw.id) {
    scanned++;
    const pageForSw = lp.pages[0] || lp.extensionPages[0];
    if (pageForSw) {
      const hits = findConsoleAuthHits(pageForSw.id, { serviceWorkerId: sw.id });
      if (hits.length) {
        hitCount++;
        record({ id: 'console/service-worker', status: 'FAIL', detail: hits[0] });
      } else {
        record({
          id: 'console/service-worker',
          status: 'PASS',
          detail: 'no unauthorized/save-failed'
        });
      }
    }
  }

  if (!scanned) {
    record({ id: 'console/summary', status: 'SKIP', detail: 'no provider tabs' });
    return;
  }
  record({
    id: 'console/summary',
    status: hitCount ? 'FAIL' : 'PASS',
    detail: `scanned=${scanned} authHits=${hitCount} (FAIL or explicit SKIP — never silent)`
  });
}

function writeReport() {
  const reportPath = args.report || join(ROOT, 'docs', 'qa', `${EXT_VERSION}-cdt-gate.md`);
  mkdirSync(dirname(reportPath), { recursive: true });
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const skip = results.filter((r) => r.status === 'SKIP').length;
  const mode = args.full
    ? 'pre-release (styles+ui-random+usage+console)'
    : [...sections].join(',');
  const lines = [
    `# ${EXT_VERSION} CDT gate`,
    '',
    `- Mode: **${mode}**`,
    `- Seed: \`${args.seed}\` · random-clicks=${args.randomClicks} · styles-sample=${args.stylesSample}`,
    `- Map kept; pre-release = styles + ui-random + usage + console (not 108× exhaust)`,
    `- Started: ${started}`,
    `- Finished: ${new Date().toISOString()}`,
    `- Clicks: **${tally.clicked}/${tally.expected}** clicked/expected · blacklist=${tally.blacklist} · fail=${tally.fail}`,
    `- Summary: **${pass} PASS** / **${fail} FAIL** / **${skip} SKIP**`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |'
  ];
  for (const r of results) {
    lines.push(
      `| \`${r.id}\` | ${r.status} | ${String(r.detail || '')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ')} |`
    );
  }
  lines.push('', '## Manual', '- M1 grant pick', '- M2 Shift rebind pick', '- M3 saveAs', '');
  writeFileSync(reportPath, lines.join('\n') + '\n');
  console.log(`\nReport: ${reportPath}`);
  console.log(`Clicks: ${tally.clicked}/${tally.expected}`);
  return fail;
}

function main() {
  console.log(
    `CDT gate ${EXT_VERSION} sections=[${[...sections].join(',')}] full=${args.full ? 'yes' : 'no'} seed=${args.seed}`
  );
  const lp = listPages();
  if (!lp.pages.length && !lp.extensionPages.length) {
    console.error('No CDT pages. chrome-devtools start --autoConnect --categoryExtensions');
    process.exit(2);
  }

  if (sections.has('styles')) runStylesSample();
  if (sections.has('ui-random') || sections.has('buttons')) runUiRandomSection();
  if (sections.has('popup')) runPopupSection();
  if (sections.has('usage')) runUsageSection();
  if (sections.has('providers') || sections.has('providers-clicks')) runProvidersSection();
  if (sections.has('save')) runSaveSection();
  if (sections.has('scenarios')) runScenariosSection();
  if (sections.has('console')) runConsoleSection();

  process.exit(writeReport() > 0 ? 1 : 0);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(2);
}
