import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeChrome, tabSender, saveMsg } from './background-chrome-mock.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(root, 'locales/LN_ru.json'), 'utf8'));

const ONBOARDING_KEYS = [
  'onboarding.docTitle',
  'onboarding.title',
  'onboarding.lead',
  'onboarding.stepFolder',
  'onboarding.folderNote',
  'onboarding.picked',
  'onboarding.stepRate',
  'onboarding.rateNote',
  'onboarding.rateCta',
  'onboarding.stepHelp',
  'onboarding.helpNote',
  'onboarding.helpCta',
  'onboarding.linksTitle',
  'onboarding.github',
  'onboarding.issues',
  'onboarding.donate',
  'onboarding.note',
  'onboarding.done',
  'onboarding.queueNote',
  'onboarding.saveFailed',
  'onboarding.err.permission',
  'onboarding.err.noFolder',
  'onboarding.err.write',
  'toast.queueFull'
];

// Proper names that are identical in both locales by nature.
const RU_SAME_AS_EN_OK = new Set(['onboarding.github']);

test('onboarding locale keys exist, are non-empty and translated', () => {
  for (const key of ONBOARDING_KEYS) {
    assert.equal(typeof en[key], 'string', `missing en ${key}`);
    assert.equal(typeof ru[key], 'string', `missing ru ${key}`);
    assert.ok(en[key].trim().length > 0, `en ${key} empty`);
    assert.ok(ru[key].trim().length > 0, `ru ${key} empty`);
    if (RU_SAME_AS_EN_OK.has(key)) continue;
    assert.notEqual(ru[key], en[key], `ru should differ from en for ${key}`);
  }
});

test('onboarding placeholders match between EN and RU', () => {
  for (const key of ONBOARDING_KEYS) {
    const ph = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',');
    assert.equal(ph(ru[key]), ph(en[key]), `placeholder mismatch for ${key}`);
  }
});

test('build output ships the welcome bundle the page loads', () => {
  const bundle = join(root, 'dist/welcome.js');
  assert.ok(existsSync(bundle), 'dist/welcome.js missing - run npm run build');
  assert.ok(statSync(bundle).size > 1000, 'dist/welcome.js looks empty');
  assert.ok(existsSync(join(root, 'welcome.html')), 'welcome.html missing');
});

let seq = 0;
async function loadOnboarding(env) {
  globalThis.chrome = env.chrome;
  return import('../src/background/onboarding.js?case=' + seq++);
}

test('first export without a folder opens welcome instead of the regrant ping / popup', async () => {
  const env = makeChrome({ tabs: [1] });
  globalThis.chrome = env.chrome;
  const save = await import('../src/background/save.js?onb=' + seq++);
  save.registerSaveHandlers();
  const first = await env.send(saveMsg('a.md'), tabSender(1));
  assert.equal(first.reason, 'no-folder');
  assert.deepEqual(env.log.created, ['chrome-extension://test-id/welcome.html']);
  assert.equal(env.log.tabMessages.filter((m) => m.msg.type === 'ce-regrant-folder').length, 0);
  assert.equal(env.log.popups.length, 0);

  const second = await env.send(saveMsg('b.md'), tabSender(1));
  assert.equal(second.reason, 'needs_regrant', 'later exports use the bar again');
  assert.equal(env.log.created.length, 1);
});

test('concurrent triggers open exactly one welcome tab', async () => {
  const env = makeChrome();
  const mod = await loadOnboarding(env);
  const res = await Promise.all([mod.maybeOpenWelcome('install'), mod.maybeOpenWelcome('first-export')]);
  assert.deepEqual(res.slice().sort(), [false, true]);
  assert.equal(env.log.created.length, 1);
});

test('flag is rolled back when tabs.create throws, so a later trigger can open the page', async () => {
  const env = makeChrome({ createThrows: true });
  const mod = await loadOnboarding(env);
  assert.equal(await mod.maybeOpenWelcome('install'), false);
  assert.equal(env.local['ce.onboarding.welcomeShown'], undefined, 'flag rolled back');
  const ok = makeChrome({ local: env.local });
  globalThis.chrome = ok.chrome;
  assert.equal(await mod.maybeOpenWelcome('first-export'), true);
  assert.equal(ok.log.created.length, 1);
});

test('onInstalled: install opens welcome, update only sets the flag', async () => {
  const fresh = makeChrome();
  let mod = await loadOnboarding(fresh);
  assert.equal(await mod.onInstalledWelcome({ reason: 'install' }), true);
  assert.equal(fresh.log.created.length, 1);

  const updated = makeChrome();
  mod = await loadOnboarding(updated);
  await mod.onInstalledWelcome({ reason: 'update', previousVersion: '2.1.5' });
  assert.equal(updated.log.created.length, 0, 'no tab on update');
  assert.ok(updated.local['ce.onboarding.welcomeShown'], 'flag set silently');
  assert.equal(await mod.maybeOpenWelcome('first-export'), false, 'and stays quiet later');

  const other = makeChrome();
  mod = await loadOnboarding(other);
  await mod.onInstalledWelcome({ reason: 'chrome_update' });
  assert.equal(other.log.created.length, 0);
  assert.equal(other.local['ce.onboarding.welcomeShown'], undefined);
});

test('maybeOpenWelcome opens the tab exactly once and flags before opening', async () => {
  const store = {};
  const created = [];
  let flagAtCreate = null;
  globalThis.chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (obj) => {
          Object.assign(store, obj);
        }
      }
    },
    tabs: {
      create: async ({ url }) => {
        flagAtCreate = store['ce.onboarding.welcomeShown'];
        created.push(url);
        return { id: 1 };
      }
    },
    runtime: { getURL: (p) => 'chrome-extension://test-id/' + p }
  };

  const mod = await import('../src/background/onboarding.js');
  assert.equal(await mod.hasSeenWelcome(), false, 'fresh profile must not have seen welcome');
  assert.equal(await mod.maybeOpenWelcome('install'), true, 'first trigger must open the tab');
  assert.equal(await mod.maybeOpenWelcome('first-export'), false, 'second trigger must not reopen');
  assert.deepEqual(created, ['chrome-extension://test-id/welcome.html'], 'exactly one tab, welcome URL');
  assert.ok(flagAtCreate, 'shown flag must be written before the tab opens (race guard)');
  assert.equal(await mod.hasSeenWelcome(), true, 'flag persists after opening');
});

test('maybeOpenWelcome fails closed when storage or tabs are unavailable', async () => {
  globalThis.chrome = {
    storage: {
      local: {
        get: async () => {
          throw new Error('storage broken');
        },
        set: async () => {}
      }
    },
    tabs: {
      create: async () => {
        throw new Error('tabs broken');
      }
    },
    runtime: { getURL: (p) => 'chrome-extension://test-id/' + p }
  };
  const mod = await import('../src/background/onboarding.js');
  assert.equal(await mod.maybeOpenWelcome('install'), false, 'must not throw, must report no open');
  assert.equal(await mod.hasSeenWelcome(), true, 'storage failure must not nag the user');
});
