import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvedSkinFromUrl, dataSkinFromSettingAndUrl } from '../src/skinResolve.js';
import { normalizeSettings, UI_SKINS } from '../src/settings.js';

test('resolvedSkinFromUrl maps host patterns to UI skin ids', () => {
  assert.equal(resolvedSkinFromUrl('https://x.com/i/grok/chat'), 'grok-x');
  assert.equal(resolvedSkinFromUrl('https://github.com/copilot'), 'copilot');
  assert.equal(resolvedSkinFromUrl('https://example.com/'), 'chatgpt');
  assert.equal(resolvedSkinFromUrl('https://chat.qwen.ai/'), 'qwen');
  assert.equal(resolvedSkinFromUrl('https://grok.com/'), 'grok');
  assert.equal(resolvedSkinFromUrl('https://www.kimi.com/'), 'kimi');
  assert.equal(resolvedSkinFromUrl('https://kimi.com/chat/abc'), 'kimi');
  assert.equal(resolvedSkinFromUrl('https://chat.z.ai/'), 'zai');
  assert.equal(resolvedSkinFromUrl('https://chat.z.ai/c/1'), 'zai');
  assert.equal(resolvedSkinFromUrl('https://agent.minimax.io/'), 'minimax');
  assert.equal(resolvedSkinFromUrl('https://janitorai.com/'), 'janitorai');
  assert.equal(resolvedSkinFromUrl('https://www.janitorai.com/chats/1'), 'janitorai');
});

test('UI_SKINS includes kimi zai minimax janitorai for Style picker', () => {
  for (const id of ['kimi', 'zai', 'minimax', 'janitorai']) {
    assert.ok(UI_SKINS.indexOf(id) >= 0, id);
  }
});

test('dataSkinFromSettingAndUrl keeps auto setting while resolving URL', () => {
  assert.equal(dataSkinFromSettingAndUrl('auto', 'https://claude.ai/chat'), 'claude');
  assert.equal(dataSkinFromSettingAndUrl('perplexity', 'https://example.com'), 'perplexity');
  assert.equal(dataSkinFromSettingAndUrl('auto', 'https://www.kimi.com/'), 'kimi');
  assert.equal(dataSkinFromSettingAndUrl('auto', 'https://chat.z.ai/'), 'zai');
  assert.equal(dataSkinFromSettingAndUrl('auto', 'https://agent.minimax.io/'), 'minimax');
  assert.equal(dataSkinFromSettingAndUrl('auto', 'https://janitorai.com/'), 'janitorai');
  assert.equal(dataSkinFromSettingAndUrl('minimax', 'https://example.com'), 'minimax');
});

test('normalizeSettings defaults skin to auto and rejects unknown skin', () => {
  assert.equal(normalizeSettings(null).ui.skin, 'auto');
  assert.equal(normalizeSettings({ ui: { skin: 'bogus' } }).ui.skin, 'auto');
  assert.equal(normalizeSettings({ ui: { skin: 'chatgpt' } }).ui.skin, 'chatgpt');
  assert.equal(normalizeSettings({ ui: { skin: 'kimi' } }).ui.skin, 'kimi');
  assert.equal(normalizeSettings({ ui: { skin: 'zai' } }).ui.skin, 'zai');
  assert.equal(normalizeSettings({ ui: { skin: 'minimax' } }).ui.skin, 'minimax');
  assert.equal(normalizeSettings({ ui: { skin: 'janitorai' } }).ui.skin, 'janitorai');
});
