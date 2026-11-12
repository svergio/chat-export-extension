import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOS_VERSION,
  FAQ_VERSION,
  normalizeSettings,
  hasTosConsent,
  hasFaqConsent,
  canEnableBridge,
  PLATFORMS
} from '../src/settings.js';

test('ToS tier 1 gates before FAQ tier 2', () => {
  assert.equal(hasTosConsent({}), false);
  assert.equal(hasTosConsent({ tosVersion: TOS_VERSION - 1 }), false);
  assert.equal(hasTosConsent({ tosVersion: TOS_VERSION }), true);
  assert.equal(hasFaqConsent({ faqVersion: FAQ_VERSION }), true);
  assert.equal(hasFaqConsent({ faqVersion: 0 }), false);
});

test('normalizeSettings recovers corrupted storage', () => {
  const s = normalizeSettings(null);
  assert.equal(s.port, 8765);
  assert.equal(s.host, '127.0.0.1');
  assert.equal(s.tosVersion, 0);
  assert.equal(s.faqVersion, 0);
  assert.equal(s.ui.skin, 'auto');
  assert.equal(s.ui.locale, 'auto');

  const bad = normalizeSettings({
    port: -99,
    rpcTimeoutS: 9999,
    tosVersion: 'nope',
    faqVersion: NaN,
    ui: { skin: 'bogus', scheme: 'neon', locale: 'de' }
  });
  assert.equal(bad.port, 8765);
  assert.equal(bad.rpcTimeoutS, 60);
  assert.equal(bad.tosVersion, 0);
  assert.equal(bad.ui.skin, 'auto');
  assert.equal(bad.ui.scheme, 'auto');
  assert.equal(bad.ui.locale, 'auto');
});

test('serverOn does not imply bridge without FAQ + apiKey', () => {
  const on = normalizeSettings({ serverOn: true, tosVersion: TOS_VERSION });
  assert.equal(on.serverOn, true);
  assert.equal(canEnableBridge(on), false);
  assert.equal(canEnableBridge({ ...on, faqVersion: FAQ_VERSION, apiKey: 'ceb_x' }), true);
});

test('all platforms default enabled unless explicitly false', () => {
  const s = normalizeSettings({ platforms: { chatgpt: false, qwen: false } });
  assert.equal(s.platforms.chatgpt, false);
  assert.equal(s.platforms.qwen, false);
  for (const id of PLATFORMS) {
    if (id !== 'chatgpt' && id !== 'qwen') assert.equal(s.platforms[id], true);
  }
});

test('saveFolder.shiftMode defaults and normalizes', () => {
  assert.equal(normalizeSettings({}).saveFolder.shiftMode, 'rebind');
  assert.equal(normalizeSettings(null).saveFolder.shiftMode, 'rebind');
  assert.equal(
    normalizeSettings({ saveFolder: { shiftMode: 'saveAs' } }).saveFolder.shiftMode,
    'saveAs'
  );
  assert.equal(
    normalizeSettings({ saveFolder: { shiftMode: 'x' } }).saveFolder.shiftMode,
    'rebind'
  );
});

test('normalizeSettings round-trip keeps tosVersion when only ui changes', () => {
  const base = normalizeSettings({
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    ui: { scheme: 'auto', skin: 'auto', locale: 'auto' }
  });
  const next = normalizeSettings(
    Object.assign({}, base, { ui: Object.assign({}, base.ui, { scheme: 'dark' }) })
  );
  assert.equal(next.tosVersion, TOS_VERSION);
  assert.equal(next.faqVersion, FAQ_VERSION);
  assert.equal(next.ui.scheme, 'dark');
  assert.equal(hasTosConsent(next), true);
});
