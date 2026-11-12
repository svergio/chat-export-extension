// WS client URL: ws://127.0.0.1:${port}/ws — path fixed in src/settings.js (WS_PATH). Coordinate with server hub.
import {
  startBridge,
  testConnection,
  getRuntimeState,
  commitSavedSettings,
  ensureLocalKey,
  rotateLocalKey,
  reconnectBridge
} from './bridge.js';
import { getBridgeStatus, loadStored, saveSettings, normalizeSettings, hasTosConsent, hasFaqConsent } from '../settings.js';
import { toolbarKindFromUrl } from '../hostSkin.js';
import { registerSaveHandlers } from './save.js';

registerSaveHandlers();

function bytesToBase64(bytes) {
  var chunk = 0x8000;
  var parts = [];
  for (var i = 0; i < bytes.length; i += chunk) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
  }
  return btoa(parts.join(''));
}

function iconKindFromUrl(url) {
  return toolbarKindFromUrl(url);
}

function iconPaths(kind) {
  var k = kind || 'idle';
  return {
    16: 'icons/toolbar-' + k + '-16.png',
    48: 'icons/toolbar-' + k + '-48.png',
    128: 'icons/toolbar-' + k + '-128.png'
  };
}

function setTabIcon(tabId, url) {
  if (tabId == null) return;
  var kind = iconKindFromUrl(url);
  chrome.action.setIcon({ tabId: tabId, path: iconPaths(kind) }, function () {
    void chrome.runtime.lastError;
  });
}

function refreshTab(tabId) {
  if (tabId == null) return;
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) return;
    setTabIcon(tab.id, tab.url);
  });
}

chrome.tabs.onActivated.addListener(function (info) {
  refreshTab(info.tabId);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url || changeInfo.status === 'complete') {
    setTabIcon(tabId, (tab && tab.url) || changeInfo.url);
  }
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.tabs.query({}, function (tabs) {
    if (!tabs) return;
    for (var i = 0; i < tabs.length; i++) {
      setTabIcon(tabs[i].id, tabs[i].url);
    }
  });
});

chrome.runtime.onStartup.addListener(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs[0]) setTabIcon(tabs[0].id, tabs[0].url);
  });
});

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'chat-export-download') {
    var b64 = msg.b64;
    if (!b64 && (msg.buffer || msg.bytes)) {
      var raw = msg.buffer || msg.bytes;
      var bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
      if (bytes.length) b64 = bytesToBase64(bytes);
    }
    if (!b64) {
      sendResponse({ ok: false, error: 'empty' });
      return;
    }
    var mime = String(msg.mime || 'application/octet-stream').split(';')[0].trim() || 'application/octet-stream';
    var name = String(msg.filename || 'chat').replace(/\\/g, '/').replace(/^\/+/, '');
    var url = 'data:' + mime + ';base64,' + b64;
    chrome.downloads.download(
      {
        url: url,
        filename: name,
        saveAs: false,
        conflictAction: 'uniquify'
      },
      function (id) {
        var err = chrome.runtime.lastError;
        if (err || !id) {
          sendResponse({ ok: false, error: err ? err.message : 'download failed' });
          return;
        }
        sendResponse({ ok: true, id: id });
      }
    );
    return true;
  }

  if (msg.type !== 'ce-bridge') return;

  var action = msg.action;
  if (action === 'getState') {
    Promise.all([loadStored(), getBridgeStatus()]).then(function (pair) {
      sendResponse({
        ok: true,
        browserId: pair[0].browserId,
        settings: pair[0].settings,
        status: pair[1],
        runtime: getRuntimeState()
      });
    });
    return true;
  }
  if (action === 'saveSettings') {
    var next = normalizeSettings(msg.settings);
    if (next.serverOn && (!hasTosConsent(next) || !hasFaqConsent(next))) next.serverOn = false;
    saveSettings(next).then(function (saved) {
      commitSavedSettings(saved);
      sendResponse({ ok: true, settings: saved });
    });
    return true;
  }
  if (action === 'testConnection') {
    testConnection().then(function (result) {
      sendResponse(result);
    });
    return true;
  }
  if (action === 'reconnect') {
    reconnectBridge().then(function (result) {
      sendResponse(result);
    });
    return true;
  }
  if (action === 'ensureKey') {
    ensureLocalKey().then(function (result) {
      sendResponse({ ok: true, settings: result.settings, browserId: result.browserId, created: result.created });
    });
    return true;
  }
  if (action === 'rotateKey') {
    rotateLocalKey().then(function (result) {
      sendResponse(result);
    });
    return true;
  }
});

startBridge();
