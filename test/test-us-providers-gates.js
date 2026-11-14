import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import * as realOps from '../src/ops/helpers.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const grokSource = readFileSync(join(repoRoot, 'content/grok.js'), 'utf8');
const chatgptSource = readFileSync(join(repoRoot, 'content/chatgpt.js'), 'utf8');
const perplexitySource = readFileSync(join(repoRoot, 'content/perplexity.js'), 'utf8');

class RpcError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function rectPatch(win) {
  const realRect = win.Element.prototype.getBoundingClientRect;
  win.Element.prototype.getBoundingClientRect = function () {
    if (!this.isConnected) return realRect.call(this);
    return { left: 0, top: 0, right: 320, bottom: 48, width: 320, height: 48, x: 0, y: 0 };
  };
}

function baseChatExport(win, overrides) {
  return {
    Ops: Object.assign({}, realOps, overrides || {}),
    RpcError: RpcError,
    platforms: {},
    isPlatformEnabled: () => true,
    observe: () => {},
    // export/scrape helpers (not exercised by these tests)
    collectLinks: () => [],
    collectSourcesFromFiber: () => [],
    collectFaviconSources: () => [],
    dedupeSources: (xs) => xs || [],
    findSourcesTrigger: () => null,
    findOverflowScroller: () => null,
    htmlToMarkdown: (el) => ((el && (el.innerText || el.textContent)) || '').trim(),
    modelFenceTag: (m, fb) => fb || 'chatgpt'
  };
}

// ── grok (grok.com) ──

const GROK_HTML = `
<form data-composer="true">
  <textarea id="grok-input"></textarea>
  <button id="grok-send" type="submit" disabled>Send</button>
</form>
`;

function loadGrok(win) {
  rectPatch(win);
  let spec = null;
  win.ChatExport = baseChatExport(win);
  win.ChatExport.definePlatform = (s) => {
    spec = s;
  };
  if (typeof win.Response !== 'function') win.Response = function Res() {};
  win.eval(grokSource);
  return spec;
}

function newGrokWin() {
  const win = new Window({ url: 'https://grok.com/' });
  win.document.write(GROK_HTML);
  return win;
}

test('grok hostState: empty composer with disabled Send is idle, not generating', () => {
  const win = newGrokWin();
  const spec = loadGrok(win);
  const state = spec.ops.hostState();
  assert.equal(
    state.generating,
    false,
    'disabled Send with an empty composer is the normal post-reply state — must not read as generating'
  );
});

test('grok hostState: disabled Send with pending text still reads as generating', () => {
  const win = newGrokWin();
  const spec = loadGrok(win);
  win.document.getElementById('grok-input').value = 'hello world';
  const state = spec.ops.hostState();
  assert.equal(state.generating, true, 'queued submit with text must read as generating');
});

test('grok hostState: a visible stop control reads as generating regardless of composer', () => {
  const win = newGrokWin();
  win.document.body.insertAdjacentHTML('beforeend', `<button aria-label="Stop">Stop</button>`);
  const spec = loadGrok(win);
  const state = spec.ops.hostState();
  assert.equal(state.generating, true, 'stop control means a reply is streaming');
});

// ── chatgpt (chatgpt.com) ──

const GPT_HTML = `
<div class="ProseMirror" contenteditable="true" role="textbox" id="gpt-input"></div>
<form>
  <button data-testid="send-button" type="button">Send</button>
</form>
`;

function loadGpt(win, opsOverrides) {
  rectPatch(win);
  if (typeof globalThis.HTMLTextAreaElement !== 'function') {
    globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
    globalThis.HTMLInputElement = win.HTMLInputElement;
  }
  win.fetch = async (url) => {
    const u = String(url || '');
    if (u.startsWith('/api/auth/session')) {
      return { ok: true, status: 200, json: async () => ({ accessToken: 'test-token' }) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  let spec = null;
  win.ChatExport = baseChatExport(win, opsOverrides);
  win.ChatExport.definePlatform = (s) => {
    spec = s;
  };
  if (typeof win.Response !== 'function') win.Response = function Res() {};
  win.eval(chatgptSource);
  return spec;
}

function newGptWin(url) {
  const win = new Window({ url: url || 'https://chatgpt.com/' });
  win.document.write(GPT_HTML);
  return win;
}

// Simulate the host accepting the prompt: a turn node appears after the Send click.
function wireSendAccept(win, navigateTo) {
  win.document.querySelector('[data-testid="send-button"]').addEventListener('click', () => {
    win.document.body.insertAdjacentHTML(
      'beforeend',
      `<article data-testid="conversation-turn-1"><div data-message-author-role="user">hi</div></article>`
    );
    if (navigateTo) win.history.pushState({}, '', navigateTo);
  });
}

test('chatgpt create fails fast when the ProseMirror fill does not land', async () => {
  const win = newGptWin();
  const spec = loadGpt(win, { fillRichComposer: () => 'failed' });
  const started = Date.now();
  await assert.rejects(
    spec.ops.create({ text: 'hello' }),
    (err) => err.code === 'HOST_ERROR' && /composer fill failed/.test(err.message)
  );
  assert.ok(Date.now() - started < 20000, 'fill failure must fail fast, not wait out the chatId timer');
});

test('chatgpt create resolves chatId when Send navigates to /c/{id}', async () => {
  const win = newGptWin();
  wireSendAccept(win, '/c/abc12345-6789'); // chatIdFromUrl needs >=8 hex/dash chars
  const spec = loadGpt(win);
  const res = await spec.ops.create({ text: 'hello' });
  assert.equal(res.chatId, 'abc12345-6789');
  assert.match(res.url, /\/c\/abc12345-6789$/);
  assert.equal(res.title, '[ce-test] chat');
});

test('chatgpt create keeps chatId timeout when no gate is present (timeout_s wired)', async () => {
  const win = newGptWin();
  wireSendAccept(win, null); // turn appears, but the URL never becomes /c/{id}
  const spec = loadGpt(win);
  const started = Date.now();
  await assert.rejects(
    spec.ops.create({ text: 'hello', timeoutMs: 1500 }),
    (err) => err.code === 'HOST_ERROR' && /ChatGPT chatId timeout/.test(err.message)
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 30000, `operator-bounded wait must be honored, took ${elapsed}ms`);
});

test('chatgpt create surfaces CAPTCHA when a challenge is on screen at failure', async () => {
  const win = newGptWin();
  win.document.body.insertAdjacentHTML('beforeend', `<div data-sitekey="0xus-captcha"></div>`);
  const spec = loadGpt(win); // send click does nothing, no turn appears
  await assert.rejects(
    spec.ops.create({ text: 'hello' }),
    (err) => {
      assert.equal(err.code, 'CAPTCHA');
      assert.equal(err.details && err.details.captchaWidget && err.details.captchaWidget.sitekey, '0xus-captcha');
      return true;
    }
  );
});

test('chatgpt create reports OPTION_NOT_FOUND when model arg has no selector', async () => {
  const win = newGptWin();
  const spec = loadGpt(win);
  await assert.rejects(
    spec.ops.create({ text: 'hello', model: 'gpt-5' }),
    (err) => err.code === 'OPTION_NOT_FOUND' && /model: gpt-5/.test(err.message)
  );
});

test('chatgpt create applies model arg through the native selector', async () => {
  const win = newGptWin();
  win.document.body.insertAdjacentHTML(
    'beforeend',
    `
    <button data-testid="model-switcher-dropdown-button" aria-haspopup="menu" aria-label="Model: GPT-4o">GPT-4o</button>
    <div id="gpt-model-menu" role="menu" hidden>
      <div role="menuitem">GPT-4o</div>
      <div role="menuitem">GPT-5</div>
    </div>
    `
  );
  const chip = win.document.querySelector('[data-testid="model-switcher-dropdown-button"]');
  const menuEl = win.document.getElementById('gpt-model-menu');
  menuEl.remove();
  chip.setAttribute('aria-controls', 'gpt-model-menu');
  chip.addEventListener('click', () => {
    chip.setAttribute('aria-expanded', 'true');
    win.document.body.appendChild(menuEl);
    menuEl.hidden = false;
  });
  menuEl.querySelectorAll('[role="menuitem"]')[1].addEventListener('click', () => {
    chip.textContent = 'GPT-5';
    chip.setAttribute('aria-label', 'Model: GPT-5');
    menuEl.remove();
    chip.setAttribute('aria-expanded', 'false');
  });
  wireSendAccept(win, '/c/abc12345-6789-4abc-8def-111111111111');
  const spec = loadGpt(win);
  const res = await spec.ops.create({ text: 'hello', model: 'gpt-5' });
  assert.equal(res.chatId, 'abc12345-6789-4abc-8def-111111111111');
  assert.equal(chip.textContent, 'GPT-5', 'UI selector must land on the requested model');
});

test('grok create reports OPTION_NOT_FOUND when model arg has no selector', async () => {
  const win = newGrokWin();
  const spec = loadGrok(win);
  await assert.rejects(
    spec.ops.create({ text: 'hello', model: 'grok-4' }),
    (err) => err.code === 'OPTION_NOT_FOUND' && /model: grok-4/.test(err.message)
  );
});

function loadPerplexity(win) {
  rectPatch(win);
  let spec = null;
  win.ChatExport = baseChatExport(win);
  win.ChatExport.definePlatform = (s) => {
    spec = s;
  };
  if (typeof win.Response !== 'function') win.Response = function Res() {};
  win.eval(perplexitySource);
  return spec;
}

test('perplexity create reports OPTION_NOT_FOUND when model arg has no selector', async () => {
  const win = new Window({ url: 'https://www.perplexity.ai/' });
  win.document.write(
    `<div role="textbox" contenteditable="true" aria-label="Ask anything"></div><button>Send</button>`
  );
  const spec = loadPerplexity(win);
  await assert.rejects(
    spec.ops.create({ text: 'hello', model: 'sonar-pro' }),
    (err) => err.code === 'OPTION_NOT_FOUND' && /model: sonar-pro/.test(err.message)
  );
});

// ── perplexity soft-paywall downgrade via definePlatform ──

test('definePlatform downgrades soft paywall for perplexity submit hooks', async () => {
  const win = new Window({ url: 'https://www.perplexity.ai/' });
  win.ChatExport = baseChatExport(win);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  globalThis.window = win;
  globalThis.document = win.document;
  try {
    const { definePlatform } = await import('../src/definePlatform.js');
    definePlatform({
      id: 'perplexity',
      ops: {
        create: async function () {
          throw new RpcError('RATE_LIMIT', 'Перейти на Pro', {
            banner: 'Перейти на Pro',
            kind: 'paywall'
          });
        }
      }
    });
    await assert.rejects(
      win.ChatExport.platforms.perplexity.ops.create({}),
      (err) => {
        assert.equal(err.code, 'HOST_ERROR', 're-rendered upgrade CTA must not surface as RATE_LIMIT');
        assert.equal(err.details && err.details.softPaywall, true);
        return true;
      }
    );
    // Control: hard-limit text keeps the RATE_LIMIT code.
    definePlatform({
      id: 'perplexity',
      ops: {
        create: async function () {
          throw new RpcError('RATE_LIMIT', 'usage limit reached', {
            banner: 'usage limit reached',
            kind: 'quota'
          });
        }
      }
    });
    await assert.rejects(
      win.ChatExport.platforms.perplexity.ops.create({}),
      (err) => err.code === 'RATE_LIMIT'
    );
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
  }
});
