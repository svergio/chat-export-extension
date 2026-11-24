import { maybeOpenWelcome } from './onboarding.js';

// Direct write into an already granted folder: bounded by the 64 MiB runtime
// message limit (base64 + JSON envelope), not by storage.session. Exports that
// must wait for a folder are bounded separately by canQueue (session quota).
const MAX_B64 = 48 * 1024 * 1024;
const JOB_PREFIX = 'ce.job.';
// folder.html popup only: { windowId, tabId, mode }. Queued jobs live in QUEUE_KEY.
const FOLDER_WIN_KEY = 'ce.folderWindow';
// Exports waiting for a folder, from any tab: [{ id, tabId, mode }].
const QUEUE_KEY = 'ce.folderQueue';
// chrome.storage.session quota (10 MB since Chrome 112); keep headroom for the rest.
const SESSION_QUOTA_FALLBACK = 10 * 1024 * 1024;
const QUEUE_HEADROOM = 0.9;
const OFFSCREEN_URL = 'offscreen.html';
const WIN_W = 420;
const WIN_H = 380;

let creating = null;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!creating) {
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ['BLOBS'],
        justification: 'Write exported chats into the user-chosen folder'
      })
      .catch(function (e) {
        if (!/single offscreen/i.test(String(e && e.message))) throw e;
      })
      .finally(function () {
        creating = null;
      });
  }
  await creating;
}

async function offscreen(op, extra) {
  await ensureOffscreen();
  const res = await chrome.runtime.sendMessage(Object.assign({ target: 'offscreen', op: op }, extra || {}));
  return res || { ok: false, reason: 'error' };
}

function broadcast(msg) {
  chrome.runtime.sendMessage(msg).catch(function () {});
}

async function broadcastStatus() {
  const st = await offscreen('status');
  broadcast({ type: 'ce-folder-changed', state: st.state, name: st.name || null });
  return st;
}

let queueLock = Promise.resolve();

function serial(fn) {
  const run = queueLock.then(fn, fn);
  queueLock = run.catch(function () {});
  return run;
}

const MODE_RANK = { grant: 0, pick: 1, rebind: 2 };

function strongerMode(a, b) {
  if (!a) return b || null;
  return (MODE_RANK[b] || 0) > (MODE_RANK[a] || 0) ? b : a;
}

async function readQueue() {
  const got = await chrome.storage.session.get(QUEUE_KEY);
  return Array.isArray(got[QUEUE_KEY]) ? got[QUEUE_KEY] : [];
}

function writeQueue(q) {
  return q.length ? chrome.storage.session.set({ [QUEUE_KEY]: q }) : chrome.storage.session.remove(QUEUE_KEY);
}

function queueMode(q) {
  let mode = null;
  for (let i = 0; i < q.length; i++) mode = strongerMode(mode, q[i].mode);
  return mode;
}

async function readFolderWindow() {
  const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
  const rec = got[FOLDER_WIN_KEY];
  if (!rec || rec.windowId == null) return null;
  const win = await chrome.windows.get(rec.windowId, { populate: true }).catch(function () {
    return null;
  });
  const page = chrome.runtime.getURL('folder.html');
  const tab =
    win &&
    (win.tabs || []).find(function (x) {
      return x.id === rec.tabId && String(x.url || x.pendingUrl || '').indexOf(page) === 0;
    });
  if (!tab) {
    // Only the popup record is stale; queued exports stay for their origin tabs.
    await chrome.storage.session.remove(FOLDER_WIN_KEY);
    return null;
  }
  return { rec: rec, win: win };
}

function writeFolderRecord(rec) {
  return chrome.storage.session.set({ [FOLDER_WIN_KEY]: rec });
}

function dropJobs(ids) {
  const keys = (ids || []).map(function (id) {
    return JOB_PREFIX + id;
  });
  return keys.length ? chrome.storage.session.remove(keys) : Promise.resolve();
}

// Extension pages (folder popup, welcome) get the total; each origin tab gets its
// own count so the bar can drop its pending state once the queue is empty.
function notifyQueue(q, tabIds) {
  broadcast({ type: 'ce-folder-queue', mode: queueMode(q), count: q.length });
  const seen = [];
  for (let i = 0; i < (tabIds || []).length; i++) {
    const tabId = tabIds[i];
    if (tabId == null || seen.indexOf(tabId) >= 0) continue;
    seen.push(tabId);
    const count = q.filter(function (e) {
      return e.tabId === tabId;
    }).length;
    Promise.resolve()
      .then(function () {
        return chrome.tabs.sendMessage(tabId, { type: 'ce-folder-queue', count: count });
      })
      .catch(function () {});
  }
}

async function createFolderPopup(mode, sender) {
  const url = chrome.runtime.getURL('folder.html') + '?mode=' + encodeURIComponent(mode);
  const props = { url: url, type: 'popup', state: 'normal', width: WIN_W, height: WIN_H, focused: true };
  const anchorId = sender && sender.tab ? sender.tab.windowId : null;
  const anchor = await (anchorId != null ? chrome.windows.get(anchorId) : Promise.reject())
    .catch(function () {
      return chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    })
    .catch(function () {
      return null;
    });
  if (anchor && anchor.width != null && anchor.left != null) {
    props.left = Math.max(0, Math.round(anchor.left + (anchor.width - WIN_W) / 2));
    props.top = Math.max(0, Math.round(anchor.top + (anchor.height - WIN_H) / 2));
  }
  const win = await chrome.windows.create(props);
  if (win.state !== 'normal' || win.width !== WIN_W || win.height !== WIN_H) {
    const bounds = { state: 'normal', width: WIN_W, height: WIN_H, focused: true };
    if (props.left != null) Object.assign(bounds, { left: props.left, top: props.top });
    await chrome.windows.update(win.id, bounds).catch(function () {});
  }
  return win;
}

function openFolderPage(mode, jobId, sender) {
  return serial(async function () {
    const q = await readQueue();
    if (jobId && !q.some(function (e) {
      return e.id === jobId;
    })) {
      const tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : null;
      q.push({ id: jobId, tabId: tabId, mode: mode });
      await writeQueue(q);
    }
    const open = await readFolderWindow();
    if (open) {
      const rec = open.rec;
      rec.mode = strongerMode(rec.mode, mode);
      await writeFolderRecord(rec);
      notifyQueue(q, []);
      await chrome.windows.update(rec.windowId, { focused: true }).catch(function () {});
      return open.win;
    }
    const win = await createFolderPopup(mode, sender);
    const tab = win.tabs && win.tabs[0];
    await writeFolderRecord({ windowId: win.id, tabId: tab ? tab.id : null, mode: mode });
    return win;
  });
}

function dropWindowRecord(windowId) {
  return serial(async function () {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || rec.windowId !== windowId) return;
    await chrome.storage.session.remove(FOLDER_WIN_KEY);
  });
}

// Origin tab closed: nobody is waiting for its exports any more.
function dropTabJobs(tabId) {
  return serial(async function () {
    const q = await readQueue();
    const gone = q.filter(function (e) {
      return e.tabId === tabId;
    });
    if (!gone.length) return;
    const rest = q.filter(function (e) {
      return e.tabId !== tabId;
    });
    await dropJobs(
      gone.map(function (e) {
        return e.id;
      })
    );
    await writeQueue(rest);
    notifyQueue(rest, []);
  });
}

// pred(entry) selects entries to take; null takes the whole queue.
function takeQueuedJobs(pred) {
  return serial(async function () {
    const q = await readQueue();
    const taken = pred ? q.filter(pred) : q;
    if (!taken.length) return [];
    const rest = pred
      ? q.filter(function (e) {
          return !pred(e);
        })
      : [];
    await writeQueue(rest);
    return taken;
  });
}

async function tabAlive(tabId) {
  try {
    return !!(await chrome.tabs.get(tabId));
  } catch (e) {
    return false;
  }
}

// Failed jobs go back to the front of the queue under their origin tab; jobs
// whose origin tab is already closed are dropped instead of left orphaned.
function requeue(entries) {
  return serial(async function () {
    const keep = [];
    const drop = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.tabId == null || (await tabAlive(e.tabId))) keep.push(e);
      else drop.push(e.id);
    }
    await dropJobs(drop);
    const q = await readQueue();
    const next = keep
      .filter(function (e) {
        return !q.some(function (x) {
          return x.id === e.id;
        });
      })
      .concat(q);
    await writeQueue(next);
    notifyQueue(
      next,
      entries.map(function (e) {
        return e.tabId;
      })
    );
  });
}

async function queueInfo() {
  const q = await readQueue();
  const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
  const rec = got[FOLDER_WIN_KEY];
  return { ok: true, mode: strongerMode(queueMode(q), rec ? rec.mode : null), count: q.length };
}

function cancelQueue() {
  return serial(async function () {
    const q = await readQueue();
    await dropJobs(
      q.map(function (e) {
        return e.id;
      })
    );
    await writeQueue([]);
    notifyQueue(
      [],
      q.map(function (e) {
        return e.tabId;
      })
    );
    return { ok: true, dropped: q.length };
  });
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return null;
  const out = [];
  for (const f of files) {
    if (!f || typeof f.b64 !== 'string' || !f.name) return null;
    out.push({ name: String(f.name), mime: String(f.mime || 'application/octet-stream'), b64: f.b64 });
  }
  return out.length ? out : null;
}

async function canQueue(job) {
  const area = chrome.storage.session;
  const quota = area.QUOTA_BYTES || SESSION_QUOTA_FALLBACK;
  let used = 0;
  try {
    if (typeof area.getBytesInUse === 'function') used = (await area.getBytesInUse(null)) || 0;
  } catch (e) {
    used = 0;
  }
  return used + JSON.stringify(job).length + 64 <= quota * QUEUE_HEADROOM;
}

async function storeJob(job) {
  const id = crypto.randomUUID();
  await chrome.storage.session.set({ [JOB_PREFIX + id]: job });
  return id;
}

async function takeJob(id) {
  const key = JOB_PREFIX + id;
  const got = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  return got[key] || null;
}

function enqueueJob(jobId, mode, sender) {
  const tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : null;
  return serial(async function () {
    const q = await readQueue();
    if (!q.some(function (e) {
      return e.id === jobId;
    })) q.push({ id: jobId, tabId: tabId, mode: mode });
    await writeQueue(q);
    notifyQueue(q, []);
  });
}

async function notifyRegrant(sender, jobId, mode) {
  const tabId = sender && sender.tab ? sender.tab.id : null;
  if (tabId == null) return false;
  const opts = sender.frameId != null ? { frameId: sender.frameId } : undefined;
  try {
    await chrome.tabs.sendMessage(
      tabId,
      { type: 'ce-regrant-folder', jobId: jobId, mode: mode },
      opts
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function deferToRegrant(job, mode, sender) {
  // Not enough room in storage.session to hold the export until a folder is
  // chosen: the caller falls back to Downloads and says why.
  let jobId = null;
  if (await canQueue(job)) {
    jobId = await storeJob(job).catch(function () {
      return null;
    });
  }
  if (!jobId) {
    if (mode === 'pick') await maybeOpenWelcome('first-export');
    return { ok: false, reason: 'too-large-to-queue' };
  }
  await enqueueJob(jobId, mode, sender);
  // First export that finds no folder ever = onboarding moment: open the
  // welcome page (inline folder pick, drains the queue via allQueued)
  // instead of the blocking folder popup. The bar still gets the pending
  // no-folder response and keeps its own folder button as a fallback.
  if (mode === 'pick' && (await maybeOpenWelcome('first-export'))) {
    return { ok: false, reason: 'no-folder', jobId: jobId, pending: true };
  }
  const pinged = await notifyRegrant(sender, jobId, mode);
  if (pinged) {
    return { ok: false, reason: 'needs_regrant', jobId: jobId, pending: true };
  }
  await openFolderPage(mode, jobId, sender);
  return {
    ok: false,
    reason: mode === 'pick' ? 'no-folder' : 'permission',
    jobId: jobId,
    pending: true
  };
}

async function handleSave(msg, sender) {
  const files = normalizeFiles(msg.files);
  if (!files) return { ok: false, reason: 'error', error: 'empty' };
  let total = 0;
  for (const f of files) total += f.b64.length;
  if (total > MAX_B64) return { ok: false, reason: 'too-large' };
  const pack = msg.pack === 'zip' || msg.pack === 'folder' ? msg.pack : 'single';
  const job = { pack: pack, subdir: msg.subdir ? String(msg.subdir) : null, files: files };
  if (sender && sender.tab && sender.tab.id != null && sender.tab.id >= 0) {
    job.origin = { tabId: sender.tab.id, frameId: sender.frameId != null ? sender.frameId : null };
  }

  if (msg.rebind) return deferToRegrant(job, 'rebind', sender);

  let st = await offscreen('status');
  if (st.state === 'unsupported') return { ok: false, reason: 'unsupported' };
  if (st.state === 'none') return deferToRegrant(job, 'pick', sender);

  if (st.state !== 'granted') {
    const granted = await offscreen('tryGrant');
    if (granted && granted.ok) st = granted;
  }

  if (st.state !== 'granted') return deferToRegrant(job, 'grant', sender);

  const res = await offscreen('write', job);
  if (res.ok) return { ok: true, via: 'folder', name: res.name, folder: res.folder };
  if (res.reason === 'no-folder') return deferToRegrant(job, 'pick', sender);
  if (res.reason === 'permission') return deferToRegrant(job, 'grant', sender);
  return res;
}

function notifyOrigin(origin, res, jobId) {
  if (!origin || origin.tabId == null) return;
  const opts = origin.frameId != null ? { frameId: origin.frameId } : undefined;
  Promise.resolve()
    .then(function () {
      return chrome.tabs.sendMessage(
        origin.tabId,
        { type: 'ce-saved', jobId: jobId || null, name: res.name || null, folder: res.folder || null },
        opts
      );
    })
    .catch(function () {});
}

async function handlePicked(msg, sender) {
  const tabId = sender && sender.tab ? sender.tab.id : null;
  // Extension pages (welcome, folder popup) pass allQueued to drain exports
  // queued from every provider tab.
  const fromExtPage = !!(sender && sender.url && sender.url.indexOf(chrome.runtime.getURL('')) === 0);
  const drainAll = !!msg.allQueued && fromExtPage;
  const entries = drainAll
    ? await takeQueuedJobs(null)
    : tabId != null
      ? await takeQueuedJobs(function (e) {
          return e.tabId === tabId;
        })
      : [];
  function has(id) {
    return entries.some(function (e) {
      return e.id === id;
    });
  }
  if (msg.jobId && !has(msg.jobId)) {
    const one = await takeQueuedJobs(function (e) {
      return e.id === msg.jobId;
    });
    entries.push(one[0] || { id: msg.jobId, tabId: tabId, mode: 'pick' });
  }
  // Also drain jobs attached to the provider tab (regrant from ExportBar).
  if (!drainAll && msg.originTabId != null && msg.originTabId !== tabId) {
    const extra = await takeQueuedJobs(function (e) {
      return e.tabId === msg.originTabId;
    });
    for (let i = 0; i < extra.length; i++) {
      if (!has(extra[i].id)) entries.push(extra[i]);
    }
  }
  const written = [];
  let failure = null;
  let left = 0;
  for (let i = 0; i < entries.length; i++) {
    const job = await takeJob(entries[i].id);
    if (!job) continue;
    let res;
    try {
      res = await offscreen('write', job);
    } catch (e) {
      res = { ok: false, reason: 'error', error: String((e && e.message) || e) };
    }
    if (res.ok) {
      written.push(res.name);
      notifyOrigin(job.origin, res, entries[i].id);
      continue;
    }
    failure = res;
    await chrome.storage.session.set({ [JOB_PREFIX + entries[i].id]: job });
    left = entries.length - i;
    await requeue(entries.slice(i));
    break;
  }
  if (!failure && entries.length) {
    notifyQueue(
      await readQueue(),
      entries.map(function (e) {
        return e.tabId;
      })
    );
  }
  const st = await broadcastStatus();
  const out = { ok: !failure, state: st.state, name: st.name || null, saved: written.length, written: written };
  if (failure) Object.assign(out, { reason: failure.reason, error: failure.error, pending: left });
  return out;
}

async function handleStoreHandle(msg, sender) {
  const stored = await offscreen('store', { handle: msg.handle });
  if (!stored || !stored.ok) return stored || { ok: false, reason: 'permission' };
  await broadcastStatus();
  const originTabId = msg.originTabId != null ? msg.originTabId : sender && sender.tab ? sender.tab.id : null;
  return handlePicked({ jobId: msg.jobId || null, originTabId: originTabId }, sender);
}

async function handleBridge(msg, sender) {
  switch (msg.action) {
    case 'folderStatus': {
      const st = await offscreen('status');
      return { ok: true, state: st.state || 'unsupported', name: st.name || null };
    }
    case 'folderPick': {
      const mode = msg.mode === 'rebind' || msg.mode === 'grant' ? msg.mode : 'pick';
      await openFolderPage(mode, msg.jobId || null, sender);
      return { ok: true, opened: true };
    }
    case 'folderForget':
      await offscreen('forget');
      await broadcastStatus();
      return { ok: true };
    case 'folderPicked':
      return handlePicked(msg, sender);
    case 'folderStore':
      return handleStoreHandle(msg, sender);
    case 'folderQueue':
      return queueInfo();
    case 'folderCancel':
      return cancelQueue();
    default:
      return null;
  }
}

const BRIDGE_ACTIONS = [
  'folderStatus',
  'folderPick',
  'folderForget',
  'folderPicked',
  'folderStore',
  'folderQueue',
  'folderCancel'
];

export function registerSaveHandlers() {
  chrome.windows.onRemoved.addListener(function (windowId) {
    dropWindowRecord(windowId).catch(function () {});
  });
  chrome.tabs.onRemoved.addListener(function (tabId) {
    dropTabJobs(tabId).catch(function () {});
  });
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || typeof msg !== 'object') return;
    let job;
    if (msg.type === 'ce-save') job = handleSave(msg, sender);
    else if (msg.type === 'ce-bridge' && BRIDGE_ACTIONS.indexOf(msg.action) >= 0) job = handleBridge(msg, sender);
    else return;
    job.then(sendResponse, function (e) {
      sendResponse({ ok: false, reason: 'error', error: String((e && e.message) || e) });
    });
    return true;
  });
}
