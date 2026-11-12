import './core.js';
import { injectBar } from './ui/ExportBar.jsx';
import { definePlatform } from './definePlatform.js';
import { dispatchRpc, installRpcListener, RpcError } from './rpc.js';
import * as Ops from './ops/helpers.js';
import {
  installPlatformGate,
  isPlatformEnabled,
  onPlatformSettings,
  getPlatformSettings
} from './platformGate.js';
import { installSchemas } from './schemas/index.js';
import { createTranslator, resolveLocale } from './i18n/index.js';

var CE = window.ChatExport;
if (CE) {
  installSchemas(CE);
  CE.injectBar = injectBar;
  CE.definePlatform = definePlatform;
  CE.dispatchRpc = dispatchRpc;
  CE.RpcError = RpcError;
  CE.Ops = Ops;
  CE.isPlatformEnabled = isPlatformEnabled;
  CE.onPlatformSettings = onPlatformSettings;
  CE.getPlatformSettings = getPlatformSettings;
  installPlatformGate();
  installRpcListener();

  function syncToastLocale() {
    var settings = typeof CE.getPlatformSettings === 'function' ? CE.getPlatformSettings() : {};
    CE.setToastTranslator(createTranslator(resolveLocale(settings && settings.locale)));
  }
  syncToastLocale();
  if (typeof CE.onPlatformSettings === 'function') {
    CE.onPlatformSettings(syncToastLocale);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (msg) {
      if (!msg || msg.type !== 'ce-saved') return;
      var name = msg.name != null ? String(msg.name) : '';
      if (!name) return;
      var folder = msg.folder != null ? String(msg.folder) : '';
      CE.showToast(CE.toastText('toast.saved', { folder: folder, name: name }));
    });
  }
}
