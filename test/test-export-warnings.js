// DOM-fallback signalling (definePlatform), incomplete-export / not-in-folder
// toasts (core.js) and the direct-write size limit (save.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { loadChatExport } from './core-harness.js';

const en = JSON.parse(readFileSync(new URL('../locales/LN_en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(readFileSync(new URL('../locales/LN_ru.json', import.meta.url), 'utf8'));
const noop = () => {};

let dpSeq = 0;
async function definePlatformEnv() {
  const win = new Window({ url: 'https://example.test/c/1' });
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.getComputedStyle = win.getComputedStyle.bind(win);
  const state = { dom: 0 };
  const base = {
    Ops: {},
    BAR_ATTR: 'data-x',
    platforms: {},
    RpcError: class extends Error {
      constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
      }
    },
    modelFenceTag: (m, f) => f,
    hydrateTranscript: async () => {
      state.dom++;
      return { items: { k: { payload: { role: 'user', text: 'from dom' } } }, order: ['k'] };
    }
  };
  win.ChatExport = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop) });
  const { definePlatform } = await import('../src/definePlatform.js?dp=' + dpSeq++);
  return { CE: win.ChatExport, state, definePlatform };
}

test('definePlatform marks API exports source:api and DOM fallbacks as incomplete', async () => {
  const { CE, state, definePlatform } = await definePlatformEnv();
  definePlatform({ id: 'p1', exportData: async () => ({ messages: [{ role: 'user', text: 'x' }] }) });
  const api = await CE.platforms.p1.getData();
  assert.equal(api.source, 'api');
  assert.equal(api.incomplete, undefined);

  definePlatform({ id: 'p2', exportData: async () => ({ messages: [{ role: 'user', text: 'x' }], warnings: ['missing-responses:2'] }) });
  const partial = await CE.platforms.p2.getData();
  assert.equal(partial.incomplete, true);

  for (const [id, fn, reason] of [
    ['p3', async () => null, 'api-unavailable'],
    ['p4', async () => {
      throw new Error('boom');
    }, 'api-error']
  ]) {
    definePlatform({ id, exportData: fn, turns: () => [], capture: () => null });
    const d = await CE.platforms[id].getData();
    assert.equal(d.source, 'dom');
    assert.equal(d.incomplete, true);
    assert.equal(d.fallbackReason, reason);
    assert.equal(JSON.stringify(d.warnings), '["api-unavailable"]');
  }
  assert.equal(state.dom, 2);
});

test('exportDomFallback:false never scrapes the DOM, even when exportData resolves null', async () => {
  const { CE, state, definePlatform } = await definePlatformEnv();
  definePlatform({ id: 'janitorai', exportData: async () => null, exportDomFallback: false, turns: () => [], capture: () => null });
  await assert.rejects(CE.platforms.janitorai.getData(), (e) => e.details && e.details.apiOnly === true);
  assert.equal(state.dom, 0);
});

function coreWithReply(reply) {
  const { win, CE } = loadChatExport();
  CE.setToastTranslator((key) => en[key] || key);
  const sent = [];
  win.chrome = {
    runtime: {
      id: 'test',
      lastError: undefined,
      sendMessage(msg, cb) {
        sent.push(msg);
        cb(typeof reply === 'function' ? reply(msg) : reply);
      }
    }
  };
  win.console.warn = () => {};
  return { win, CE, sent };
}

const MSGS = [
  { role: 'user', text: 'hi' },
  { role: 'assistant', text: 'hello' }
];
const toastOf = (win) => (win.document.querySelector('.chat-export-toast') || {}).textContent || '';

test('incomplete DOM export: the saved toast carries the localized warning', async () => {
  const { win, CE } = coreWithReply({ ok: true, via: 'folder', name: 'a.md', folder: 'Exports' });
  await CE.exportConversation({ platform: 'chatgpt', title: 'T', messages: MSGS, formats: ['md'], pack: 'file', source: 'dom', incomplete: true, warnings: ['api-unavailable'] });
  const t = toastOf(win);
  assert.ok(t.startsWith('Saved to «Exports»: a.md'), t);
  assert.ok(t.includes(en['toast.incompleteDom']), t);
});

test('API export with missing responses names the count; complete export has no warning', async () => {
  const a = coreWithReply({ ok: true, via: 'folder', name: 'a.md', folder: 'Exports' });
  await a.CE.exportConversation({ platform: 'grok', title: 'T', messages: MSGS, formats: ['md'], pack: 'file', source: 'api', incomplete: true, warnings: ['missing-responses:3'] });
  assert.ok(toastOf(a.win).includes('3 messages could not be loaded'), toastOf(a.win));
  const b = coreWithReply({ ok: true, via: 'folder', name: 'a.md', folder: 'Exports' });
  await b.CE.exportConversation({ platform: 'grok', title: 'T', messages: MSGS, formats: ['md'], pack: 'file', source: 'api' });
  assert.equal(toastOf(b.win), 'Saved to «Exports»: a.md');
});

test('too-large / write error: Downloads toast says the file is NOT in the folder', async () => {
  for (const reason of ['too-large', 'error']) {
    const { win, CE } = coreWithReply((msg) => (msg.type === 'ce-save' ? { ok: false, reason } : { ok: true, id: 1 }));
    const res = await CE.exportConversation({ platform: 'chatgpt', title: 'Big', messages: MSGS, formats: ['md'], pack: 'file' });
    assert.equal(res.via, 'downloads');
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(toastOf(win).startsWith('Saved to Downloads, NOT to your folder:'), reason + ': ' + toastOf(win));
  }
  const plain = coreWithReply((msg) => (msg.type === 'ce-save' ? { ok: false, reason: 'unsupported' } : { ok: true, id: 1 }));
  await plain.CE.exportConversation({ platform: 'chatgpt', title: 'X', messages: MSGS, formats: ['md'], pack: 'file' });
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(toastOf(plain.win).startsWith('Downloaded:'), toastOf(plain.win));
});

test('new toast keys exist in EN and RU with matching placeholders', () => {
  for (const k of ['toast.incompleteDom', 'toast.incompleteApi', 'toast.incompleteMissing', 'toast.incompleteCap', 'toast.incompletePage', 'toast.downloadedNotFolder', 'toast.apiOnlyFailed']) {
    assert.ok(en[k] && ru[k], k);
    assert.notEqual(en[k], ru[k], k);
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    assert.equal(ph(en[k]), ph(ru[k]), k);
  }
});
