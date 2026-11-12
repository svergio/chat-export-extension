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
}
