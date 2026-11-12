import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBarPage } from './shared-dom-harness.js';
import { loadChatExport } from './core-harness.js';

test('Escape closes format menu and returns focus to format button', async () => {
  const win = loadBarPage('https://chatgpt.com/', ['md']);
  const doc = win.document;
  const anchor = doc.createElement('div');
  doc.body.appendChild(anchor);

  const CE = win.ChatExport;
  CE.injectBar(anchor, { platform: 'pack' });

  const fmt = doc.querySelector('.chat-export-fmt');
  assert.ok(fmt, 'format button missing');
  fmt.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await win.happyDOM.waitUntilComplete();

  assert.ok(doc.querySelector('[data-chat-export-menu="pack"]'), 'menu should be open');

  doc.dispatchEvent(
    new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  );
  await win.happyDOM.waitUntilComplete();

  assert.equal(doc.querySelector('[data-chat-export-menu="pack"]'), null, 'menu should close');
  assert.equal(doc.activeElement, fmt, 'focus should return to format button');
  assert.equal(fmt.getAttribute('aria-expanded'), 'false');
});

test('format menu with a single selected format still shows Folder / Zip pack controls', async () => {
  const win = loadBarPage('https://chatgpt.com/', ['md']);
  const doc = win.document;
  const anchor = doc.createElement('div');
  doc.body.appendChild(anchor);

  const CE = win.ChatExport;
  CE.injectBar(anchor, { platform: 'pack' });

  const fmt = doc.querySelector('.chat-export-fmt');
  assert.ok(fmt, 'format button missing');
  fmt.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await win.happyDOM.waitUntilComplete();

  const pack = doc.querySelector('.chat-export-pack');
  assert.ok(pack, 'pack radiogroup should render when only one format is selected');
  assert.ok(pack.querySelector('[data-pack="folder"]'), 'folder pack option missing');
  assert.ok(pack.querySelector('[data-pack="zip"]'), 'zip pack option missing');
});

test('resolvePack applies Folder / Zip to any number of formats', () => {
  const { CE } = loadChatExport();
  assert.equal(CE.resolvePack(1, 'zip'), 'zip');
  assert.equal(CE.resolvePack(1, 'folder'), 'file');
  assert.equal(CE.resolvePack(2, 'zip'), 'zip');
  assert.equal(CE.resolvePack(2, 'folder'), 'folder');
  assert.equal(CE.resolvePack(3, undefined), 'zip');
  assert.equal(CE.resolvePack(2, 'file'), 'file');
});

async function captureSave(formats, pack) {
  const { win, CE } = loadChatExport();
  let sent = null;
  win.chrome = {
    runtime: {
      id: 'test',
      lastError: undefined,
      sendMessage(msg, cb) {
        sent = msg;
        cb({ ok: true, via: 'folder', name: 'x' });
      }
    }
  };
  const res = await CE.exportConversation({
    platform: 'chatgpt',
    title: 'Pack test',
    messages: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'hello' }],
    formats,
    pack
  });
  return { res, sent };
}

test('single format with Zip saves a zip holding one file', async () => {
  const { res, sent } = await captureSave(['md'], 'zip');
  assert.equal(res.ok, true);
  assert.equal(sent.type, 'ce-save');
  assert.equal(sent.pack, 'zip');
  assert.equal(sent.subdir, null);
  assert.equal(sent.files.length, 1);
  assert.match(sent.files[0].name, /\.zip$/);
});

test('single format with Folder saves one file in the folder root', async () => {
  const { sent } = await captureSave(['md'], 'folder');
  assert.equal(sent.pack, 'single');
  assert.equal(sent.subdir, null);
  assert.equal(sent.files.length, 1);
  assert.match(sent.files[0].name, /\.md$/);
});

test('multiple formats with Folder save into a subfolder', async () => {
  const { sent } = await captureSave(['md', 'json'], 'folder');
  assert.equal(sent.pack, 'folder');
  assert.ok(sent.subdir);
  assert.deepEqual(Array.from(sent.files, (f) => f.name.split('.').pop()).sort(), ['json', 'md']);
});
