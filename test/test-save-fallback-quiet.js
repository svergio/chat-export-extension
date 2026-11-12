import test from 'node:test';
import assert from 'node:assert/strict';
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
