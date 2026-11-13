import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import {
  classifyBusyText,
  classifyGateKind,
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

test('classifyBusyText maps paywall and auth walls', () => {
  assert.equal(classifyBusyText('Upgrade to Pro for unlimited searches'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('Бесплатный предпросмотр расширенного поиска'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('Try a more powerful model'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('Перейти на Pro'), 'RATE_LIMIT');
  assert.equal(classifyBusyText('Sign up and repeat your request'), 'UNAUTHORIZED');
  assert.equal(classifyBusyText('Зарегистрируйтесь и повторите свой запрос'), 'UNAUTHORIZED');
  assert.equal(classifyBusyText('Log in to continue'), 'UNAUTHORIZED');
  assert.equal(classifyGateKind('RATE_LIMIT', 'Upgrade to Pro'), 'paywall');
  assert.equal(classifyGateKind('RATE_LIMIT', 'Too many requests'), 'quota');
  assert.equal(classifyGateKind('UNAUTHORIZED', 'Sign up and repeat'), 'auth_wall');
  assert.equal(classifyGateKind('PLATFORM_BUSY', 'heavy load'), 'busy');
});

test('classifyBusyText and kind map captcha banners', () => {
  assert.equal(classifyBusyText('Please complete the captcha to continue'), 'CAPTCHA');
  assert.equal(classifyBusyText('Verify you are human'), 'CAPTCHA');
  assert.equal(classifyBusyText('Я не робот'), 'CAPTCHA');
  assert.equal(classifyBusyText('Cloudflare is checking your browser'), 'CAPTCHA');
  assert.equal(classifyGateKind('CAPTCHA', 'Verify you are human'), 'captcha');
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

test('detectBusyBanner prefers auth wall and scans main upsell buttons', () => {
  const doc = page(
    '<main><div role="status">Something went wrong</div>' +
      '<button type="button">Перейти на Pro</button></main>'
  );
  assert.equal(detectBusyBanner(doc).code, 'RATE_LIMIT');
  assert.equal(detectBusyBanner(doc).kind, 'paywall');

  const auth = page(
    '<main><div role="alert">Too many requests</div>' +
      '<div role="status">Зарегистрируйтесь и повторите свой запрос</div></main>'
  );
  assert.equal(detectBusyBanner(auth).code, 'UNAUTHORIZED');
  assert.equal(detectBusyBanner(auth).kind, 'auth_wall');
});

test('detectBusyBanner prefers captcha over rate limit and finds iframes', () => {
  const banner = page(
    '<main><div role="alert">Too many requests</div>' +
      '<div role="status">Please complete the captcha</div></main>'
  );
  assert.equal(detectBusyBanner(banner).code, 'CAPTCHA');
  assert.equal(detectBusyBanner(banner).kind, 'captcha');

  const iframe = page(
    '<main><iframe src="https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile" title="Widget containing a Cloudflare security challenge"></iframe>' +
      '<div role="alert">Too many requests</div></main>'
  );
  const hit = detectBusyBanner(iframe);
  assert.equal(hit.code, 'CAPTCHA');
  assert.equal(hit.kind, 'captcha');
  assert.equal(hit.challenge.tag, 'iframe');
  assert.match(hit.challenge.src, /cloudflare/);
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
    composerReady: true,
    code: 'RATE_LIMIT',
    kind: 'quota',
    retryable: true,
    state: 'rate_limit'
  });
  page('<main><textarea></textarea></main>');
  assert.deepEqual(buildHostState('chatgpt', { generating: false, composerReady: true }), {
    platform: 'chatgpt',
    generating: false,
    busy: false,
    banner: null,
    composerReady: true,
    code: null,
    kind: null,
    retryable: true,
    state: 'ok'
  });
  page('<main><button>Перейти на Pro</button></main>');
  const paywall = buildHostState('perplexity', { generating: false, composerReady: true });
  assert.equal(paywall.state, 'rate_limit');
  assert.equal(paywall.kind, 'paywall');
  assert.equal(paywall.retryable, false);

  page('<main><iframe src="https://www.google.com/recaptcha/api2/anchor" title="reCAPTCHA"></iframe></main>');
  const captcha = buildHostState('chatgpt', { generating: false, composerReady: true });
  assert.equal(captcha.state, 'captcha');
  assert.equal(captcha.code, 'CAPTCHA');
  assert.equal(captcha.kind, 'captcha');
  assert.equal(captcha.retryable, false);
  assert.equal(captcha.busy, true);
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
    (err) =>
      err.code === 'RATE_LIMIT' &&
      err.details.retryable === true &&
      err.details.kind === 'quota' &&
      err.details.banner === 'Too many requests'
  );

  page('<main></main>');
  await assert.rejects(
    guardBusy(async () => {
      const t = document.createElement('button');
      t.textContent = 'Upgrade to Pro';
      document.querySelector('main').appendChild(t);
      return { chatId: 'x' };
    }),
    (err) => err.code === 'RATE_LIMIT' && err.details.kind === 'paywall' && err.details.retryable === false
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

  page('<div role="alert">Verify you are human (stale)</div>');
  assert.equal(await guardBusy(async () => 'ok'), 'ok');

  page('');
  await assert.rejects(
    guardBusy(async () => {
      const t = document.createElement('iframe');
      t.setAttribute('src', 'https://newassets.hcaptcha.com/captcha/v1/x/static/hcaptcha.html');
      t.setAttribute('title', 'hCaptcha challenge');
      document.body.appendChild(t);
      return { chatId: 'x' };
    }),
    (err) =>
      err.code === 'CAPTCHA' &&
      err.details.retryable === false &&
      err.details.kind === 'captcha' &&
      err.details.challenge &&
      /hcaptcha/i.test(err.details.challenge.src || '')
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
