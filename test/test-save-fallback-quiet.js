import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadChatExport } from './core-harness.js';

function captureWarn(win) {
  const warnings = [];
  win.console.warn = function () {
    warnings.push(Array.from(arguments).join(' '));
  };
  return warnings;
}

async function exportWithReply(reply) {
  const { win, CE } = loadChatExport();
  const warnings = captureWarn(win);
  win.chrome = {
    runtime: {
      id: 'test',
      lastError: undefined,
      sendMessage(msg, cb) {
        if (typeof reply === 'function') cb(reply(msg));
        else cb(reply);
      }
    }
  };
  const res = await CE.exportConversation({
    platform: 'chatgpt',
    title: 'Quiet fallback',
    messages: [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'hello' }
    ],
    formats: ['md'],
    pack: 'file'
  });
  return { res, warnings };
}

test('folder save fallback for unsupported does not console.warn', async () => {
  const { res, warnings } = await exportWithReply({ ok: false, reason: 'unsupported' });
  assert.equal(res.ok, true);
  assert.equal(res.via, 'downloads');
  assert.equal(res.reason, 'unsupported');
  assert.equal(warnings.length, 0);
});

test('folder save fallback for no-runtime does not console.warn', async () => {
  const { win, CE } = loadChatExport();
  const warnings = captureWarn(win);
  win.chrome = { runtime: {} };
  const res = await CE.exportConversation({
    platform: 'chatgpt',
    title: 'No runtime',
    messages: [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'hello' }
    ],
    formats: ['md'],
    pack: 'file'
  });
  assert.equal(res.ok, true);
  assert.equal(res.via, 'downloads');
  assert.equal(res.reason, 'no-runtime');
  assert.equal(warnings.length, 0);
});

test('unexpected folder save error still console.warns once', async () => {
  const { res, warnings } = await exportWithReply({
    ok: false,
    reason: 'error',
    error: 'boom'
  });
  assert.equal(res.via, 'downloads');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /fell back to Downloads: error boom/);
});

test('too-large-to-queue falls back to Downloads with its own localized toast', async () => {
  const { win, CE } = loadChatExport();
  const en = JSON.parse(readFileSync(new URL('../locales/LN_en.json', import.meta.url), 'utf8'));
  CE.setToastTranslator((key) => en[key] || key);
  win.chrome = {
    runtime: {
      id: 'test',
      lastError: undefined,
      sendMessage(msg, cb) {
        cb({ ok: false, reason: 'too-large-to-queue' });
      }
    }
  };
  const res = await CE.exportConversation({
    platform: 'chatgpt',
    title: 'Big',
    messages: [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'hello' }
    ],
    formats: ['md'],
    pack: 'file'
  });
  assert.equal(res.via, 'downloads');
  assert.equal(res.reason, 'too-large-to-queue');
  const toast = win.document.querySelector('.chat-export-toast');
  assert.ok(toast, 'toast missing');
  assert.equal(toast.textContent, en['toast.queueFull']);
});

test('slugTitle cuts long titles by code points, never half an emoji', () => {
  const { CE } = loadChatExport();
  const slug = CE.slugTitle('a'.repeat(79) + '😀😀');
  assert.equal(Array.from(slug).length, 80);
  assert.ok(slug.endsWith('😀'));
  assert.ok(!/[\uD800-\uDBFF]$/.test(slug), 'no dangling high surrogate');
  assert.equal(CE.slugTitle('Тест чат'), 'Тест_чат');
});
