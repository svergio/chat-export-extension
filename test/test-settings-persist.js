import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOS_VERSION,
  FAQ_VERSION,
  STORAGE_KEYS,
  normalizeSettings,
  mergeSettingsPatch,
  settingsNeedRewrite,
  reconcileSavedSettings,
  persistSaveFailed,
  hasTosConsent,
  saveSettings,
  loadStored
} from '../src/settings.js';

function installChromeStorage(seed) {
  const store = Object.assign({}, seed || {});
  globalThis.chrome = {
    storage: {
      local: {
        get(keys, cb) {
          const out = {};
          const list = Array.isArray(keys) ? keys : Object.keys(keys || {});
          for (let i = 0; i < list.length; i++) {
            const k = list[i];
            if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
          }
          cb(out);
        },
        set(obj, cb) {
          Object.assign(store, obj);
          if (cb) cb();
        }
      }
    }
  };
  return store;
}

test('ui/theme-only patch must not wipe consented tosVersion', () => {
  const consented = normalizeSettings({
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    ui: { skin: 'auto', scheme: 'auto', locale: 'auto' }
  });
  const themeOnly = normalizeSettings({
    ui: { skin: 'auto', scheme: 'dark', locale: 'auto' }
  });
  assert.equal(themeOnly.tosVersion, 0);
  assert.equal(hasTosConsent(themeOnly), false);

  const merged = normalizeSettings(mergeSettingsPatch(consented, themeOnly));
  assert.equal(merged.ui.scheme, 'dark');
  assert.equal(merged.tosVersion, TOS_VERSION);
  assert.equal(merged.faqVersion, FAQ_VERSION);
  assert.equal(hasTosConsent(merged), true);
});

test('stale normalize output without tosVersion cannot demote storage consent', () => {
  const existing = {
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    apiKey: 'ceb_abc',
    ui: { scheme: 'light', skin: 'chatgpt', locale: 'en' },
    exportSchemas: { default: 'sharegpt/1', byFormat: { md: 'sharegpt/1' } },
    saveFolder: { shiftMode: 'saveAs' }
  };
  const staleStripped = {
    serverOn: false,
    host: '127.0.0.1',
    port: 8765,
    apiKey: 'ceb_abc',
    browserLabel: 'Chrome',
    platforms: { chatgpt: true },
    allowCreate: true,
    allowDestructive: false,
    allowProjects: true,
    rpcTimeoutS: 60,
    ui: { skin: 'chatgpt', scheme: 'dark', locale: 'en' }
  };
  const merged = normalizeSettings(mergeSettingsPatch(existing, staleStripped));
  assert.equal(merged.tosVersion, TOS_VERSION);
  assert.equal(merged.faqVersion, FAQ_VERSION);
  assert.equal(merged.ui.scheme, 'dark');
  assert.equal(merged.saveFolder.shiftMode, 'saveAs');
  assert.equal(merged.exportSchemas.default, 'sharegpt/1');
});

test('saveSettings storage round-trip preserves tosVersion and platforms on ui change', async () => {
  const base = normalizeSettings({
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    platforms: { chatgpt: true, grok: false },
    ui: { scheme: 'auto', skin: 'auto', locale: 'auto' }
  });
  const store = installChromeStorage({
    [STORAGE_KEYS.settings]: base
  });

  const popupNext = normalizeSettings(
    Object.assign({}, base, {
      ui: Object.assign({}, base.ui, { scheme: 'light', skin: 'grok', locale: 'ru' })
    })
  );
  const saved = await saveSettings(popupNext);
  assert.equal(saved.tosVersion, TOS_VERSION);
  assert.equal(saved.faqVersion, FAQ_VERSION);
  assert.equal(saved.platforms.grok, false);
  assert.equal(saved.ui.scheme, 'light');
  assert.equal(store[STORAGE_KEYS.settings].tosVersion, TOS_VERSION);
  assert.equal(hasTosConsent(store[STORAGE_KEYS.settings]), true);

  const afterPartial = await saveSettings({ ui: { scheme: 'dark' } });
  assert.equal(afterPartial.tosVersion, TOS_VERSION);
  assert.equal(afterPartial.platforms.grok, false);
  assert.equal(afterPartial.ui.scheme, 'dark');
});
test('loadStored rewrites raw storage when missing tosVersion / nested defaults', async () => {
  const store = installChromeStorage({
    [STORAGE_KEYS.browserId]: 'b-testfix',
    [STORAGE_KEYS.settings]: {
      tosVersion: TOS_VERSION,
      host: '127.0.0.1',
      port: 8765
    }
  });
  assert.equal(settingsNeedRewrite(store[STORAGE_KEYS.settings]), true);
  const loaded = await loadStored();
  assert.equal(loaded.settings.tosVersion, TOS_VERSION);
  assert.equal(loaded.settings.ui.scheme, 'auto');
  assert.ok(loaded.settings.exportSchemas);
  assert.ok(loaded.settings.saveFolder);
  assert.equal(store[STORAGE_KEYS.settings].tosVersion, TOS_VERSION);
  assert.equal(store[STORAGE_KEYS.settings].ui.scheme, 'auto');
});

test('reconcileSavedSettings restores consent stripped by stale save response', () => {
  const sent = normalizeSettings({ tosVersion: TOS_VERSION, faqVersion: FAQ_VERSION, ui: { scheme: 'dark' } });
  const stripped = normalizeSettings({ ui: { scheme: 'dark' } });
  assert.equal(stripped.tosVersion, 0);
  const fixed = reconcileSavedSettings(sent, stripped);
  assert.equal(fixed.tosVersion, TOS_VERSION);
  assert.equal(fixed.faqVersion, FAQ_VERSION);
  assert.equal(fixed.ui.scheme, 'dark');
});

test('persistSaveFailed is fail-closed on missing ok/settings', () => {
  assert.equal(persistSaveFailed(null), true);
  assert.equal(persistSaveFailed({}), true);
  assert.equal(persistSaveFailed({ ok: false }), true);
  assert.equal(persistSaveFailed({ ok: true }), true);
  assert.equal(persistSaveFailed({ ok: true, settings: { tosVersion: 1 } }), false);
});

test('commitSavedSettings updates memory before WS push', async () => {
  installChromeStorage({});
  globalThis.chrome.runtime = {
    getManifest: function () {
      return { version: '0.0.0-test' };
    }
  };
  const bridge = await import('../src/background/bridge.js');
  const saved = normalizeSettings({
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    serverOn: false,
    ui: { scheme: 'dark', skin: 'auto', locale: 'auto' }
  });
  const out = bridge.commitSavedSettings(saved);
  assert.equal(out.tosVersion, TOS_VERSION);
  assert.equal(out.ui.scheme, 'dark');
  const runtime = bridge.getRuntimeState();
  assert.equal(runtime.settings.tosVersion, TOS_VERSION);
  assert.equal(runtime.settings.ui.scheme, 'dark');
});