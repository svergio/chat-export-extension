import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { loadFixture } from './dom-harness.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const SEND_RE = /send|отправ|submit|grok something|спроси|ask grok|ask anything|что-нибудь/i;

function labelOf(el) {
  return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
}

function findSendButton(doc, input) {
  var byAria = doc.querySelector('button[aria-label*="Спросите" i]');
  if (byAria && !byAria.closest('[data-chat-export-bar]')) return byAria;
  var node = input && input.parentElement;
  for (var depth = 0; node && depth < 6; depth++) {
    var btns = node.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.closest('[data-chat-export-bar]')) continue;
      var blob = (b.getAttribute('data-testid') || '') + ' ' + labelOf(b);
      if (/voice|голос|attach|файл|file|mode|режим/i.test(blob)) continue;
      if (SEND_RE.test(blob) || b.getAttribute('type') === 'submit') return b;
    }
    node = node.parentElement;
  }
  return null;
}

test('grok-x send selector matches Спросите aria (post-cache / no Send text)', () => {
  const win = loadFixture('grok-x-composer.html');
  const input = win.document.getElementById('gx-ta');
  const send = findSendButton(win.document, input);
  assert.ok(send);
  assert.equal(send.id, 'gx-send');
  assert.match(send.getAttribute('aria-label'), /Спросите/i);
  assert.ok(SEND_RE.test('Спросите что-нибудь у Grok'));
  assert.ok(!/спроси|ask grok|что-нибудь/i.test('Send message'));
});

test('grok-x send selector ignores export bar buttons', () => {
  const win = loadFixture('grok-x-composer.html');
  const barBtn = win.document.querySelector('button[data-chat-export-bar]');
  assert.ok(barBtn);
  const blob = labelOf(barBtn);
  assert.ok(!SEND_RE.test(blob));
});

function loadGrokXPlatform() {
  const html = readFileSync(join(repoRoot, 'fixtures/dom/grok-x.html'), 'utf8');
  const win = new Window({ url: 'https://x.com/i/grok?conversation=2120742746067435571' });
  win.document.write(html);
  let spec = null;
  win.ChatExport = {
    definePlatform: (s) => {
      spec = s;
    },
    platforms: {},
    Ops: {},
    BAR_ATTR: 'data-chat-export-bar',
    modelFenceTag: (m, fb) => fb,
    collectLinks: () => [],
    dedupeSources: (x) => x,
    htmlToMarkdown: (el) => el.textContent.replace(/\s+/g, ' ').trim()
  };
  win.eval(readFileSync(join(repoRoot, 'content/grok-x.js'), 'utf8'));
  return { win, spec };
}

test('grok-x DOM export scopes to the conversation, not X nav or composer', () => {
  const { win, spec } = loadGrokXPlatform();
  assert.ok(spec);
  const turns = Array.from(spec.turns());
  assert.deepEqual(turns.map((t) => t.id), ['gx-user', 'gx-assistant']);
  const messages = turns.map((t) => spec.capture(t, 'grok')).filter(Boolean);
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant']);
  assert.equal(messages[0].text, '[ce-test] #15 file+focused — reply OK only');
  assert.equal(messages[1].text, 'OK');
  const blob = messages.map((m) => m.text).join('\n');
  assert.doesNotMatch(blob, /Главная|Опубликовать|@SvergioM|Быстрый|\bMD\b/);
  assert.equal(win.document.title, 'Grok / X');
  assert.equal(spec.title(), '[ce-test] #15 file+focused — reply OK only');
  assert.equal(typeof spec.exportData, 'function');
});
