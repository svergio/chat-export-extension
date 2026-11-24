import test from 'node:test';
import assert from 'node:assert/strict';

const tick = () => new Promise((r) => setTimeout(r, 1));

function named(name) {
  const e = new Error(name);
  e.name = name;
  return e;
}

// FileSystemDirectoryHandle stand-in; async gaps let parallel writes interleave.
function fakeDir(name, failOn) {
  const entries = new Map();
  const dir = {
    name,
    kind: 'directory',
    entries,
    async queryPermission() {
      return 'granted';
    },
    async getFileHandle(n, opts) {
      await tick();
      let e = entries.get(n);
      if (!e) {
        if (!(opts && opts.create)) throw named('NotFoundError');
        e = { kind: 'file', data: '' };
        entries.set(n, e);
      }
      if (e.kind !== 'file') throw named('TypeMismatchError');
      return {
        async createWritable() {
          let buf = '';
          return {
            async write(blob) {
              if (failOn && failOn(n)) throw new Error('disk');
              buf = await blob.text();
            },
            async close() {
              await tick();
              e.data = buf;
            },
            async abort() {}
          };
        }
      };
    },
    async getDirectoryHandle(n, opts) {
      await tick();
      let e = entries.get(n);
      if (!e) {
        if (!(opts && opts.create)) throw named('NotFoundError');
        e = { kind: 'dir', dir: fakeDir(n, failOn) };
        entries.set(n, e);
      }
      if (e.kind !== 'dir') throw named('TypeMismatchError');
      return e.dir;
    },
    async removeEntry(n) {
      if (!entries.has(n)) throw named('NotFoundError');
      entries.delete(n);
    }
  };
  return dir;
}

let listener = null;
let root = null;
globalThis.FileSystemDirectoryHandle = function () {};
globalThis.indexedDB = {
  open() {
    const req = {};
    setTimeout(() => {
      req.result = {
        objectStoreNames: { contains: () => true },
        close() {},
        transaction() {
          const t = { objectStore: () => ({ get: () => ({ result: root }), put: () => ({}), delete: () => ({}) }) };
          setTimeout(() => t.oncomplete && t.oncomplete());
          return t;
        }
      };
      req.onsuccess();
    });
    return req;
  }
};
globalThis.chrome = { runtime: { onMessage: { addListener: (fn) => (listener = fn) } } };
await import('../src/offscreen/main.js');

function write(job) {
  return new Promise((resolve) => listener(Object.assign({ target: 'offscreen', op: 'write' }, job), {}, resolve));
}

const b64 = (s) => Buffer.from(s).toString('base64');
const file = (name, text) => ({ name, mime: 'text/plain', b64: b64(text) });

test('parallel writes with the same name get distinct files, nothing overwritten', async () => {
  root = fakeDir('Exports');
  const [a, b] = await Promise.all([
    write({ pack: 'single', files: [file('same.md', 'FIRST')] }),
    write({ pack: 'single', files: [file('same.md', 'SECOND')] })
  ]);
  assert.equal(a.ok && b.ok, true);
  assert.deepEqual([a.name, b.name], ['same.md', 'same (1).md']);
  assert.equal(root.entries.get('same.md').data, 'FIRST');
  assert.equal(root.entries.get('same (1).md').data, 'SECOND');
});

test('folder pack: a failure on the 2nd file removes the half-written folder', async () => {
  root = fakeDir('Exports', (n) => n === 'x.pdf');
  const res = await write({ pack: 'folder', subdir: 'x-chat', files: [file('x.md', 'md'), file('x.pdf', 'pdf')] });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'disk');
  assert.deepEqual(Array.from(root.entries.keys()), [], 'no x-chat/ left behind');
});

test('multi-file single pack: a failure removes the files written so far', async () => {
  root = fakeDir('Exports', (n) => n === 'b.json');
  const res = await write({ pack: 'single', files: [file('a.md', 'a'), file('b.json', 'b')] });
  assert.equal(res.ok, false);
  assert.deepEqual(Array.from(root.entries.keys()), []);
});

test('successful folder pack returns every written file', async () => {
  root = fakeDir('Exports');
  const res = await write({ pack: 'folder', subdir: 'c', files: [file('c.md', '1'), file('c.json', '2')] });
  assert.equal(res.ok, true);
  assert.equal(res.name, 'c');
  assert.deepEqual(res.files, ['c.md', 'c.json']);
});
