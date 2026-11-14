import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { closeMenu, openMenu } from '../src/ops/menu.js';
import { findCaptchaWidgets } from '../src/ops/helpers.js';
import { loadChatExport } from './core-harness.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Counts real Escape keydown/keyup dispatches. One listener on document is enough:
// closeMenu targets body (bubbles up to document), closeOverlays targets document.
function escapeSpy(win) {
  const seen = { keydown: 0, keyup: 0 };
  win.document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') seen.keydown += 1;
  });
  win.document.addEventListener('keyup', (ev) => {
    if (ev.key === 'Escape') seen.keyup += 1;
  });
  return seen;
}

function withCaptcha(win) {
  win.document.body.insertAdjacentHTML('beforeend', `<div data-sitekey="0xguard"></div>`);
}

test('closeMenu does not dispatch Escape while a captcha challenge is visible', () => {
  const win = new Window({ url: 'https://chat.z.ai/' });
  withCaptcha(win);
  assert.equal(findCaptchaWidgets(win.document).length, 1, 'fixture must be seen as a live challenge');
  const seen = escapeSpy(win);
  closeMenu(win.document);
  assert.equal(seen.keydown, 0, 'no Escape keydown may fire while captcha is visible');
  assert.equal(seen.keyup, 0, 'no Escape keyup may fire while captcha is visible');
});

test('closeMenu still dispatches Escape when no captcha is present', () => {
  const win = new Window({ url: 'https://chat.z.ai/' });
  const seen = escapeSpy(win);
  closeMenu(win.document);
  assert.equal(seen.keydown, 1, 'Escape keydown must fire when the page is clean');
  assert.equal(seen.keyup, 1, 'Escape keyup must fire when the page is clean');
});

test('openMenu retry closeMenu is also captcha-guarded (no Escape during retries)', async () => {
  const win = new Window({ url: 'https://chat.z.ai/' });
  withCaptcha(win);
  const seen = escapeSpy(win);
  const trigger = win.document.createElement('button');
  win.document.body.appendChild(trigger);
  // No menu will ever open: openMenu retries twice, each retry must skip the Escape reset.
  await assert.rejects(
    openMenu(trigger, { timeoutMs: 300, retries: 2, message: 'guard probe' })
  );
  assert.ok(seen.keydown === 0, 'retry resets must not Escape a visible captcha away');
});

// ── core.js closeOverlays guard, exercised through the exported scrapeSourcesPill ──
function setupCoreWithSources(win) {
  // Minimal page: a sources pill trigger whose click opens a dialog with one link.
  win.document.body.insertAdjacentHTML(
    'beforeend',
    `
    <button aria-label="citation.sources-pill-sources">Sources</button>
    `
  );
  const trigger = win.document.querySelector('button');
  trigger.addEventListener('click', () => {
    win.document.body.insertAdjacentHTML(
      'beforeend',
      `<div role="dialog"><a href="https://example.com/src/1">Source One</a></div>`
    );
  });
  return trigger;
}

test('scrapeSourcesPill works and closeOverlays skips Escape while captcha visible', async () => {
  const win = new Window({ url: 'https://chatgpt.com/c/x' });
  setupCoreWithSources(win);
  withCaptcha(win);
  // core.js captchaOnScreen reads CE.Ops.findCaptchaWidgets — wire the real helper.
  win.eval(readFileSync(join(repoRoot, 'src/core.js'), 'utf8'));
  win.ChatExport.Ops = { findCaptchaWidgets: (root) => findCaptchaWidgets(root || win.document) };
  const seen = escapeSpy(win);
  const sources = await win.ChatExport.scrapeSourcesPill(win.document.body);
  assert.ok(sources && sources.length >= 1, 'sources must still be scraped');
  assert.equal(
    sources[0].url,
    'https://example.com/src/1',
    'dialog link must be collected'
  );
  assert.equal(seen.keydown, 0, 'closeOverlays must not Escape a visible captcha');
  assert.equal(seen.keyup, 0, 'no keyup either');
});

test('scrapeSourcesPill still closes overlays via Escape when the page is clean', async () => {
  const win = new Window({ url: 'https://chatgpt.com/c/x' });
  setupCoreWithSources(win);
  win.eval(readFileSync(join(repoRoot, 'src/core.js'), 'utf8'));
  win.ChatExport.Ops = { findCaptchaWidgets: (root) => findCaptchaWidgets(root || win.document) };
  const seen = escapeSpy(win);
  const sources = await win.ChatExport.scrapeSourcesPill(win.document.body);
  assert.ok(sources && sources.length >= 1, 'sources must still be scraped');
  assert.equal(seen.keydown, 1, 'Escape must fire when no captcha is visible');
});
