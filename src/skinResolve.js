import { toolbarKindFromUrl, toolbarKindToSkinId } from './hostSkin.js';
import { UI_SKINS } from './settings.js';

export const SKIN_AUTO_FALLBACK = 'chatgpt';

export function resolvedSkinFromUrl(url) {
  const kind = toolbarKindFromUrl(url);
  const mapped = toolbarKindToSkinId(kind);
  const skin = mapped || SKIN_AUTO_FALLBACK;
  if (UI_SKINS.indexOf(skin) >= 0) return skin;
  return SKIN_AUTO_FALLBACK;
}

export function dataSkinFromSettingAndUrl(uiSkin, url) {
  if (uiSkin === 'auto') return resolvedSkinFromUrl(url);
  if (UI_SKINS.indexOf(uiSkin) >= 0) return uiSkin;
  return SKIN_AUTO_FALLBACK;
}

function tabUrl(tab) {
  return tab && typeof tab.url === 'string' ? tab.url : '';
}

function queryActiveTabUrlFromNormalWindow() {
  return new Promise(function (resolve) {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, function (win) {
      void chrome.runtime.lastError;
      const query =
        win && win.id != null
          ? { active: true, windowId: win.id }
          : { active: true, lastFocusedWindow: true };
      chrome.tabs.query(query, function (tabs) {
        void chrome.runtime.lastError;
        resolve(tabUrl(tabs && tabs[0]));
      });
    });
  });
}

export function queryActiveTabUrlForPopup() {
  return queryActiveTabUrlFromNormalWindow();
}

export function queryActiveTabUrlForFolder() {
  return queryActiveTabUrlFromNormalWindow();
}

export async function resolveUiDataSkinForPopup(ui) {
  const setting = (ui && ui.skin) || 'auto';
  if (setting !== 'auto') return dataSkinFromSettingAndUrl(setting, '');
  const url = await queryActiveTabUrlForPopup();
  return resolvedSkinFromUrl(url);
}

export async function resolveUiDataSkinForFolder(ui) {
  const setting = (ui && ui.skin) || 'auto';
  if (setting !== 'auto') return dataSkinFromSettingAndUrl(setting, '');
  const url = await queryActiveTabUrlForFolder();
  return resolvedSkinFromUrl(url);
}
