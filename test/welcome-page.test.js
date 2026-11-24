import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));
const html = readFileSync(join(root, 'welcome.html'), 'utf8');
const bundle = readFileSync(join(root, 'dist/welcome.js'), 'utf8');

const URLS = {
  rateLink: 'https://chromewebstore.google.com/detail/chat-export/ecnkhadaajiodlaoflkjjnaclhloejgg',
  discordLink: 'https://discord.gg/QxJW9qt2KW',
  githubLink: 'https://github.com/svergio/chat-export-extension',
  issuesLink: 'https://github.com/svergio/chat-export-extension/issues',
  donateLink: 'https://www.donationalerts.com/r/svwergio_mel'
};

// Minimal IndexedDB with the shape src/folder/store.js uses.
function fakeIndexedDB(data) {
  return {
    open() {
      const req = {};
      setTimeout(() => {
        req.result = {
          objectStoreNames: { contains: () => true },
          createObjectStore() {},
          close() {},
          transaction() {
            const t = {};
            const store = {
              get: (k) => ({ result: data.get(k) }),
              put: (v, k) => (data.set(k, v), { result: k }),
              delete: (k) => (data.delete(k), {})
            };
            t.objectStore = () => store;
            setTimeout(() => t.oncomplete && t.oncomplete());
            return t;
          }
        };
        req.onsuccess && req.onsuccess();
      });
      return req;
    }
  };
}

function openWelcome(opts = {}) {
  const win = new Window({ url: 'chrome-extension://test-id/welcome.html' });
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[^>]*><\/script>/g, '');
  win.document.body.innerHTML = body;
  const idb = new Map(opts.existing ? [['default', opts.existing]] : []);
  const sent = [];
  const removed = [];
  win.indexedDB = fakeIndexedDB(idb);
  win.chrome = {
    i18n: { getUILanguage: () => 'en' },
    storage: { local: { get: (keys, cb) => cb({}), set: (obj, cb) => cb && cb() } },
    tabs: {
      query: (q, cb) => (cb ? cb([]) : Promise.resolve([])),
      getCurrent: () => Promise.resolve({ id: 7 }),
      remove: (id) => (removed.push(id), Promise.resolve())
    },
    windows: { getLastFocused: (o, cb) => (cb ? cb(null) : Promise.resolve(null)) },
    runtime: {
      sendMessage: (msg) => {
        sent.push(msg);
        if (opts.bridgeThrows) throw new Error('runtime gone');
        if (msg.action === 'folderQueue') return Promise.resolve({ ok: true, count: opts.queued || 0 });
        if (msg.action === 'folderPicked') return Promise.resolve(opts.picked || { ok: true, saved: 0 });
        return Promise.resolve({ ok: true });
      }
    }
  };
  if (opts.picker !== false) {
    win.showDirectoryPicker = opts.picker || (async () => ({ name: 'Exports', requestPermission: async () => 'granted' }));
  }
  win.eval(bundle);
  return { win, doc: win.document, idb, sent, removed };
}

async function until(fn, label) {
  for (let i = 0; i < 200; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  assert.fail('timed out waiting for ' + label);
}

function msg(doc) {
  const el = doc.getElementById('msg');
  return { text: el.textContent, tone: el.dataset.tone || null };
}

async function ready(page) {
  await until(() => page.doc.body.classList.contains('is-ready'), 'is-ready');
  await new Promise((r) => setTimeout(r, 20));
}

async function clickPick(page) {
  page.doc.getElementById('pick').click();
  await until(() => msg(page.doc).text && !page.doc.getElementById('pick').disabled, 'pick result');
}

test('welcome renders localized sections in order with the real links', async () => {
  const page = openWelcome();
  await ready(page);
  const { doc } = page;
  assert.equal(doc.getElementById('title').textContent, en['onboarding.title']);
  assert.equal(doc.getElementById('queueNote').textContent, en['onboarding.queueNote']);
  assert.equal(doc.getElementById('pick').textContent, en['folderPage.pick']);
  const ids = Array.from(doc.querySelectorAll('h1, section, #note')).map((n) => n.id);
  assert.deepEqual(ids, ['title', 'step-folder', 'step-rate', 'step-help', 'step-links', 'note']);
  for (const id in URLS) {
    const a = doc.getElementById(id);
    assert.equal(a.getAttribute('href'), URLS[id]);
    assert.ok(a.textContent.trim(), id + ' has a label');
  }
});

test('pick ok: handle stored, queue drained via allQueued, saved count shown', async () => {
  const page = openWelcome({ picked: { ok: true, saved: 2 } });
  await ready(page);
  await clickPick(page);
  assert.equal(page.idb.get('default').name, 'Exports');
  const picked = page.sent.find((m) => m.action === 'folderPicked');
  assert.equal(picked.allQueued, true);
  const m = msg(page.doc);
  assert.equal(m.tone, 'ok');
  assert.ok(m.text.startsWith(en['onboarding.picked'].replace('{name}', 'Exports')));
  assert.ok(m.text.includes(en['folderPage.savedMany'].replace('{count}', '2').replace('{name}', 'Exports')));
});

test('pick ok but queued writes failed: folder still reported, reason localized, no raw code', async () => {
  const page = openWelcome({ picked: { ok: false, reason: 'permission', saved: 0, pending: 1 } });
  await ready(page);
  await clickPick(page);
  const m = msg(page.doc);
  assert.equal(m.tone, 'warn');
  assert.ok(m.text.includes(en['onboarding.picked'].replace('{name}', 'Exports')));
  assert.ok(m.text.includes(en['onboarding.err.permission']));
  assert.ok(!m.text.includes('permission'), 'no raw reason code');
});

test('picker aborted: nothing stored, gentle hint', async () => {
  const page = openWelcome({
    picker: async () => {
      throw new page.win.DOMException('closed', 'AbortError');
    }
  });
  await ready(page);
  await clickPick(page);
  assert.deepEqual(msg(page.doc), { text: en['folderPage.notPicked'], tone: 'warn' });
  assert.equal(page.idb.size, 0);
  assert.equal(page.sent.filter((m) => m.action === 'folderPicked').length, 0);
});

test('permission denied: nothing stored, localized permission message', async () => {
  const page = openWelcome({
    picker: async () => ({ name: 'Exports', requestPermission: async () => 'denied' })
  });
  await ready(page);
  await clickPick(page);
  assert.deepEqual(msg(page.doc), { text: en['onboarding.err.permission'], tone: 'danger' });
  assert.equal(page.idb.size, 0);
});

test('no File System Access API: pick disabled with an explanation', async () => {
  const page = openWelcome({ picker: false });
  await ready(page);
  assert.equal(page.doc.getElementById('pick').disabled, true);
  assert.deepEqual(msg(page.doc), { text: en['saveFolder.unsupported'], tone: 'warn' });
});

test('queued exports are announced before the user picks', async () => {
  const page = openWelcome({ queued: 2 });
  await ready(page);
  assert.equal(msg(page.doc).text, en['folderPage.pendingMany'].replace('{count}', '2'));
});

test('Done closes the welcome tab', async () => {
  const page = openWelcome();
  await ready(page);
  page.doc.getElementById('done').click();
  await until(() => page.removed.length, 'tabs.remove');
  assert.deepEqual(page.removed, [7]);
});

test('page becomes visible even if init fails midway', async () => {
  const page = openWelcome({ bridgeThrows: true });
  await ready(page);
  assert.equal(page.doc.getElementById('title').textContent, en['onboarding.title']);
});
