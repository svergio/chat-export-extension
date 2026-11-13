#!/usr/bin/env node
/**
 * Chrome DevTools (CDT) release gate for Chat Export.
 *
 * Requires user Chrome with remote debugging + chrome-devtools CLI:
 *   chrome-devtools start --autoConnect --categoryExtensions --no-usage-statistics
 *
 * Usage:
 *   npm run test:cdt
 *   npm run test:cdt -- --save=zai,deepseek
 *   npm run test:cdt -- --no-save
 *   npm run test:cdt -- --open-missing
 *
 * Exit 0 = all required checks PASS / SKIP. Exit 1 = any FAIL.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
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

const PROVIDERS = [
  { id: 'chatgpt', hostRe: /chatgpt\.com|chat\.openai\.com/i, start: 'https://chatgpt.com/' },
  { id: 'grok', hostRe: /(?:^|\.)grok\.com$/i, start: 'https://grok.com/', hostOf: (u) => safeHost(u) === 'grok.com' },
  { id: 'grok-x', hostRe: /(?:^|\.)(x|twitter)\.com$/i, start: 'https://x.com/i/grok' },
  { id: 'copilot', hostRe: /github\.com/i, start: 'https://github.com/copilot', pathHint: /copilot/i },
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
const saveIds = args.noSave
  ? []
  : (args.save || 'zai,deepseek')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

const results = [];
const started = new Date().toISOString();

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  const out = { openMissing: false, noSave: false, save: null, report: null, requireFolder: true };
  for (const a of argv) {
    if (a === '--open-missing') out.openMissing = true;
    else if (a === '--no-save') out.noSave = true;
    else if (a === '--allow-no-folder') out.requireFolder = false;
    else if (a.startsWith('--save=')) out.save = a.slice(7);
    else if (a.startsWith('--report=')) out.report = a.slice(9);
  }
  return out;
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
  const startObj = raw.indexOf('{');
  const startArr = raw.indexOf('[');
  let i = -1;
  if (startObj >= 0 && (startArr < 0 || startObj < startArr)) i = startObj;
  else if (startArr >= 0) i = startArr;
  if (i < 0) throw new Error(`no JSON in CDT output: ${raw.slice(0, 300)}`);
  const sliced = sliceBalanced(raw, i);
  if (!sliced) throw new Error(`unterminated JSON in CDT output: ${raw.slice(i, i + 200)}`);
  const parsed = JSON.parse(sliced);
  if (parsed && typeof parsed.message === 'string' && /```json/i.test(parsed.message)) {
    const inner = parsed.message.match(/```json\s*([\s\S]*?)```/i);
    if (inner) return JSON.parse(inner[1].trim());
  }
  if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'result')) return parsed.result;
  return parsed;
}

function listPages() {
  const data = extractJson(cdt(['list_pages']));
  return {
    pages: data.pages || [],
    sw: data.extensionServiceWorkers || []
  };
}

function evalPage(pageId, probeName) {
  const sourcePath = join(PROBES, probeName);
  const filePath = join(OUT_DIR, `${pageId}-${probeName.replace(/\.js$/, '')}-${Date.now()}.json`);
  const args = [
    'evaluate_script',
    '--sourcePath',
    sourcePath,
    '--pageId',
    String(pageId),
    '--filePath',
    filePath,
    '--waitForStableDom',
    'false'
  ];
  const raw = cdt(args, { timeout: 30000 });
  try {
    return extractJson(readFileSync(filePath, 'utf8'));
  } catch {
    return extractJson(raw);
  }
}

function takeSnapshot(pageId) {
  const filePath = join(OUT_DIR, `snap-${pageId}-${Date.now()}.txt`);
  const raw = cdt(['take_snapshot', String(pageId), '--filePath', filePath], { timeout: 60000 });
  try {
    const meta = extractJson(raw);
    if (meta && meta.snapshotFilePath) return readFileSync(meta.snapshotFilePath, 'utf8');
  } catch {
    /* fall through */
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    // CLI sometimes only returns markdown body when file write is skipped.
    const idx = raw.indexOf('## Latest page snapshot');
    if (idx >= 0) return raw.slice(idx);
    throw new Error(`snapshot missing for page ${pageId}`);
  }
}

function findUid(snapshot, patterns) {
  const lines = snapshot.split('\n');
  for (const re of patterns) {
    for (const line of lines) {
      if (!re.test(line)) continue;
      const m = line.match(/uid=([^\s]+)/);
      if (m) return m[1];
    }
  }
  return null;
}

function clickUid(pageId, uid) {
  cdt(['click', String(pageId), uid], { timeout: 30000 });
}

function sleep(ms) {
  spawnSync('sleep', [String(Math.max(0.1, ms / 1000))], { timeout: ms + 2000 });
}

function matchProvider(page, provider) {
  const host = safeHost(page.url || '');
  if (provider.hostOf) return provider.hostOf(page.url || '');
  if (!provider.hostRe.test(host)) return false;
  if (provider.pathHint) {
    try {
      return provider.pathHint.test(new URL(page.url).pathname + new URL(page.url).search);
    } catch {
      return false;
    }
  }
  return true;
}

function findPage(pages, provider) {
  const hits = pages.filter((p) => matchProvider(p, provider));
  if (!hits.length) return null;
  // Prefer chat/thread URLs over marketing home when multiple.
  hits.sort((a, b) => scoreUrl(b.url) - scoreUrl(a.url));
  return hits[0];
}

function scoreUrl(url) {
  let s = 0;
  if (/\/c\/|\/chat\/|conversation=|\/a\/chat\//i.test(url)) s += 10;
  if (/\/new\/?$/i.test(url)) s -= 2;
  return s;
}

function record(row) {
  results.push(row);
  const mark = row.status === 'PASS' ? 'PASS' : row.status === 'SKIP' ? 'SKIP' : 'FAIL';
  console.log(`[${mark}] ${row.id}${row.detail ? ' — ' + row.detail : ''}`);
}

function folderHtmlPages(pages) {
  return pages.filter((p) => /chrome-extension:\/\/[^/]+\/folder\.html/i.test(p.url || ''));
}

function listNewFiles(dir, sinceMs) {
  try {
    return readdirSync(dir)
      .map((name) => {
        const p = join(dir, name);
        const st = statSync(p);
        return { name, mtimeMs: st.mtimeMs, size: st.size };
      })
      .filter((f) => f.mtimeMs >= sinceMs - 2000)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return null;
  }
}

function ensureProviderPage(provider, pages) {
  let page = findPage(pages, provider);
  if (page) return page;
  if (!args.openMissing) return null;
  cdt(['new_page', provider.start], { allowFail: true });
  sleep(2500);
  pages = listPages().pages;
  return findPage(pages, provider);
}

function checkBar(provider, page) {
  const probe = evalPage(page.id, 'bar.js');
  const fail = [];
  if (!probe.hasBar) {
    if (provider.id === 'janitorai' && /janitorai\.com\/?(ru)?\/?$/i.test(page.url || '')) {
      record({
        id: `${provider.id}/bar`,
        status: 'SKIP',
        detail: 'landing page without chat composer — open a chat before gate'
      });
      return true;
    }
    fail.push('no ExportBar');
  }
  if (probe.platform && probe.platform !== provider.id) fail.push(`platform=${probe.platform} want ${provider.id}`);
  if (probe.hasBar && !probe.ver) fail.push('no data-chat-export-v');
  else if (probe.ver && probe.ver !== EXT_VERSION) fail.push(`ver=${probe.ver} want ${EXT_VERSION}`);
  if (probe.hasBar && !probe.hasFmt) fail.push('no .chat-export-fmt');
  if (probe.hasBar && !probe.hasDl) fail.push('no .chat-export-dl');
  if (probe.hasBar && !probe.hasFolder) fail.push('no folder pill');
  if (args.requireFolder && probe.folderWarn) fail.push('folder warn/regrant');
  if (args.requireFolder && probe.hasFolder && !probe.folderTitle) fail.push('folder title empty');
  if (
    probe.barBox &&
    probe.hasBar &&
    probe.barBox.display === 'none' &&
    probe.dlBox &&
    probe.dlBox.display === 'none'
  ) {
    fail.push('bar not visible');
  }

  let menuOk = null;
  if (probe.hasFmt && !fail.includes('no ExportBar')) {
    try {
      const snap = takeSnapshot(page.id);
      const fmtUid = findUid(snap, [
        /button "[^"]*(Формат экспорта|Export format)[^"]*"/i,
        /button "[^"]*MD[^"]*".*expandable/i
      ]);
      if (!fmtUid) {
        menuOk = false;
        fail.push('fmt button uid not in snapshot');
      } else {
        clickUid(page.id, fmtUid);
        sleep(400);
        const after = evalPage(page.id, 'bar.js');
        menuOk = !!(after && (after.fmtExpanded || after.menuOpen));
        if (!menuOk) {
          // Portal menu may not flip aria if snapshot click hit a duplicate control.
          const snap2 = takeSnapshot(page.id);
          menuOk = /data-chat-export-menu|chat-export-menu-item|MD\b.*YAML|Архив|Папка|Archive|Folder/i.test(
            snap2
          );
        }
        try {
          const escSnap = takeSnapshot(page.id);
          const fmtUid2 = findUid(escSnap, [
            /button "[^"]*(Формат экспорта|Export format)[^"]*"/i
          ]);
          if (fmtUid2) clickUid(page.id, fmtUid2);
        } catch {
          /* ignore close */
        }
        if (!menuOk) fail.push('fmt menu did not open');
      }
    } catch (err) {
      fail.push(`menu click: ${err.message || err}`);
    }
  }

  record({
    id: `${provider.id}/bar`,
    status: fail.length ? 'FAIL' : 'PASS',
    detail: fail.length
      ? fail.join('; ')
      : `v${probe.ver} folder="${probe.folderTitle || ''}" scheme=${probe.scheme || '?'} menu=${menuOk}`,
    probe
  });
  return fail.length === 0;
}

function checkSilentSave(provider, page) {
  const before = listPages();
  const folderBefore = folderHtmlPages(before.pages).map((p) => p.id);
  const since = Date.now();
  evalPage(page.id, 'toast-arm.js');
  let clicked = false;
  try {
    const snap = takeSnapshot(page.id);
    const dlUid = findUid(snap, [
      /button "[^"]*(Скачать чат|Download chat|Скачать|Download)[^"]*"/i
    ]);
    if (!dlUid) {
      record({ id: `${provider.id}/save`, status: 'FAIL', detail: 'download button uid missing in snapshot' });
      return false;
    }
    clickUid(page.id, dlUid);
    clicked = true;
  } catch (err) {
    record({ id: `${provider.id}/save`, status: 'FAIL', detail: `download click: ${err.message || err}` });
    return false;
  }
  if (!clicked) {
    record({ id: `${provider.id}/save`, status: 'FAIL', detail: 'download click failed' });
    return false;
  }

  let toast = null;
  for (let i = 0; i < 24; i++) {
    sleep(500);
    const read = evalPage(page.id, 'toast-read.js');
    const texts = [...(read.log || []).map((t) => t.text), ...(read.live || [])];
    toast = texts.find(Boolean) || null;
    if (toast) break;
  }

  const after = listPages();
  const folderAfter = folderHtmlPages(after.pages);
  const newFolderTabs = folderAfter.filter((p) => !folderBefore.includes(p.id));
  const files = listNewFiles(FOLDER_DIR, since);

  const fail = [];
  if (!toast) fail.push('no toast');
  else {
    const okFolder = /Сохранено|Saved to|Saved in/i.test(toast);
    const okDl = /Скачано|Downloaded/i.test(toast);
    const empty = /нечего|nothing to export|empty/i.test(toast);
    const regrant = /доступ|re-?grant|folder|папк/i.test(toast) && /восстанов|revoke|grant|выбер/i.test(toast);
    if (empty) {
      record({
        id: `${provider.id}/save`,
        status: 'SKIP',
        detail: `empty chat: ${toast}`
      });
      return true;
    }
    if (regrant || /needs_regrant|permission/i.test(toast)) fail.push(`regrant toast: ${toast}`);
    else if (!okFolder && okDl) fail.push(`downloads fallback (not silent folder): ${toast}`);
    else if (!okFolder) fail.push(`unexpected toast: ${toast}`);
  }
  if (newFolderTabs.length) fail.push(`opened folder.html tabs: ${newFolderTabs.map((p) => p.url).join(', ')}`);
  if (files && files.length === 0 && toast && /Сохранено|Saved/i.test(toast)) {
    fail.push(`toast ok but no new file in ${FOLDER_DIR}`);
  }

  record({
    id: `${provider.id}/save`,
    status: fail.length ? 'FAIL' : 'PASS',
    detail: fail.length
      ? fail.join('; ')
      : `${toast}${files && files[0] ? ` file=${files[0].name}` : ''}`,
    toast,
    files: files && files.slice(0, 3)
  });
  return fail.length === 0;
}

function checkExtensionSw(swList) {
  const sws = swList.filter((s) => (s.url || '').includes(EXT_ID));
  if (!sws.length) {
    record({ id: 'extension/sw', status: 'FAIL', detail: `no SW for ${EXT_ID}` });
    return false;
  }
  // Version asserted via ExportBar data-chat-export-v on each provider (SW eval is flaky under CDT).
  record({
    id: 'extension/sw',
    status: 'PASS',
    detail: `${sws.length} worker(s) ${EXT_ID}; expect bar v${EXT_VERSION}`
  });
  return true;
}

function writeReport() {
  const reportPath =
    args.report || join(ROOT, 'docs', 'qa', `${EXT_VERSION}-cdt-gate.md`);
  mkdirSync(dirname(reportPath), { recursive: true });
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const skip = results.filter((r) => r.status === 'SKIP').length;
  const lines = [
    `# ${EXT_VERSION} CDT gate`,
    '',
    `- Started: ${started}`,
    `- Finished: ${new Date().toISOString()}`,
    `- Extension: \`${EXT_ID}\` manifest **${EXT_VERSION}**`,
    `- Folder dir: \`${FOLDER_DIR}\``,
    `- Save providers: ${saveIds.length ? saveIds.join(', ') : '(none)'}`,
    `- Summary: **${pass} PASS** / **${fail} FAIL** / **${skip} SKIP**`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |'
  ];
  for (const r of results) {
    const detail = String(r.detail || '')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, ' ');
    lines.push(`| \`${r.id}\` | ${r.status} | ${detail} |`);
  }
  lines.push('');
  writeFileSync(reportPath, lines.join('\n') + '\n');
  console.log(`\nReport: ${reportPath}`);
  return { reportPath, pass, fail, skip };
}

function main() {
  console.log(`CDT gate ${EXT_VERSION} via ${CDT}`);
  let { pages, sw } = listPages();
  if (!pages.length) {
    console.error('No pages from chrome-devtools. Start with: chrome-devtools start --autoConnect --categoryExtensions');
    process.exit(2);
  }

  checkExtensionSw(sw);

  for (const provider of PROVIDERS) {
    const page = ensureProviderPage(provider, pages);
    if (!page) {
      record({
        id: `${provider.id}/bar`,
        status: 'FAIL',
        detail: `no open tab (use --open-missing or open ${provider.start})`
      });
      continue;
    }
    try {
      checkBar(provider, page);
    } catch (err) {
      record({ id: `${provider.id}/bar`, status: 'FAIL', detail: String(err.message || err) });
    }
  }

  pages = listPages().pages;
  for (const id of saveIds) {
    const provider = PROVIDERS.find((p) => p.id === id);
    if (!provider) {
      record({ id: `${id}/save`, status: 'FAIL', detail: 'unknown provider id' });
      continue;
    }
    const page = findPage(pages, provider);
    if (!page) {
      record({ id: `${id}/save`, status: 'FAIL', detail: 'no tab' });
      continue;
    }
    try {
      checkSilentSave(provider, page);
    } catch (err) {
      record({ id: `${id}/save`, status: 'FAIL', detail: String(err.message || err) });
    }
  }

  const { fail } = writeReport();
  process.exit(fail > 0 ? 1 : 0);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(2);
}
