import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './dom-harness.js';
import { ensureComposerSubmitted } from '../src/ops/helpers.js';

test('ensureComposerSubmitted does not treat textarea value as emptied', async () => {
  const win = loadFixture('grok-x-composer.html');
  const input = win.document.getElementById('gx-ta');
  let enterCalls = 0;
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') enterCalls++;
  });
  input.value = 'draft';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  let done = false;
  await ensureComposerSubmitted({
    send: null,
    input,
    timeoutMs: 800,
    message: 'should reach enter',
    isDone: () => (done ? true : null)
  }).catch(() => {});
  assert.ok(enterCalls >= 1, 'Enter fallback should run when send missing and textarea has value');
});
