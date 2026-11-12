import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './dom-harness.js';

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
