import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './dom-harness.js';
import { setFileInputFiles, waitAttachChips } from '../src/ops/files.js';

test('setFileInputFiles injects files into file input', () => {
  const win = loadFixture('grok-x.html');
  const input = win.document.getElementById('grok-x-file');
  let changed = 0;
  input.addEventListener('change', () => {
    changed++;
  });
  const text = 'hello attach';
  const b64 = Buffer.from(text, 'utf8').toString('base64');
  const n = setFileInputFiles(input, [{ name: 'note.txt', mime: 'text/plain', size: text.length, b64 }]);
  assert.equal(n, 1);
  assert.equal(input.files.length, 1);
  assert.equal(input.files[0].name, 'note.txt');
  assert.equal(input.files[0].type, 'text/plain');
  assert.equal(changed, 1);
});

test('waitAttachChips resolves when chips present', async () => {
  const win = loadFixture('chatgpt-composer.html');
  const form = win.document.querySelector('form[data-chatgpt-composer]');
  const chips = await waitAttachChips(form, 1, { timeoutMs: 2000, intervalMs: 50 });
  assert.equal(chips, 1);
});
