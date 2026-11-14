import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/popup/main.jsx'), 'utf8');
const css = readFileSync(join(root, 'popup.css'), 'utf8');

test('gateway card uses Ping and Update configuration icon buttons', () => {
  assert.ok(src.includes("aria-label={t('test.ping')}"), 'Ping icon missing');
  assert.ok(src.includes("aria-label={t('btn.updateConfig')}"), 'Update config icon missing');
  assert.ok(src.includes('IconPing'), 'IconPing missing');
  assert.ok(src.includes('IconUpdateConfig'), 'IconUpdateConfig missing');
  assert.ok(src.includes('onPing'), 'onPing handler missing');
  assert.ok(src.includes('onUpdateConfig'), 'onUpdateConfig handler missing');
  assert.ok(src.includes('ce-gateway-controls'), 'icons should sit by gateway switch');
  assert.ok(!src.includes('ce-gateway-actions'), 'legacy text action row should be gone');
  assert.ok(!src.includes('onClick={onTest}'), 'legacy onTest should be gone');
  assert.ok(!src.includes('onUpdateBrowserLabel'), 'legacy label-only update should be gone');
});

test('gateway fields lock via gatewayLocked / gatewayFieldsDisabled', () => {
  assert.ok(src.includes('gatewayFieldsDisabled'));
  assert.ok(src.includes('gatewayLocked'));
  assert.ok(src.includes('disabled={gatewayLocked || busy || !consented}'));
});

test('disabled inputs have explicit inactive styles', () => {
  assert.ok(css.includes('.ce-field input:disabled'), 'missing :disabled input styles');
  assert.match(css, /\.ce-field input:disabled[\s\S]*?opacity:\s*0\.\d+/);
  assert.match(css, /\.ce-field input:disabled[\s\S]*?cursor:\s*not-allowed/);
});

test('token preview is truncated inside hover token box (not a focusable input)', () => {
  assert.ok(src.includes('maskToken(settings.apiKey)'));
  assert.ok(src.includes('ce-token-box'));
  assert.ok(src.includes('ce-token-actions'));
  assert.ok(src.includes('ce-readonly-value'), 'browser id must be non-input readonly');
  assert.ok(css.includes('.ce-token-box:hover .ce-token-actions'));
  assert.ok(css.includes('.ce-readonly-value'));
  assert.ok(!css.includes('-webkit-text-security'), 'disc mask hides preview');
  assert.ok(!/value=\{settings\.apiKey\}/.test(src), 'plaintext apiKey must not be input value');
  assert.ok(!/<input[^>]*id="ce-browser-id"/.test(src), 'browser id must not be an input');
  assert.ok(!/<input[^>]*id="ce-gateway-token"/.test(src), 'token must not be an input');
});

test('rotate and copy are icon buttons with aria-label inside token box', () => {
  assert.ok(src.includes('IconRotate'));
  assert.ok(src.includes('IconCopy'));
  assert.ok(src.includes('ce-icon-btn'));
  assert.ok(src.includes("aria-label={settings.apiKey ? t('btn.rotate') : t('btn.generate')}"));
  assert.ok(src.includes("aria-label={t('btn.copy')}"));
  const tokenActionsAt = src.indexOf('ce-token-actions');
  const rotateUseAt = src.indexOf('<IconRotate', tokenActionsAt);
  assert.ok(tokenActionsAt >= 0 && rotateUseAt > tokenActionsAt, 'rotate should be inside token actions');
});

test('copy stays available while gateway locked (no gatewayLocked on copy)', () => {
  const copyIdx = src.indexOf("aria-label={t('btn.copy')}");
  assert.ok(copyIdx > 0);
  const slice = src.slice(Math.max(0, copyIdx - 220), copyIdx);
  assert.ok(slice.includes('onClick={onCopyKey}'));
  assert.ok(!slice.includes('gatewayLocked'), 'Copy must remain usable while gateway on');
});
