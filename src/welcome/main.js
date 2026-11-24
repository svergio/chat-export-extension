import { loadStored, resolveUiScheme } from '../settings.js';
import { resolveUiDataSkinForFolder, SKIN_AUTO_FALLBACK } from '../skinResolve.js';
import { createTranslator, resolveLocale } from '../i18n/index.js';
import { loadHandle, saveHandle, fsSupported } from '../folder/store.js';

const titleEl = document.getElementById('title');
const leadEl = document.getElementById('lead');
const folderTitleEl = document.getElementById('folderTitle');
const folderHintEl = document.getElementById('folderHint');
const folderNoteEl = document.getElementById('folderNote');
const queueNoteEl = document.getElementById('queueNote');
const pickEl = document.getElementById('pick');
const msgEl = document.getElementById('msg');
const rateTitleEl = document.getElementById('rateTitle');
const rateNoteEl = document.getElementById('rateNote');
const rateLinkEl = document.getElementById('rateLink');
const helpTitleEl = document.getElementById('helpTitle');
const helpNoteEl = document.getElementById('helpNote');
const discordLinkEl = document.getElementById('discordLink');
const linksTitleEl = document.getElementById('linksTitle');
const githubLinkEl = document.getElementById('githubLink');
const issuesLinkEl = document.getElementById('issuesLink');
const donateLinkEl = document.getElementById('donateLink');
const noteEl = document.getElementById('note');
const doneEl = document.getElementById('done');

let t = createTranslator(resolveLocale('auto'));
let busy = false;

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

function applyTheme(ui, dataSkin) {
  const root = document.documentElement;
  const scheme = resolveUiScheme(ui.scheme, matchMedia('(prefers-color-scheme: dark)').matches);
  root.lang = resolveLocale(ui.locale);
  root.dataset.skin = dataSkin || SKIN_AUTO_FALLBACK;
  root.dataset.scheme = scheme;
  root.style.colorScheme = scheme;
}

const REASON_KEYS = {
  permission: 'onboarding.err.permission',
  'no-folder': 'onboarding.err.noFolder',
  unsupported: 'saveFolder.unsupported'
};

function reasonText(reason) {
  return t(REASON_KEYS[reason] || 'onboarding.err.write');
}

function errorReason(e) {
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'permission';
  if (n === 'NotFoundError') return 'no-folder';
  return 'error';
}

function pickedText(name, res) {
  let s = fill('onboarding.picked', { name: name });
  const n = (res && res.saved) || 0;
  if (n === 1) s += ' ' + fill('folderPage.saved', { name: name });
  else if (n > 1) s += ' ' + fill('folderPage.savedMany', { count: n, name: name });
  return s;
}

async function onPick() {
  if (busy) return;
  busy = true;
  pickEl.disabled = true;
  say('');
  try {
    const handle = await showDirectoryPicker({ mode: 'readwrite', id: 'chat-export', startIn: 'downloads' });
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new DOMException('permission ' + perm, 'NotAllowedError');
    await saveHandle(handle);
    // allQueued: drains exports queued from any provider tab — onboarding runs
    // in its own tab, so the sender tab id alone would miss them.
    const res = await sendBridge('folderPicked', { allQueued: true }).catch(function () {
      return { ok: false, reason: 'error' };
    });
    if (res && res.ok) {
      say(pickedText(handle.name, res), 'ok');
    } else {
      // The folder itself is saved; only some queued exports did not make it.
      const left = (res && res.pending) || 0;
      let s = pickedText(handle.name, res);
      if (left) s += ' ' + fill('onboarding.saveFailed', { count: left, reason: reasonText(res && res.reason) });
      else s += ' ' + reasonText(res && res.reason);
      say(s, 'warn');
    }
  } catch (e) {
    if (e && e.name === 'AbortError') say(t('folderPage.notPicked'), 'warn');
    else say(reasonText(errorReason(e)), 'danger');
  } finally {
    busy = false;
    pickEl.disabled = false;
  }
}

function onClose() {
  chrome.tabs
    .getCurrent()
    .then(function (tab) {
      if (tab) chrome.tabs.remove(tab.id);
      else window.close();
    })
    .catch(function () {
      window.close();
    });
}

async function init() {
  const stored = await loadStored().catch(function () {
    return null;
  });
  const ui = (stored && stored.settings && stored.settings.ui) || {};
  t = createTranslator(resolveLocale(ui.locale));
  const dataSkin = await resolveUiDataSkinForFolder(ui).catch(function () {
    return null;
  });
  applyTheme(ui, dataSkin);

  document.title = t('onboarding.docTitle');
  titleEl.textContent = t('onboarding.title');
  leadEl.textContent = t('onboarding.lead');
  folderTitleEl.textContent = t('onboarding.stepFolder');
  folderHintEl.textContent = t('folderPage.hint');
  folderNoteEl.textContent = t('onboarding.folderNote');
  queueNoteEl.textContent = t('onboarding.queueNote');
  pickEl.textContent = t('folderPage.pick');
  rateTitleEl.textContent = t('onboarding.stepRate');
  rateNoteEl.textContent = t('onboarding.rateNote');
  rateLinkEl.textContent = t('onboarding.rateCta');
  helpTitleEl.textContent = t('onboarding.stepHelp');
  helpNoteEl.textContent = t('onboarding.helpNote');
  discordLinkEl.textContent = t('onboarding.helpCta');
  linksTitleEl.textContent = t('onboarding.linksTitle');
  githubLinkEl.textContent = t('onboarding.github');
  issuesLinkEl.textContent = t('onboarding.issues');
  donateLinkEl.textContent = t('onboarding.donate');
  noteEl.textContent = t('onboarding.note');
  doneEl.textContent = t('onboarding.done');
  doneEl.onclick = onClose;
  pickEl.onclick = onPick;

  if (!fsSupported()) {
    pickEl.disabled = true;
    say(t('saveFolder.unsupported'), 'warn');
    return;
  }
  const existing = await loadHandle().catch(function () {
    return null;
  });
  if (existing) {
    say(t('label.saveFolder') + ': ' + existing.name, 'ok');
    return;
  }
  const q = await sendBridge('folderQueue').catch(function () {
    return null;
  });
  const n = (q && q.ok && q.count) || 0;
  if (n === 1) say(t('folderPage.pending'), 'warn');
  else if (n > 1) say(fill('folderPage.pendingMany', { count: n }), 'warn');
}

// Never leave the page blank: the body is hidden until is-ready.
init()
  .catch(function () {})
  .finally(function () {
    document.body.classList.add('is-ready');
  });
