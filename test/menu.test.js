import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './dom-harness.js';
import { readMenuItems, pickMenuItem, locateMenuRoot } from '../src/ops/menu.js';

test('grok model menu parses menuitemcheckbox state', () => {
  const win = loadFixture('grok.html');
  const root = win.document.getElementById('grok-model-menu');
  const items = readMenuItems(root);
  assert.ok(items.length >= 5);
  const fast = items.find((it) => it.label.indexOf('Быстрый') >= 0);
  assert.equal(fast.role, 'menuitemcheckbox');
  assert.equal(fast.checked, true);
  const expert = items.find((it) => it.label.indexOf('Эксперт') >= 0);
  assert.equal(expert.checked, false);
});

test('chatgpt attach menu labels deep research and locked connector', () => {
  const win = loadFixture('chatgpt-composer.html');
  const root = win.document.getElementById('chatgpt-attach-menu');
  const items = readMenuItems(root);
  const deep = items.find((it) => /исследован/i.test(it.label));
  assert.ok(deep);
  const locked = items.find((it) => /Pro\+/i.test(it.label));
  assert.equal(locked.disabled, true);
  assert.equal(locked.locked, true);
});

test('copilot ActionList items are readable', () => {
  const win = loadFixture('copilot.html');
  const root = win.document.querySelector('[data-portal] ul');
  const items = readMenuItems(root);
  const ask = items.find((it) => /^Ask$/i.test(it.label));
  assert.ok(ask);
  const agent = items.find((it) => /Agent Upgrade/i.test(it.label));
  assert.equal(agent.locked, true);
  const modelRoot = win.document.getElementById('copilot-model-menu');
  const modelItems = readMenuItems(modelRoot);
  assert.ok(modelItems.some((it) => /Auto/i.test(it.label)));
});

test('grok-x mode menu flags grok.com link as locked', () => {
  const win = loadFixture('grok-x.html');
  const root = win.document.getElementById('grok-x-mode-menu');
  const items = readMenuItems(root);
  const link = items.find((it) => /grok\.com/i.test(it.label));
  assert.equal(link.locked, true);
});

test('pickMenuItem clicks matching menuitem', () => {
  const win = loadFixture('grok.html');
  const root = win.document.getElementById('grok-attach-menu');
  let clicked = false;
  const upload = win.document.querySelector('#grok-attach-menu [role=menuitem]');
  upload.addEventListener('click', () => {
    clicked = true;
  });
  const picked = pickMenuItem(root, /загрузить файл/i);
  assert.ok(picked);
  assert.equal(clicked, true);
});

test('locateMenuRoot prefers aria-controls target', () => {
  const win = loadFixture('copilot.html');
  const trigger = win.document.getElementById('copilot-mode');
  trigger.setAttribute('aria-controls', 'copilot-model-menu');
  const root = locateMenuRoot(win.document, trigger);
  assert.equal(root.id, 'copilot-model-menu');
});
