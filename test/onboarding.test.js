import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(root, 'locales/LN_ru.json'), 'utf8'));
const welcomeHtml = readFileSync(join(root, 'welcome.html'), 'utf8');
const buildSrc = readFileSync(join(root, 'scripts/build.mjs'), 'utf8');
const packSrc = readFileSync(join(root, 'scripts/pack.mjs'), 'utf8');
const saveSrc = readFileSync(join(root, 'src/background/save.js'), 'utf8');
const mainSrc = readFileSync(join(root, 'src/background/main.js'), 'utf8');

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
  'onboarding.done'
];

const REQUIRED_URLS = [
  'https://chromewebstore.google.com/detail/chat-export/ecnkhadaajiodlaoflkjjnaclhloejgg',
  'https://discord.gg/QxJW9qt2KW',
  'https://github.com/svergio/chat-export-extension',
  'https://github.com/svergio/chat-export-extension/issues',
  'https://www.donationalerts.com/r/svwergio_mel'
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

test('welcome.html carries the required links, script and element ids', () => {
  assert.ok(welcomeHtml.includes('dist/welcome.js'), 'welcome page must load dist/welcome.js');
  for (const url of REQUIRED_URLS) {
    assert.ok(welcomeHtml.includes(url), `welcome page missing link ${url}`);
  }
  // Order from the spec: thanks → folder → rate → discord → project links → note.
  const order = ['id="title"', 'id="step-folder"', 'id="step-rate"', 'id="step-help"', 'id="step-links"', 'id="note"'];
  const positions = order.map((needle) => welcomeHtml.indexOf(needle));
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i] > positions[i - 1], `welcome sections out of order at ${order[i]}`);
    assert.ok(positions[i - 1] >= 0, `welcome section missing: ${order[i - 1]}`);
  }
  for (const id of ['pick', 'done', 'rateLink', 'discordLink', 'githubLink', 'issuesLink', 'donateLink']) {
    assert.ok(welcomeHtml.includes(`id="${id}"`), `welcome page missing #${id}`);
  }
  assert.ok(welcomeHtml.includes('type="button" id="pick" class="ce-btn ce-btn--primary"'), 'pick must be the primary CTA');
});

test('build and pack include the welcome page', () => {
  assert.match(buildSrc, /'welcome'/, 'build.mjs must bundle src/welcome/main.js');
  assert.match(packSrc, /'welcome\.html'/, 'pack.mjs must ship welcome.html');
});

test('background triggers: install reason and first export without folder', () => {
  assert.match(mainSrc, /details && details\.reason === 'install'/, 'onInstalled must filter to install');
  assert.match(mainSrc, /maybeOpenWelcome\('install'\)/, 'onInstalled must open the welcome page');
  assert.match(saveSrc, /maybeOpenWelcome\('first-export'\)/, 'deferToRegrant must offer onboarding');
  // The welcome branch must run before the in-page regrant ping / folder popup.
  const body = saveSrc.slice(saveSrc.indexOf('async function deferToRegrant'));
  assert.ok(
    body.indexOf("maybeOpenWelcome('first-export')") < body.indexOf('notifyRegrant('),
    'welcome must be checked before notifyRegrant'
  );
  // Queued exports must drain from the welcome tab too.
  assert.match(saveSrc, /allQueued/, 'handlePicked must honor the allQueued drain');
  assert.match(saveSrc, /drainAll \? await takeQueuedJobs\(null\)/, 'allQueued must drain regardless of sender tab');
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
