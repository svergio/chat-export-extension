const MAX_B64 = 8 * 1024 * 1024;
const JOB_PREFIX = 'ce.job.';
const FOLDER_WIN_KEY = 'ce.folderWindow';
const OFFSCREEN_URL = 'offscreen.html';

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
  return (MODE_RANK[b] || 0) > (MODE_RANK[a] || 0) ? b : a;
}

async function readFolderWindow() {
  const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
  const rec = got[FOLDER_WIN_KEY];
  if (!rec || rec.tabId == null) return null;
  const page = chrome.runtime.getURL('folder.html');
  const tab = await chrome.tabs.get(rec.tabId).catch(function () {
    return null;
  });
  if (!tab || String(tab.url || tab.pendingUrl || '').indexOf(page) !== 0) {
    await dropJobs(rec.jobs);
    await chrome.storage.session.remove(FOLDER_WIN_KEY);
    return null;
  }
  return { rec: rec, tab: tab };
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

function notifyQueue(rec) {
  broadcast({ type: 'ce-folder-queue', tabId: rec.tabId, mode: rec.mode, count: rec.jobs.length });
}

async function createFolderPage(mode, sender) {
  const url = chrome.runtime.getURL('folder.html') + '?mode=' + encodeURIComponent(mode);
  const anchorWinId = sender && sender.tab ? sender.tab.windowId : null;
  let winId = anchorWinId;
  if (winId == null) {
    const focused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(function () {
      return null;
    });
    winId = focused && focused.id != null ? focused.id : undefined;
  }
  const props = { url: url, active: true };
  if (winId != null) props.windowId = winId;
  const tab = await chrome.tabs.create(props);
  return { tab: tab, windowId: tab.windowId, tabId: tab.id };
}

function openFolderPage(mode, jobId, sender) {
  return serial(async function () {
    const open = await readFolderWindow();
    if (open) {
      const rec = open.rec;
      if (jobId && rec.jobs.indexOf(jobId) < 0) rec.jobs.push(jobId);
      rec.mode = strongerMode(rec.mode, mode);
      await writeFolderRecord(rec);
      notifyQueue(rec);
      await chrome.tabs.update(rec.tabId, { active: true }).catch(function () {});
      if (rec.windowId != null) {
        await chrome.windows.update(rec.windowId, { focused: true }).catch(function () {});
      }
      return open.tab;
    }
    const created = await createFolderPage(mode, sender);
    await writeFolderRecord({
      windowId: created.windowId,
      tabId: created.tabId,
      mode: mode,
      jobs: jobId ? [jobId] : []
    });
    return created.tab;
  });
}

function dropTabJobs(tabId) {
  return serial(async function () {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || rec.tabId !== tabId) return;
    await dropJobs(rec.jobs);
    await chrome.storage.session.remove(FOLDER_WIN_KEY);
  });
}

function takeQueuedJobs(tabId) {
  return serial(async function () {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || (tabId != null && rec.tabId !== tabId)) return [];
    const ids = rec.jobs;
    rec.jobs = [];
    await writeFolderRecord(rec);
    return ids;
  });
}

function requeue(tabId, ids) {
  return serial(async function () {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || rec.tabId !== tabId) return dropJobs(ids);
    rec.jobs = ids.concat(rec.jobs);
    await writeFolderRecord(rec);
  });
}

async function queueInfo(tabId) {
  const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
  const rec = got[FOLDER_WIN_KEY];
  if (!rec || rec.tabId !== tabId) return { ok: true, mode: null, count: 0 };
  return { ok: true, mode: rec.mode, count: rec.jobs.length };
}

function cancelQueue(tabId) {
  return serial(async function () {
    const got = await chrome.storage.session.get(FOLDER_WIN_KEY);
    const rec = got[FOLDER_WIN_KEY];
    if (!rec || rec.tabId !== tabId) return { ok: true, dropped: 0 };
    const n = rec.jobs.length;
    await dropJobs(rec.jobs);
    rec.jobs = [];
    await writeFolderRecord(rec);
    return { ok: true, dropped: n };
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

async function deferJob(job, mode, reason, sender) {
  const jobId = await storeJob(job);
  await openFolderPage(mode, jobId, sender);
  return { ok: false, reason: reason, jobId: jobId, pending: true };
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

  const st = await offscreen('status');
  if (st.state === 'unsupported') return { ok: false, reason: 'unsupported' };
  if (msg.rebind) return deferJob(job, 'rebind', 'rebind', sender);
  if (st.state === 'none') return deferJob(job, 'pick', 'no-folder', sender);
  if (st.state !== 'granted') return deferJob(job, 'grant', 'permission', sender);

  const res = await offscreen('write', job);
  if (res.ok) return { ok: true, via: 'folder', name: res.name, folder: res.folder };
  if (res.reason === 'no-folder') return deferJob(job, 'pick', 'no-folder', sender);
  if (res.reason === 'permission') return deferJob(job, 'grant', 'permission', sender);
  return res;
}

function notifyOrigin(origin, res) {
  if (!origin || origin.tabId == null) return;
  const opts = origin.frameId != null ? { frameId: origin.frameId } : undefined;
  chrome.tabs
    .sendMessage(origin.tabId, { type: 'ce-saved', name: res.name || null, folder: res.folder || null }, opts)
    .catch(function () {});
}

async function handlePicked(msg, sender) {
  const tabId = sender && sender.tab ? sender.tab.id : null;
  const ids = tabId != null ? await takeQueuedJobs(tabId) : [];
  if (msg.jobId && ids.indexOf(msg.jobId) < 0) ids.push(msg.jobId);
  const written = [];
  let failure = null;
  for (let i = 0; i < ids.length; i++) {
    const job = await takeJob(ids[i]);
    if (!job) continue;
    const res = await offscreen('write', job);
    if (res.ok) {
      written.push(res.name);
      notifyOrigin(job.origin, res);
      continue;
    }
    failure = res;
    await chrome.storage.session.set({ [JOB_PREFIX + ids[i]]: job });
    if (tabId != null) await requeue(tabId, ids.slice(i));
    break;
  }
  const st = await broadcastStatus();
  const out = { ok: !failure, state: st.state, name: st.name || null, saved: written.length, written: written };
  if (failure) Object.assign(out, { reason: failure.reason, error: failure.error });
  return out;
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
    case 'folderQueue':
      return queueInfo(sender && sender.tab ? sender.tab.id : null);
    case 'folderCancel':
      return cancelQueue(sender && sender.tab ? sender.tab.id : null);
    default:
      return null;
  }
}

const BRIDGE_ACTIONS = ['folderStatus', 'folderPick', 'folderForget', 'folderPicked', 'folderQueue', 'folderCancel'];

export function registerSaveHandlers() {
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
