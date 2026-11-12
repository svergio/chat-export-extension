import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBarPage } from './shared-dom-harness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));

function stubToastTimers(win) {
  const queued = [];
  const origSetTimeout = win.setTimeout.bind(win);
  win.setTimeout = function (fn, ms) {
    if (ms === 2500 || ms === 200) {
      queued.push({ fn, ms });
      return queued.length;
    }
    return origSetTimeout(fn, ms);
  };
  return queued;
}

test('runDownload shows toast.empty when conversation has no messages', async () => {
  const win = loadBarPage('https://chatgpt.com/', ['md']);
  const doc = win.document;
  const CE = win.ChatExport;
  CE.setToastTranslator((key) => en[key] || key);

  const anchor = doc.createElement('div');
  doc.body.appendChild(anchor);
  doc.body.className = 'chat-export-bar';
  doc.documentElement.setAttribute('data-ce-scheme', 'dark');

  CE.injectBar(anchor, {
    platform: 'chatgpt',
    getData: () => Promise.resolve({ title: 'Empty', messages: [] })
  });

  stubToastTimers(win);
  const dl = doc.querySelector('.chat-export-dl');
  assert.ok(dl, 'download control missing');
  dl.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await win.happyDOM.waitUntilComplete();

  const toast = doc.querySelector('.chat-export-toast');
  assert.ok(toast, 'empty toast missing');
  assert.equal(toast.textContent, en['toast.empty']);
});

test('runDownload shows toast.failed when getData throws', async () => {
  const win = loadBarPage('https://chatgpt.com/', ['md']);
  const doc = win.document;
  const CE = win.ChatExport;
  CE.setToastTranslator((key) => en[key] || key);

  const anchor = doc.createElement('div');
  doc.body.appendChild(anchor);
  doc.body.className = 'chat-export-bar';

  CE.injectBar(anchor, {
    platform: 'chatgpt',
    getData: () => Promise.reject(new Error('export probe failed'))
  });

  stubToastTimers(win);
  const dl = doc.querySelector('.chat-export-dl');
  dl.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await win.happyDOM.waitUntilComplete();

  const toast = doc.querySelector('.chat-export-toast');
  assert.ok(toast, 'failed toast missing');
  assert.equal(toast.textContent, en['toast.failed']);
});
