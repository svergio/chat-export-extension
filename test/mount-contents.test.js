import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { isRendered } from '../src/definePlatform.js';

function rect(w, h = 20) {
  return { x: 0, y: 0, width: w, height: h, top: 0, left: 0, right: w, bottom: h, toJSON: () => ({}) };
}

test('isRendered treats display:contents host with wide child as visible', () => {
  const win = new Window();
  const doc = win.document;
  const host = doc.createElement('div');
  host.style.display = 'contents';
  const child = doc.createElement('span');
  child.textContent = 'chip';
  child.getBoundingClientRect = () => rect(48);
  host.getBoundingClientRect = () => rect(0);
  host.appendChild(child);
  doc.body.appendChild(host);

  globalThis.document = doc;
  globalThis.getComputedStyle = win.getComputedStyle.bind(win);
  try {
    assert.equal(isRendered(host), true);
    assert.equal(isRendered(null), false);
    host.removeChild(child);
    assert.equal(isRendered(host), false);
  } finally {
    delete globalThis.document;
    delete globalThis.getComputedStyle;
  }
});

test('isRendered uses own width when display is not contents', () => {
  const win = new Window();
  const el = win.document.createElement('div');
  el.getBoundingClientRect = () => rect(0);
  globalThis.document = win.document;
  globalThis.getComputedStyle = win.getComputedStyle.bind(win);
  try {
    assert.equal(isRendered(el), false);
    el.getBoundingClientRect = () => rect(10);
    assert.equal(isRendered(el), true);
  } finally {
    delete globalThis.document;
    delete globalThis.getComputedStyle;
  }
});
