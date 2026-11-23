import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBarPage } from './shared-dom-harness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const content = readFileSync(join(root, 'content/chatgpt.js'), 'utf8');
const fixture = readFileSync(join(root, 'fixtures/dom/chatgpt-footer.html'), 'utf8');

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
 * happy-dom has no layout engine, so every getBoundingClientRect() is 0x0 and
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
 * Boots the real bar bundle (core + injectBar + definePlatform) on the ChatGPT
 * footer fixture, then evaluates the real content/chatgpt.js against it.
 */
async function mountChatGptBar(mutate) {
  const win = loadBarPage('https://chatgpt.com/c/00000000-0000-0000-0000-000000000000', ['md']);
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
  return doc.querySelector('[data-ce-host="chatgpt"]');
}

test('chatgpt bar mounts inside the action row, not as a footer grid child', async () => {
  const { doc } = await mountChatGptBar();
  const footer = doc.getElementById('footer');
  const host = hostOf(doc);

  assert.ok(host, 'export bar host missing');
  assert.equal(host.parentElement.id, 'action-row', 'host must live in the action row');
  assert.equal(host.nextElementSibling.id, 'cluster', 'host must sit immediately before the action cluster');

  // Regression: a direct footer child becomes a 4th grid item and wraps the bar
  // into an implicit second row under the composer.
  const footerHost = Array.from(footer.children).find((c) => c.hasAttribute('data-ce-host'));
  assert.equal(footerHost, undefined, 'host must not be a direct footer child');
  assert.equal(footer.children.length, 4, 'footer keeps leading/input/expansion/actions');
});

test('chatgpt bar keeps the same spot when Send disappears (empty composer)', async () => {
  const { doc } = await mountChatGptBar((d) => {
    d.getElementById('send').remove();
  });
  const host = hostOf(doc);

  assert.ok(host, 'export bar host missing');
  assert.equal(host.parentElement.id, 'action-row');
  assert.equal(host.nextElementSibling.id, 'cluster');
  assert.equal(
    Array.from(doc.getElementById('footer').children).some((c) => c.hasAttribute('data-ce-host')),
    false
  );
});

test('chatgpt bar is never mounted on a grid footer without composer controls', async () => {
  const { doc } = await mountChatGptBar((d) => {
    d.querySelectorAll('#footer button').forEach((b) => b.remove());
  });
  assert.equal(hostOf(doc), null, 'no anchor means no bar — never a stray grid child');
});

test('chatgpt bar styles come from the Think chip and the attach button', async () => {
  const { doc } = await mountChatGptBar();
  const fmt = doc.querySelector('.chat-export-fmt');
  const dl = doc.querySelector('.chat-export-dl');

  assert.ok(fmt, 'format control missing');
  assert.ok(dl, 'download control missing');
  // nativeFrom = Think chip ("Think" used not to match the /thinking/ label regex).
  assert.match(fmt.className, /\btext-base\b/, 'format chip should inherit Think chip classes');
  // nativeIconFrom = attach button, not one of our own bar buttons.
  assert.match(dl.className, /\baspect-square\b/, 'download icon should inherit attach button classes');
  assert.equal(dl.className.split('chat-export-dl').length - 1, 1, 'own class applied exactly once');
});

test('chatgpt composer anchor stays valid after the bar exists', async () => {
  const { spec, doc } = await mountChatGptBar();
  assert.equal(typeof spec.composer, 'function');

  const found = spec.composer();
  assert.ok(found && found.el, 'composer anchor disappeared');
  assert.ok(found.el.contains(hostOf(doc)), 'anchor must keep containing the mounted bar');
  assert.equal(found.el.id, 'action-row');
});
