import test from 'node:test';
import assert from 'node:assert/strict';
import { canPickFolder, fsWritable, fsSupported, folderState } from '../src/folder/store.js';

test('fsWritable does not require showDirectoryPicker (offscreen write path)', () => {
  const hadPicker = Object.prototype.hasOwnProperty.call(globalThis, 'showDirectoryPicker');
  const prevPicker = globalThis.showDirectoryPicker;
  const hadDir = Object.prototype.hasOwnProperty.call(globalThis, 'FileSystemDirectoryHandle');
  const prevDir = globalThis.FileSystemDirectoryHandle;

  delete globalThis.showDirectoryPicker;
  globalThis.FileSystemDirectoryHandle = function FileSystemDirectoryHandle() {};

  try {
    assert.equal(canPickFolder(), false);
    assert.equal(fsSupported(), false);
    assert.equal(fsWritable(), true);
  } finally {
    if (hadPicker) globalThis.showDirectoryPicker = prevPicker;
    else delete globalThis.showDirectoryPicker;
    if (hadDir) globalThis.FileSystemDirectoryHandle = prevDir;
    else delete globalThis.FileSystemDirectoryHandle;
  }
});

test('folderState is unsupported only when FileSystemDirectoryHandle is missing', async () => {
  const hadPicker = Object.prototype.hasOwnProperty.call(globalThis, 'showDirectoryPicker');
  const prevPicker = globalThis.showDirectoryPicker;
  const hadDir = Object.prototype.hasOwnProperty.call(globalThis, 'FileSystemDirectoryHandle');
  const prevDir = globalThis.FileSystemDirectoryHandle;

  delete globalThis.showDirectoryPicker;
  delete globalThis.FileSystemDirectoryHandle;
  assert.equal(await folderState(null), 'unsupported');

  globalThis.FileSystemDirectoryHandle = function FileSystemDirectoryHandle() {};
  assert.equal(await folderState(null), 'none');

  const handle = {
    queryPermission: async () => 'granted'
  };
  assert.equal(await folderState(handle), 'granted');

  if (hadPicker) globalThis.showDirectoryPicker = prevPicker;
  else delete globalThis.showDirectoryPicker;
  if (hadDir) globalThis.FileSystemDirectoryHandle = prevDir;
  else delete globalThis.FileSystemDirectoryHandle;
});
