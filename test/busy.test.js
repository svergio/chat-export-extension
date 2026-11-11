import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import {
  classifyBusyText,
  detectBusyBanner,
  findStopControl,
  composerReady,
  buildHostState,
  guardBusy
} from '../src/ops/helpers.js';

function page(html) {
  const win = new Window();
  win.document.body.innerHTML = html;
  globalThis.document = win.document;
  return win.document;
}

test('classifyBusyText separates rate limits from overload', () => {
  assert.equal(classifyBusyText('Grok is under heavy load. Please try again later.'), 'PLATFORM_BUSY');
  assert.equal(classifyBusyText('Сервис перегружен, попробуйте позже'), 'PLATFORM_BUSY');
  assert.equal(classifyBusyText('We are at capacity right now'), 'PLATFORM_BUSY');
  assert.equal(classifyBusyText('Too many requests in 1 hour. Try again later.'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('You have hit the rate limit'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('Слишком много запросов'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('Hash partitions split large tables.'), null);
  assert.equal(classifyBusyText('try again later ' + 'x'.repeat(500)), null);
});

test('detectBusyBanner scans alerts/toasts and skips own UI and hidden nodes', () => {
  const doc = page(
    '<div data-chat-export-bar="grok"><div role="alert">rate limit</div></div>' +
      '<div role="alert" hidden>heavy load</div>' +
      '<div class="Toast_root">Grok is under heavy load</div>'
  );
  const hit = detectBusyBanner(doc);
  assert.equal(hit.code, 'PLATFORM_BUSY');
  assert.equal(hit.text, 'Grok is under heavy load');
  assert.equal(detectBusyBanner(page('<main><p>hello</p></main>')), null);
});

test('detectBusyBanner prefers RATE_LIMIT and checks extra nodes', () => {
  const doc = page('<div role="status">Something went wrong</div><article id="t">Message limit reached</article>');
  assert.equal(detectBusyBanner(doc).code, 'PLATFORM_BUSY');
  assert.equal(detectBusyBanner(doc, doc.getElementById('t')).code, 'RATE_LIMIT');
});

test('findStopControl matches stop labels and test ids, ignores disabled', () => {
  assert.ok(findStopControl(page('<button aria-label="Stop model response"></button>')));
  assert.ok(findStopControl(page('<button aria-label="Остановить генерацию"></button>')));
  assert.ok(findStopControl(page('<button data-testid="stop-button"></button>')));
  assert.equal(findStopControl(page('<button aria-label="Stop" disabled></button>')), null);
  assert.equal(findStopControl(page('<button aria-label="Send"></button>')), null);
});

test('composerReady and buildHostState', () => {
  const doc = page('<textarea id="a"></textarea><textarea id="b" disabled></textarea><div role="alert">Rate limit exceeded</div>');
  assert.equal(composerReady(doc.getElementById('a')), true);
  assert.equal(composerReady(doc.getElementById('b')), false);
  assert.equal(composerReady(null), false);
  assert.deepEqual(buildHostState('grok', { generating: true, composerReady: true }), {
    platform: 'grok',
    generating: true,
    busy: true,
    banner: 'Rate limit exceeded',
    composerReady: true
  });
});

test('guardBusy ignores stale banners and maps new ones to retryable codes', async () => {
  const doc = page('<div role="alert">heavy load (stale)</div>');
  assert.equal(await guardBusy(async () => 'ok'), 'ok');

  await assert.rejects(
    guardBusy(async () => {
      const t = doc.createElement('div');
      t.setAttribute('role', 'alert');
      t.textContent = 'Too many requests';
      doc.body.appendChild(t);
      const err = new Error('Grok chatId timeout');
      err.code = 'TIMEOUT';
      throw err;
    }),
    (err) => err.code === 'RATE_LIMIT' && err.details.retryable === true && err.details.banner === 'Too many requests'
  );

  page('');
  await assert.rejects(
    guardBusy(async () => {
      const t = document.createElement('div');
      t.className = 'error-banner';
      t.textContent = 'Grok is under heavy load';
      document.body.appendChild(t);
      return { chatId: 'x' };
    }),
    (err) => err.code === 'PLATFORM_BUSY'
  );

  page('');
  await assert.rejects(
    guardBusy(async () => {
      const t = document.createElement('div');
      t.setAttribute('role', 'alert');
      t.textContent = 'heavy load';
      document.body.appendChild(t);
      const err = new Error('model gpt-9 not found');
      err.code = 'OPTION_NOT_FOUND';
      throw err;
    }),
    (err) => err.code === 'OPTION_NOT_FOUND'
  );
});

test('dispatchRpc routes platform.host_state and keeps retryable details', async () => {
  const { dispatchRpc, RpcError } = await import('../src/rpc.js');
  const state = { platform: 'grok', generating: false, busy: true, banner: 'heavy load', composerReady: true };
  globalThis.window = {
    ChatExport: {
      platforms: {
        grok: {
          id: 'grok',
          ops: {
            hostState: async () => state,
            send: async () => {
              throw new RpcError('PLATFORM_BUSY', 'heavy load', { banner: 'heavy load' });
            }
          }
        }
      }
    }
  };
  const okRes = await dispatchRpc({ id: 'h1', op: 'platform.host_state', platform: 'grok', args: {} });
  assert.deepEqual(okRes, { id: 'h1', ok: true, data: state });
  const failRes = await dispatchRpc({ id: 'h2', op: 'chats.send', platform: 'grok', args: { chatId: 'c', text: 't' } });
  assert.deepEqual(failRes.error, {
    code: 'PLATFORM_BUSY',
    message: 'heavy load',
    details: { banner: 'heavy load', retryable: true }
  });
  delete globalThis.window;
});
