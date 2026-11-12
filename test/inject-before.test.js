import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBarPage } from './shared-dom-harness.js';

test('injectBar prefers beforeChild over insertAfter', () => {
  const win = loadBarPage();
  const doc = win.document;
  const anchor = doc.createElement('div');
  anchor.id = 'slot';
  const before = doc.createElement('div');
  before.id = 'before';
  const after = doc.createElement('div');
  after.id = 'after';
  anchor.appendChild(before);
  anchor.appendChild(after);
  doc.body.appendChild(anchor);

  const CE = win.ChatExport;
  CE.injectBar(anchor, {
    platform: 'inj',
    beforeChild: before,
    insertAfter: after
  });

  const host = doc.querySelector('[data-ce-host="inj"]');
  assert.ok(host, 'host missing');
  assert.equal(host.nextElementSibling, before, 'host should sit immediately before beforeChild');
  assert.ok(host.compareDocumentPosition(before) & doc.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(before.compareDocumentPosition(after) & doc.DOCUMENT_POSITION_FOLLOWING);
});
