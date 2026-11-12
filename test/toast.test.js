import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChatExport } from './core-harness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));

function installBar(doc, scheme) {
  const bar = doc.createElement('div');
  bar.className = 'chat-export-bar';
  bar.setAttribute('data-ce-scheme', scheme || 'dark');
  doc.body.appendChild(bar);
}

function stubToastTimers(win) {
  const queued = [];
  const origSetTimeout = win.setTimeout.bind(win);
  win.setTimeout = function (fn, ms) {
    if (ms === 2500 || ms === 200) {
      const id = queued.length + 1;
      queued.push({ fn, ms });
      return id;
    }
    return origSetTimeout(fn, ms);
  };
  return queued;
}

test('showToast renders a single top-right toast and auto-dismisses', async () => {
  const { win, CE } = loadChatExport('https://chatgpt.com/');
  const doc = win.document;
  installBar(doc, 'dark');

  const pack = {};
  Object.keys(en).forEach((k) => {
    pack[k] = en[k];
  });
  CE.setToastTranslator(function (key) {
    return pack[key] || key;
  });

  const text = CE.toastText('toast.downloaded', { name: 'demo.md' });
  assert.equal(text, 'Downloaded: demo.md');

  const timeouts = stubToastTimers(win);
  CE.showToast(text);
  await win.happyDOM.waitUntilComplete();

  const host = doc.getElementById('chat-export-toast-host');
  assert.ok(host, 'toast host missing');
  assert.equal(host.className, 'chat-export-toast-host');
  assert.equal(host.parentElement, doc.documentElement);

  let toasts = doc.querySelectorAll('.chat-export-toast');
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].textContent, text);
  assert.equal(toasts[0].getAttribute('data-ce-scheme'), 'dark');
  assert.ok(toasts[0].classList.contains('is-visible'));

  CE.showToast('Replaced');
  await win.happyDOM.waitUntilComplete();
  toasts = doc.querySelectorAll('.chat-export-toast');
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].textContent, 'Replaced');

  CE.showToast('Timed out');
  await win.happyDOM.waitUntilComplete();
  assert.equal(doc.querySelectorAll('.chat-export-toast').length, 1);
  const hide = timeouts.find((t) => t.ms === 2500);
  assert.ok(hide, 'hide timer missing');
  hide.fn();
  const fade = timeouts.find((t) => t.ms === 200);
  assert.ok(fade, 'fade timer missing');
  fade.fn();
  assert.equal(doc.querySelectorAll('.chat-export-toast').length, 0);
});

test('notifyExportOutcome uses saved and failed templates', async () => {
  const { win, CE } = loadChatExport();
  const doc = win.document;
  installBar(doc, 'light');
  CE.setToastTranslator(function (key) {
    return en[key] || key;
  });
  stubToastTimers(win);

  CE.showToast(CE.toastText('toast.saved', { folder: 'Exports', name: 'chat.md' }));
  await win.happyDOM.waitUntilComplete();
  let toast = doc.querySelector('.chat-export-toast');
  assert.equal(toast.textContent, 'Saved to «Exports»: chat.md');
  assert.equal(toast.getAttribute('data-ce-scheme'), 'light');

  CE.showToast(CE.toastText('toast.failed'));
  await win.happyDOM.waitUntilComplete();
  toast = doc.querySelector('.chat-export-toast');
  assert.equal(toast.textContent, 'Export failed');
});
