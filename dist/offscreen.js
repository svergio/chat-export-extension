(() => {
  // src/folder/store.js
  var DB_NAME = "chat-export-fs-ext";
  var STORE = "handles";
  var KEY = "default";
  function openDb() {
    return new Promise(function(resolve, reject) {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function() {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function() {
        resolve(req.result);
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  }
  function tx(mode, fn) {
    return openDb().then(function(db) {
      return new Promise(function(resolve, reject) {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = function() {
          db.close();
          resolve(req && req.result);
        };
        t.onerror = t.onabort = function() {
          db.close();
          reject(t.error);
        };
      });
    });
  }
  function loadHandle() {
    return tx("readonly", function(s) {
      return s.get(KEY);
    }).then(function(h) {
      return h || null;
    });
  }
  function clearHandle() {
    return tx("readwrite", function(s) {
      return s.delete(KEY);
    });
  }
  function fsSupported() {
    return typeof self.showDirectoryPicker === "function";
  }
  async function folderState(handle) {
    if (!fsSupported()) return "unsupported";
    if (!handle) return "none";
    try {
      const p = await handle.queryPermission({ mode: "readwrite" });
      return p === "granted" ? "granted" : "prompt";
    } catch (e) {
      return "prompt";
    }
  }

  // src/offscreen/main.js
  function splitName(name) {
    const dot = name.lastIndexOf(".");
    if (dot <= 0) return [name, ""];
    return [name.slice(0, dot), name.slice(dot)];
  }
  function safeName(name, fallback) {
    const s = String(name || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^[\s.]+|[\s.]+$/g, "");
    return s || fallback;
  }
  async function exists(dir, name, kind) {
    try {
      if (kind === "dir") await dir.getDirectoryHandle(name);
      else await dir.getFileHandle(name);
      return true;
    } catch (e) {
      if (e && e.name === "NotFoundError") return false;
      if (e && e.name === "TypeMismatchError") return true;
      throw e;
    }
  }
  async function uniqueName(dir, name, kind) {
    if (!await exists(dir, name, kind)) return name;
    const parts = kind === "dir" ? [name, ""] : splitName(name);
    for (let n = 1; n < 1e4; n++) {
      const candidate = parts[0] + " (" + n + ")" + parts[1];
      if (!await exists(dir, candidate, kind)) return candidate;
    }
    throw new Error("no free name for " + name);
  }
  function b64ToBytes(b64) {
    const bin = atob(String(b64 || ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function writeFile(dir, file) {
    const name = await uniqueName(dir, safeName(file.name, "chat"), "file");
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    try {
      await w.write(new Blob([b64ToBytes(file.b64)], { type: file.mime || "application/octet-stream" }));
      await w.close();
    } catch (e) {
      try {
        await w.abort();
      } catch (e2) {
        void e2;
      }
      throw e;
    }
    return name;
  }
  async function write(msg) {
    const root = await loadHandle();
    const state = await folderState(root);
    if (state !== "granted") return { ok: false, reason: state === "none" ? "no-folder" : state === "unsupported" ? "unsupported" : "permission" };
    const files = Array.isArray(msg.files) ? msg.files : [];
    let dir = root;
    let written = null;
    if (msg.pack === "folder" && msg.subdir) {
      written = await uniqueName(root, safeName(msg.subdir, "chat"), "dir");
      dir = await root.getDirectoryHandle(written, { create: true });
    }
    const names = [];
    for (const f of files) names.push(await writeFile(dir, f));
    return { ok: true, folder: root.name, name: written || names[0] || null, files: names };
  }
  async function status() {
    const h = await loadHandle();
    return { ok: true, state: await folderState(h), name: h ? h.name : null };
  }
  function errorReason(e) {
    const n = e && e.name;
    if (n === "NotAllowedError" || n === "SecurityError") return "permission";
    if (n === "NotFoundError") return "no-folder";
    return "error";
  }
  chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
    if (!msg || msg.target !== "offscreen") return;
    let job;
    if (msg.op === "write") job = write(msg);
    else if (msg.op === "status") job = status();
    else if (msg.op === "forget") job = clearHandle().then(() => ({ ok: true }));
    else return;
    job.then(sendResponse, function(e) {
      sendResponse({ ok: false, reason: errorReason(e), error: String(e && e.message || e) });
    });
    return true;
  });
})();
