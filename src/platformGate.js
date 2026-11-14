import { STORAGE_KEYS, normalizeSettings, isPlatformEnabledIn, DEFAULT_SETTINGS } from './settings.js';

let cache = normalizeSettings(DEFAULT_SETTINGS);
let listeners = [];

export function isPlatformEnabled(id) {
  return isPlatformEnabledIn(cache, id);
}

export function getPlatformSettings() {
  return cache;
}

export function onPlatformSettings(fn) {
  if (typeof fn === 'function') listeners.push(fn);
  return function () {
    listeners = listeners.filter(function (x) {
      return x !== fn;
    });
  };
}

function emit() {
  for (let i = 0; i < listeners.length; i++) listeners[i](cache);
}

function applyRaw(raw) {
  cache = normalizeSettings(raw || DEFAULT_SETTINGS);
  emit();
}

function storageAlive() {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local);
  } catch (e) {
    return false;
  }
}

export function installPlatformGate() {
  if (!storageAlive()) {
    applyRaw(DEFAULT_SETTINGS);
    return;
  }
  try {
    chrome.storage.local.get([STORAGE_KEYS.settings], function (got) {
      if (!storageAlive()) return;
      applyRaw(got && got[STORAGE_KEYS.settings]);
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (!storageAlive()) return;
      if (area !== 'local') return;
      if (!changes[STORAGE_KEYS.settings]) return;
      applyRaw(changes[STORAGE_KEYS.settings].newValue);
    });
  } catch (e) {
    applyRaw(DEFAULT_SETTINGS);
  }
}
