import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import * as realOps from '../src/ops/helpers.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const zaiSource = readFileSync(join(repoRoot, 'content/zai.js'), 'utf8');

const BASE_HTML = `
<textarea id="chat-input"></textarea>
<button id="send-message-button" aria-label="Send Message">Send</button>
<button class="modelSelectorButton">GLM-5.2</button>
`;

class RpcError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Loads content/zai.js against a happy-dom Z.ai-ish page with the REAL shared Ops
// (waitFor / fillEditable / clickEl / openMenu / pickMenuItem / findCaptchaWidgets...).
function loadZai(win, opsOverrides) {
  // happy-dom has no layout engine: give connected elements a real rect so the
  // platform's visible()/isVisible() checks behave like a rendered page.
  const realRect = win.Element.prototype.getBoundingClientRect;
  win.Element.prototype.getBoundingClientRect = function () {
    if (!this.isConnected) return realRect.call(this);
    return { left: 0, top: 0, right: 320, bottom: 48, width: 320, height: 48, x: 0, y: 0 };
  };
  // setNativeValue (shared Ops) reads the textarea/input prototypes by bare global.
  if (typeof globalThis.HTMLTextAreaElement !== 'function') {
    globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
    globalThis.HTMLInputElement = win.HTMLInputElement;
  }
  let spec = null;
  win.ChatExport = {
    definePlatform: (s) => {
      spec = s;
      win.ChatExport.platforms.zai = { id: 'zai', ops: s.ops || {}, chatId: s.chatId };
    },
    platforms: {},
    Ops: Object.assign({}, realOps, opsOverrides || {}),
    RpcError: RpcError,
    modelFenceTag: (m, fb) => fb || 'zai',
    collectLinks: () => [],
    htmlToMarkdown: (el) => ((el && (el.innerText || el.textContent)) || '').trim(),
    isPlatformEnabled: () => true
  };
  if (typeof win.Response !== 'function') win.Response = function Res() {};
  win.eval(zaiSource);
  return spec;
}

function newWin(url) {
  const win = new Window({ url: url || 'https://chat.z.ai/' });
  win.document.write(BASE_HTML);
  return win;
}

const composer = (win) => win.document.getElementById('chat-input');
const sendBtn = (win) => win.document.getElementById('send-message-button');
const chip = (win) => win.document.querySelector('.modelSelectorButton');

// Wire Send click → Z.ai pushes /c/{id} (or does nothing when navigate=false).
function wireSendClick(win, navigate, chatId) {
  sendBtn(win).addEventListener('click', () => {
    if (navigate) win.history.pushState({}, '', '/c/' + chatId);
  });
}

test('zai create fails fast when Send stays disabled after fill (was 120s dead wait)', async () => {
  const win = newWin();
  sendBtn(win).disabled = true; // never enables: composer fill did not register in the host UI
  const spec = loadZai(win);
  const started = Date.now();
  await assert.rejects(
    spec.ops.create({ text: 'hello' }),
    (err) => err.code === 'HOST_ERROR' && /send disabled after fill/.test(err.message)
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 20000, `expected fail-fast <20s, took ${elapsed}ms`);
});

test('zai create fails fast when the composer never holds the filled text', async () => {
  const win = newWin();
  const spec = loadZai(win, {
    fillEditable: () => {} // naive value-set path: React composer never registers the text
  });
  await assert.rejects(
    spec.ops.create({ text: 'hello' }),
    (err) => err.code === 'HOST_ERROR' && /composer fill failed/.test(err.message)
  );
});

test('zai create resolves chatId from /c/{id} after Send click', async () => {
  const win = newWin();
  wireSendClick(win, true, 'abc-uuid-123');
  const spec = loadZai(win);
  const res = await spec.ops.create({ text: '[ce-test] ping' });
  assert.equal(res.chatId, 'abc-uuid-123');
  assert.ok(/\/c\/abc-uuid-123$/.test(res.url));
});

test('zai create resolves chatId from POST /api/v1/chats/new when URL lags', async () => {
  const win = newWin();
  // Host page: Send click fires the real chats/new POST; URL stays on '/' (laggy pushState).
  win.fetch = async (url, init) => {
    assert.equal(String(url).indexOf('/api/v1/chats/new') >= 0, true, 'tap should only see chats/new');
    assert.equal(String((init && init.method) || 'GET').toUpperCase(), 'POST');
    return {
      ok: true,
      status: 200,
      clone() {
        return { json: async () => ({ id: 'tap-1' }) };
      },
      json: async () => ({ id: 'tap-1' })
    };
  };
  sendBtn(win).addEventListener('click', () => {
    win.fetch('/api/v1/chats/new', { method: 'POST' }).catch(() => {});
  });
  const spec = loadZai(win);
  const res = await spec.ops.create({ text: '[ce-test] ping', timeoutMs: 8000 });
  assert.equal(res.chatId, 'tap-1');
  assert.equal(typeof win.fetch, 'function', 'original fetch restored');
});

test('zai create skips model menu when requested model already selected', async () => {
  const win = newWin();
  chip(win).textContent = 'GLM-5.3-Flash'; // no menu in DOM: opening it would fail the op
  wireSendClick(win, true, 'no-op-model');
  const spec = loadZai(win);
  const res = await spec.ops.create({ text: 'hello', model: 'glm-5-3-flash' });
  assert.equal(res.chatId, 'no-op-model');
  assert.equal(chip(win).textContent, 'GLM-5.3-Flash');
});

test('zai create applies model arg through the native selector', async () => {
  const win = newWin();
  win.document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div id="zai-model-menu">
      <div role="menuitem">GLM-5.2</div>
      <div role="menuitem">GLM-5.3-Flash</div>
    </div>
    `
  );
  const menuEl = win.document.getElementById('zai-model-menu');
  menuEl.remove(); // menu mounts only after the selector is clicked
  chip(win).setAttribute('aria-controls', 'zai-model-menu');
  chip(win).addEventListener('click', () => {
    chip(win).setAttribute('aria-expanded', 'true');
    win.document.body.appendChild(menuEl);
  });
  const items = menuEl.querySelectorAll('[role="menuitem"]');
  items[1].addEventListener('click', () => {
    chip(win).textContent = 'GLM-5.3-Flash';
    menuEl.remove();
    chip(win).setAttribute('aria-expanded', 'false');
  });
  wireSendClick(win, true, 'model-applied');
  const spec = loadZai(win);
  const res = await spec.ops.create({ text: 'hello', model: 'glm-5-3-flash' });
  assert.equal(res.chatId, 'model-applied');
  assert.equal(chip(win).textContent, 'GLM-5.3-Flash', 'UI selector must land on the requested model');
});

test('zai create reports OPTION_NOT_FOUND when the model is not in the menu', async () => {
  const win = newWin();
  win.document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="zai-model-menu" role="menu"><div role="menuitem">GLM-5.2</div></div>`
  );
  chip(win).setAttribute('aria-controls', 'zai-model-menu');
  const spec = loadZai(win);
  await assert.rejects(
    spec.ops.create({ text: 'hello', model: 'glm-4-5' }),
    (err) => err.code === 'OPTION_NOT_FOUND' && /model: glm-4-5/.test(err.message)
  );
});

test('zai create surfaces CAPTCHA instead of silent chatId timeout', async () => {
  const win = newWin();
  win.document.body.insertAdjacentHTML('beforeend', `<div data-sitekey="0xabc"></div>`);
  wireSendClick(win, false, '');
  const spec = loadZai(win);
  await assert.rejects(
    spec.ops.create({ text: 'hello', timeoutMs: 1200 }),
    (err) => {
      assert.equal(err.code, 'CAPTCHA');
      assert.equal(err.details && err.details.captchaWidget && err.details.captchaWidget.sitekey, '0xabc');
      return true;
    }
  );
});

test('zai create keeps HOST_ERROR chatId timeout when no gate is present', async () => {
  const win = newWin();
  wireSendClick(win, false, '');
  const spec = loadZai(win);
  await assert.rejects(
    spec.ops.create({ text: 'hello', timeoutMs: 1200 }),
    (err) => err.code === 'HOST_ERROR' && err.message === 'Z.ai chatId timeout'
  );
});

test('zai send applies model and submits in an existing chat', async () => {
  const win = newWin('https://chat.z.ai/c/existing-1');
  win.document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="zai-model-menu"><div role="menuitem">GLM-5.2</div><div role="menuitem">GLM-5.3-Flash</div></div>`
  );
  const menuEl = win.document.getElementById('zai-model-menu');
  menuEl.remove();
  chip(win).setAttribute('aria-controls', 'zai-model-menu');
  chip(win).addEventListener('click', () => win.document.body.appendChild(menuEl));
  menuEl.querySelectorAll('[role="menuitem"]')[1].addEventListener('click', () => {
    chip(win).textContent = 'GLM-5.3-Flash';
    menuEl.remove();
  });
  sendBtn(win).addEventListener('click', () => {
    composer(win).value = ''; // accepted send empties the composer
  });
  composer(win).value = 'draft text'; // pending draft before send
  const spec = loadZai(win);
  const res = await spec.ops.send({ chatId: 'existing-1', text: 'hello', model: 'glm-5-3-flash' });
  assert.equal(res.chatId, 'existing-1');
  assert.equal(chip(win).textContent, 'GLM-5.3-Flash');
});
