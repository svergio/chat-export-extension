const DB_NAME = 'chat-export-fs-ext';
const STORE = 'handles';
const KEY = 'default';

function openDb() {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

function tx(mode, fn) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = function () {
        db.close();
        resolve(req && req.result);
      };
      t.onerror = t.onabort = function () {
        db.close();
        reject(t.error);
      };
    });
  });
}

export function loadHandle() {
  return tx('readonly', function (s) {
    return s.get(KEY);
  }).then(function (h) {
    return h || null;
  });
}

export function saveHandle(handle) {
  return tx('readwrite', function (s) {
    return s.put(handle, KEY);
  });
}

export function clearHandle() {
  return tx('readwrite', function (s) {
    return s.delete(KEY);
  });
}

export function fsSupported() {
  return typeof self.showDirectoryPicker === 'function';
}

export async function folderState(handle) {
  if (!fsSupported()) return 'unsupported';
  if (!handle) return 'none';
  try {
    const p = await handle.queryPermission({ mode: 'readwrite' });
    return p === 'granted' ? 'granted' : 'prompt';
  } catch (e) {
    return 'prompt';
  }
}
