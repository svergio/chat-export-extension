import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvedSkinFromUrl, dataSkinFromSettingAndUrl } from '../src/skinResolve.js';
import { normalizeSettings } from '../src/settings.js';

test('resolvedSkinFromUrl maps host patterns to UI skin ids', () => {
  assert.equal(resolvedSkinFromUrl('https://x.com/i/grok/chat'), 'grok-x');
  assert.equal(resolvedSkinFromUrl('https://github.com/copilot'), 'copilot');
  assert.equal(resolvedSkinFromUrl('https://example.com/'), 'chatgpt');
  assert.equal(resolvedSkinFromUrl('https://chat.qwen.ai/'), 'qwen');
  assert.equal(resolvedSkinFromUrl('https://grok.com/'), 'grok');
});

test('dataSkinFromSettingAndUrl keeps auto setting while resolving URL', () => {
  assert.equal(dataSkinFromSettingAndUrl('auto', 'https://claude.ai/chat'), 'claude');
  assert.equal(dataSkinFromSettingAndUrl('perplexity', 'https://example.com'), 'perplexity');
});

test('normalizeSettings defaults skin to auto and rejects unknown skin', () => {
  assert.equal(normalizeSettings(null).ui.skin, 'auto');
  assert.equal(normalizeSettings({ ui: { skin: 'bogus' } }).ui.skin, 'auto');
  assert.equal(normalizeSettings({ ui: { skin: 'chatgpt' } }).ui.skin, 'chatgpt');
});
