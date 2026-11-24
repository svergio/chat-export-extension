import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBarPage } from './shared-dom-harness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const content = readFileSync(join(root, 'content/grok.js'), 'utf8');
const fixture = readFileSync(join(root, 'fixtures/dom/grok-composer.html'), 'utf8');

function flush(win) {
  return new Promise((resolve) => {
    if (typeof win.requestAnimationFrame === 'function') {
      win.requestAnimationFrame(() => resolve());
    } else {
      resolve();
    }
  }).then(() => win.happyDOM.waitUntilComplete());
}

/**
 * happy-dom has no layout engine, so getBoundingClientRect() is 0x0 and
 * isRendered() never sees the mounted bar — mount() would then re-inject on every
 * observer tick and spin forever. Give the harness a minimal box model.
 */
function stubLayout(win) {
  const box = (w, h) => ({ x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON: () => ({}) });
  win.Element.prototype.getBoundingClientRect = function () {
    const hasContent = this.children.length > 0 || (this.textContent || '').trim().length > 0;
    return hasContent ? box(120, 36) : box(0, 0);
  };
}

/**
 * Boots the real bar bundle (core + injectBar + definePlatform) on the Grok
 * composer fixture, then evaluates the real content/grok.js against it.
 */
async function mountGrokBar(mutate) {
  const win = loadBarPage('https://grok.com/c/00000000-0000-0000-0000-000000000000', ['md']);
  stubLayout(win);
  win.document.body.innerHTML = fixture;
  if (mutate) mutate(win.document);

  const CE = win.ChatExport;
  const realDefinePlatform = CE.definePlatform;
  let spec = null;
  CE.definePlatform = (s) => {
    spec = s;
    return realDefinePlatform(s);
  };

  win.eval(content);
  await flush(win);
  return { win, doc: win.document, CE, spec };
}

function hostOf(doc) {
  return doc.querySelector('[data-ce-host="grok"]');
}

test('grok bar mounts in the leading actions row, right after the Model chip', async () => {
  const { doc } = await mountGrokBar();
  const host = hostOf(doc);

  assert.ok(host, 'export bar host missing');
  assert.equal(host.parentElement.id, 'actions', 'host must live in the flex actions row');
  assert.equal(host.previousElementSibling.id, 'model', 'host must sit immediately after the Model chip');
});

test('grok bar never mounts on the login page (no Model chip)', async () => {
  const { doc, spec } = await mountGrokBar((d) => {
    d.getElementById('model').remove();
  });

  assert.equal(hostOf(doc), null, 'no Model chip means no anchor — the bar must stay hidden');
  // The composer probe itself must bail so the observer does not churn.
  const found = typeof spec.composer === 'function' ? spec.composer() : null;
  assert.equal(found, null, 'composer() must return null without a Model chip');
});

test('grok fmt styles come from the Model chip, not the attach "+" button', async () => {
  const { doc } = await mountGrokBar();
  const fmt = doc.querySelector('.chat-export-fmt');

  assert.ok(fmt, 'format control missing');
  assert.match(fmt.className, /\bgrok-model-chip\b/, 'fmt must inherit the Model chip classes');
  assert.doesNotMatch(fmt.className, /chat-export-folder/, 'own classes applied exactly once');
});

test('grok bar keeps its anchor when the attach button disappears', async () => {
  const { doc } = await mountGrokBar((d) => {
    d.getElementById('attach').remove();
  });
  const host = hostOf(doc);

  assert.ok(host, 'export bar host missing');
  assert.equal(host.parentElement.id, 'actions');
  assert.equal(host.previousElementSibling.id, 'model');
});
