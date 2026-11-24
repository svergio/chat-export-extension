// JanitorAI KI-006..KI-009 (docs/investigation/known-issues.md) on synthetic
// REST fixtures shaped after docs/investigation/janitor/janitorai.com-session1.md:
// metadata/context (006), file name with chat id (007), export while a reply
// streams (008), cancelled turn without a reply (009).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { loadChatExport } from './core-harness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fx = (n) => JSON.parse(readFileSync(join(root, 'test/fixtures/providers', n), 'utf8'));
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(root, 'locales/LN_ru.json'), 'utf8'));
const COOKIE = 'sb-auth-auth-token=' + encodeURIComponent(JSON.stringify({ access_token: 't' }));
const noop = () => {};
const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

class RpcError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const COMPOSER = (btn) =>
  '<div class="_chatInputInner_x"><textarea class="_chatTextarea_x"></textarea>' +
  '<div class="_controlsRight_x">' + btn + '</div></div>';

function loadJanitor({ url = 'https://janitorai.com/ru/chats/3281735783', html = '', data, ops = {} } = {}) {
  const win = new Window({ url });
  win.document.write('<!doctype html><html><body>' + html + '</body></html>');
  // happy-dom has no layout: give every element a visible box.
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40 });
  let spec = null;
  const state = { data, fetches: 0 };
  const Ops = new Proxy(Object.assign({ sleep: async () => {}, toIso: (x) => x || null }, ops), {
    get: (t, k) => (k in t ? t[k] : noop)
  });
  win.ChatExport = new Proxy(
    {
      definePlatform: (s) => {
        spec = s;
      },
      Ops,
      platforms: {},
      RpcError,
      modelFenceTag: (_m, fb) => fb,
      BAR_ATTR: 'data-chat-export-bar',
      isPlatformEnabled: () => true,
      getPlatformSettings: () => ({})
    },
    { get: (t, k) => (k in t ? t[k] : noop) }
  );
  win.fetch = async () => {
    state.fetches++;
    const body = typeof state.data === 'function' ? state.data(state.fetches) : state.data;
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
  Object.defineProperty(win.document, 'cookie', { configurable: true, get: () => COOKIE });
  win.eval(readFileSync(join(root, 'content/janitorai.js'), 'utf8'));
  return { spec, win, state };
}

function coreWithSave() {
  const { win, CE } = loadChatExport('https://janitorai.com/ru/chats/3281735783');
  CE.setToastTranslator((key, vars) => {
    let s = en[key] || key;
    for (const k of Object.keys(vars || {})) s = s.replace('{' + k + '}', vars[k]);
    return s;
  });
  win.chrome = {
    runtime: { id: 'test', lastError: undefined, sendMessage: (_m, cb) => cb({ ok: true, via: 'folder', name: 'a.json', folder: 'Exports' }) }
  };
  win.console.warn = () => {};
  return { win, CE };
}
const toastOf = (win) => (win.document.querySelector('.chat-export-toast') || {}).textContent || '';

// ---------------------------------------------------------------- KI-006

test('KI-006: payload keeps message metadata, persona and chat/character context', async () => {
  const { spec } = loadJanitor({ data: fx('janitorai-full.json') });
  const d = plain(await spec.exportData());
  assert.deepEqual(d.messages.map((m) => m.text), ['greet', 'hi', 'reply-1', 'cancelled-turn', 'resent', 'reply-2']);
  assert.deepEqual(d.messages[2].meta, {
    id: 3,
    created_at: '2026-11-22T10:02:00.000Z',
    rating: 1,
    is_main: true,
    generation_request_ids: ['req_a']
  });
  assert.equal(d.messages[1].meta.is_main, true);
  assert.equal(d.messages[5].meta.is_main, false);
  assert.equal(d.userName, 'oleg');
  assert.equal(d.userHandle, 'Oleg_Tinkoff');
  assert.equal(d.context.conversation_locale, 'ru');
  assert.equal(d.context.summary, 'Snow probe summary');
  assert.equal(d.context.chat_created_at, '2026-11-22T10:00:00.000Z');
  assert.equal(d.context.fork_source_chat_id, 2479896085);
  assert.equal(d.context.is_public, false);
  assert.deepEqual(d.context.persona, { id: 'p-profile', name: 'oleg', user_name: 'Oleg_Tinkoff', type: 'profile' });
  assert.equal(d.context.character.name, 'Q Cold');
  assert.equal(d.context.character.chat_name, 'Q');
  assert.equal(d.context.character.description, 'A cold character card.');
  assert.equal(d.context.character.first_message, 'greet');
  assert.equal(d.model, '', 'model is only in the WebSocket stream (provider limit)');
});

test('KI-006: explicit persona_id wins over the profile persona', async () => {
  const data = fx('janitorai-full.json');
  data.chat.persona_id = 'p-alt';
  const { spec } = loadJanitor({ data });
  const d = plain(await spec.exportData());
  assert.equal(d.userName, 'alt');
  assert.equal(d.context.persona_id, 'p-alt');
});

test('KI-006: JSON chat-export/1 gains optional context + messages[].meta, MD gets the persona name', async () => {
  const { spec } = loadJanitor({ data: fx('janitorai-full.json') });
  const d = plain(await spec.exportData());
  const { CE } = loadChatExport();
  const bundle = await CE.buildExportBundle(Object.assign({ platform: 'janitorai', formats: ['json', 'md'] }, d));
  const json = JSON.parse(bundle.files.find((f) => f.ext === 'json').data);
  assert.equal(json.schema, 'chat-export/1');
  for (const k of ['platform', 'url', 'title', 'exported_at', 'chat_id', 'messages']) assert.ok(k in json, k);
  assert.equal(json.user_name, 'oleg');
  assert.equal(json.context.character.name, 'Q Cold');
  assert.equal(json.messages[0].role, 'assistant');
  assert.equal(json.messages[0].role_tag, 'janitorai');
  assert.equal(json.messages[2].meta.generation_request_ids[0], 'req_a');
  const md = bundle.files.find((f) => f.ext === 'md').data;
  assert.match(md, /user_name: oleg/);
  // Providers that do not send context/meta keep the old JSON shape.
  const other = await CE.buildExportBundle({ platform: 'chatgpt', title: 'T', formats: ['json'], messages: [{ role: 'user', text: 'x' }] });
  const oj = JSON.parse(other.files[0].data);
  assert.equal('context' in oj, false);
  assert.deepEqual(Object.keys(oj.messages[0]), ['role', 'role_tag', 'text']);
});

// ---------------------------------------------------------------- KI-007

test('KI-007: file name carries the chat id; other providers keep title+date', async () => {
  const { spec } = loadJanitor({ data: fx('janitorai-full.json') });
  const d = plain(await spec.exportData());
  assert.equal(d.fileKey, '3281735783');
  const { CE } = loadChatExport();
  const day = CE.dateStamp();
  const a = await CE.buildExportBundle({ platform: 'janitorai', title: 'Q Cold', fileKey: '3281735783', formats: ['md'], messages: d.messages });
  const b = await CE.buildExportBundle({ platform: 'janitorai', title: 'Q Cold', fileKey: '3281799149', formats: ['md'], messages: d.messages });
  assert.equal(a.base, 'janitorai-Q_Cold-3281735783-' + day);
  assert.notEqual(a.base, b.base);
  assert.equal(a.files[0].filename, a.base + '.md');
  const c = await CE.buildExportBundle({ platform: 'chatgpt', title: 'Q Cold', formats: ['md'], messages: d.messages });
  assert.equal(c.base, 'chatgpt-Q_Cold-' + day);
  const s = await CE.buildExportBundle({ platform: 'x', title: 'T', fileKey: '../a b\\c', formats: ['md'], messages: d.messages });
  assert.equal(s.base, 'x-T-..abc-' + day);
});

// ---------------------------------------------------------------- KI-008

function generatingData() {
  const data = fx('janitorai-full.json');
  data.chatMessages = data.chatMessages.filter((m) => m.id <= 5); // in-flight reply not persisted yet
  return data;
}

test('KI-008: still streaming ("Отмена" in the composer) -> generation-active warning, no dangling mark', async () => {
  const { spec } = loadJanitor({ html: COMPOSER('<button class="_sendButton_x">Отмена</button>'), data: generatingData() });
  const d = plain(await spec.exportData());
  assert.deepEqual(d.warnings, ['generation-active']);
  assert.equal(d.messages.at(-1).text, 'resent');
  assert.equal(d.messages.at(-1).meta.no_reply, undefined);
  assert.deepEqual(d.notes, ['dangling-turns:1'], 'only the earlier cancelled turn');
});

test('KI-008: English "Cancel" counts in the composer, but an edit-form "Отмена" elsewhere does not', async () => {
  const enUi = loadJanitor({ url: 'https://janitorai.com/chats/3281735783', html: COMPOSER('<button aria-label="Cancel"></button>'), data: generatingData() });
  assert.deepEqual(plain((await enUi.spec.exportData()).warnings), ['generation-active']);
  const edit = loadJanitor({
    html: '<div class="_message_x"><textarea></textarea><button>Сохранить</button><button>Отмена</button></div>' + COMPOSER('<button class="_sendButton_x">Отправить</button>'),
    data: generatingData()
  });
  const d = plain(await edit.spec.exportData());
  assert.deepEqual(d.warnings, []);
  assert.equal(d.messages.at(-1).meta.no_reply, true, 'idle + trailing user row = dangling (KI-009)');
});

test('KI-008: export waits for the stream to end and then reads the persisted reply', async () => {
  let doc = null;
  const waits = [];
  const ops = {
    waitFor: async (fn, opts) => {
      waits.push(opts && opts.timeoutMs);
      // the stream finishes while we wait: the button flips back to "send"
      doc.querySelector('._sendButton_x').textContent = 'Отправить';
      return fn();
    }
  };
  const { spec, win, state } = loadJanitor({
    html: COMPOSER('<button class="_sendButton_x">Отмена</button>'),
    data: () => fx('janitorai-full.json'),
    ops
  });
  doc = win.document;
  const d = plain(await spec.exportData());
  assert.equal(waits.length, 1);
  assert.ok(waits[0] >= 10000 && waits[0] <= 60000, 'bounded wait');
  assert.deepEqual(d.warnings, []);
  assert.equal(d.messages.at(-1).text, 'reply-2');
  assert.equal(state.fetches, 1);
});

test('KI-008: generation-active becomes a localized "may be incomplete" toast', async () => {
  const { win, CE } = coreWithSave();
  await CE.exportConversation({ platform: 'janitorai', title: 'T', messages: [{ role: 'user', text: 'x' }], formats: ['json'], pack: 'file', source: 'api', incomplete: true, warnings: ['generation-active'] });
  const t = toastOf(win);
  assert.ok(t.includes(en['toast.incompleteGenerating']), t);
  assert.ok(t.includes('may be incomplete'), t);
});

// ---------------------------------------------------------------- KI-009

test('KI-009: cancelled turns are marked meta.no_reply and reported as a note, not as incomplete', async () => {
  const { spec } = loadJanitor({ data: fx('janitorai-full.json') });
  const d = plain(await spec.exportData());
  assert.deepEqual(d.warnings, []);
  assert.deepEqual(d.notes, ['dangling-turns:1']);
  const marked = d.messages.filter((m) => m.meta && m.meta.no_reply).map((m) => m.text);
  assert.deepEqual(marked, ['cancelled-turn']);
  assert.equal(d.messages.length, 6, 'the dangling turn is still exported (it exists on the provider)');

  const { win, CE } = coreWithSave();
  await CE.exportConversation(Object.assign({ formats: ['json'], pack: 'file', source: 'api' }, d, { platform: 'janitorai' }));
  const t = toastOf(win);
  assert.ok(t.includes('1 message(s) without a reply'), t);
  assert.ok(!t.includes('may be incomplete'), t);
});

test('KI-009: a trailing user row while idle is dangling too; a normal chat has no notes', async () => {
  const data = fx('janitorai-full.json');
  data.chatMessages = data.chatMessages.filter((m) => m.id <= 2);
  const a = plain(await loadJanitor({ data }).spec.exportData());
  assert.deepEqual(a.notes, ['dangling-turns:1']);
  assert.equal(a.messages.at(-1).meta.no_reply, true);
  const ok = fx('janitorai-full.json');
  ok.chatMessages = ok.chatMessages.filter((m) => m.id !== 4);
  const b = plain(await loadJanitor({ data: ok }).spec.exportData());
  assert.deepEqual(b.notes, []);
  assert.ok(b.messages.every((m) => !m.meta.no_reply));
});

test('KI-008/009 toast keys exist in EN and RU with matching placeholders', () => {
  for (const k of ['toast.incompleteGenerating', 'toast.noteDangling']) {
    assert.ok(en[k] && ru[k], k);
    assert.notEqual(en[k], ru[k], k);
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    assert.equal(ph(en[k]), ph(ru[k]), k);
  }
});
