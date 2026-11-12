import { loadStored, resolveUiScheme } from '../settings.js';
import { resolveUiDataSkinForFolder, SKIN_AUTO_FALLBACK } from '../skinResolve.js';
import { createTranslator, resolveLocale } from '../i18n/index.js';
import { loadHandle, saveHandle, fsSupported } from './store.js';

const MODES = ['pick', 'rebind', 'grant'];
const params = new URLSearchParams(location.search);

const titleEl = document.getElementById('title');
const leadEl = document.getElementById('lead');
const hintEl = document.getElementById('hint');
const actionEl = document.getElementById('action');
const cancelEl = document.getElementById('cancel');
const msgEl = document.getElementById('msg');

const state = {
  mode: MODES.indexOf(params.get('mode')) >= 0 ? params.get('mode') : 'pick',
  count: 0,
  tabId: null,
  existing: null,
  grantFailed: false,
  finished: false,
  busy: false
};

let t = createTranslator(resolveLocale('auto'));

function fill(key, vars) {
  let s = t(key);
  for (const k in vars) s = s.replace('{' + k + '}', vars[k] == null ? '' : String(vars[k]));
  return s;
}

function say(text, tone) {
  msgEl.textContent = text || '';
  if (tone) msgEl.dataset.tone = tone;
  else delete msgEl.dataset.tone;
}

function sendBridge(action, extra) {
  return chrome.runtime.sendMessage(Object.assign({ type: 'ce-bridge', action: action }, extra || {}));
}

function closeSoon() {
  setTimeout(function () {
    chrome.windows.getCurrent(function (win) {
      if (!win || win.type === 'popup' || state.tabId == null) window.close();
      else chrome.tabs.remove(state.tabId);
    });
  }, 1200);
}

function render() {
  if (state.finished) return;
  if (state.count > 0) {
    leadEl.textContent = state.count === 1 ? t('folderPage.pending') : fill('folderPage.pendingMany', { count: state.count });
  } else if (state.existing) {
    leadEl.textContent = t('label.saveFolder') + ': ' + state.existing.name;
  }
  leadEl.hidden = !(state.count > 0 || state.existing);
  cancelEl.hidden = state.count === 0;
  const grant = state.mode === 'grant' && state.existing && !state.grantFailed;
  hintEl.hidden = !!grant;
  actionEl.textContent = grant ? fill('folderPage.grant', { name: state.existing.name }) : t('folderPage.pick');
  actionEl.hidden = false;
}

function savedText(res, name) {
  const n = (res && res.saved) || 0;
  if (n === 0) return t('label.saveFolder') + ': ' + name;
  if (n === 1) return fill('folderPage.saved', { name: name });
  return fill('folderPage.savedMany', { count: n, name: name });
}

async function finish(name) {
  const res = await sendBridge('folderPicked').catch(function (e) {
    return { ok: false, error: String((e && e.message) || e) };
  });
  if (res && res.ok) {
    state.finished = true;
    actionEl.hidden = true;
    cancelEl.hidden = true;
    say(savedText(res, name), 'ok');
    closeSoon();
    return;
  }
  await refreshQueue();
  say(String((res && (res.error || res.reason)) || 'error'), 'danger');
}

function pickerFailed(e) {
  hintEl.classList.add('is-alert');
  if (e && e.name === 'AbortError') say(t('folderPage.notPicked'), 'warn');
  else say(String((e && e.message) || e), 'danger');
}

async function requestGranted(handle) {
  const perm = await handle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') throw new DOMException('permission ' + perm, 'AbortError');
}

async function onPick() {
  const handle = await showDirectoryPicker({ mode: 'readwrite', id: 'chat-export', startIn: 'downloads' });
  await requestGranted(handle);
  await saveHandle(handle);
  state.existing = handle;
  await finish(handle.name);
}

async function onGrant() {
  try {
    await requestGranted(state.existing);
  } catch (e) {
    state.grantFailed = true;
    render();
    throw e;
  }
  await finish(state.existing.name);
}

function onAction() {
  if (state.busy || state.finished) return;
  state.busy = true;
  actionEl.disabled = true;
  say('');
  const grant = state.mode === 'grant' && state.existing && !state.grantFailed;
  (grant ? onGrant() : onPick()).catch(pickerFailed).finally(function () {
    state.busy = false;
    actionEl.disabled = false;
  });
}

async function onCancel() {
  await sendBridge('folderCancel').catch(function () {});
  state.finished = true;
  actionEl.hidden = true;
  cancelEl.hidden = true;
  say(t('folderPage.cancelled'), 'warn');
  closeSoon();
}

async function refreshQueue() {
  const q = await sendBridge('folderQueue').catch(function () {
    return null;
  });
  if (q && q.ok) {
    state.count = q.count || 0;
    if (q.mode) state.mode = q.mode;
  }
  render();
}

function applyTheme(ui, dataSkin) {
  const root = document.documentElement;
  const scheme = resolveUiScheme(ui.scheme, matchMedia('(prefers-color-scheme: dark)').matches);
  root.lang = resolveLocale(ui.locale);
  root.dataset.skin = dataSkin || SKIN_AUTO_FALLBACK;
  root.dataset.scheme = scheme;
  root.style.colorScheme = scheme;
}

async function init() {
  const stored = await loadStored().catch(function () {
    return null;
  });
  const ui = (stored && stored.settings && stored.settings.ui) || {};
  t = createTranslator(resolveLocale(ui.locale));
  const dataSkin = await resolveUiDataSkinForFolder(ui);
  applyTheme(ui, dataSkin);
  document.title = t('folderPage.title');
  titleEl.textContent = t('folderPage.title');
  hintEl.textContent = t('folderPage.hint');
  document.body.classList.add('is-ready');

  const tab = await chrome.tabs.getCurrent().catch(function () {
    return null;
  });
  state.tabId = tab ? tab.id : null;

  if (!fsSupported()) {
    hintEl.hidden = true;
    say(t('saveFolder.unsupported'), 'warn');
    await sendBridge('folderCancel').catch(function () {});
    return;
  }

  state.existing = await loadHandle().catch(function () {
    return null;
  });
  actionEl.onclick = onAction;
  cancelEl.textContent = t('folderPage.cancel');
  cancelEl.onclick = onCancel;
  chrome.runtime.onMessage.addListener(function (msg) {
    if (!msg || msg.type !== 'ce-folder-queue' || msg.tabId !== state.tabId) return;
    state.count = msg.count || 0;
    if (msg.mode) state.mode = msg.mode;
    render();
  });
  await refreshQueue();
  actionEl.focus();
}

init();
