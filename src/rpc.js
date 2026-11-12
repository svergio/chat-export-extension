const RPC_TYPE = 'chat-export-rpc';
const PING_TYPE = 'chat-export-ping';

const ERROR_CODES = [
  'PLATFORM_DISABLED',
  'NOT_BOUND',
  'CONFIRM_REQUIRED',
  'DESTRUCTIVE_DISABLED',
  'UNAUTHORIZED',
  'TIMEOUT',
  'HOST_ERROR',
  'NOT_FOUND',
  'BAD_REQUEST',
  'OPTION_NOT_FOUND',
  'OPTION_LOCKED',
  'ATTACH_UNSUPPORTED',
  'FILE_NOT_ALLOWED',
  'FILE_TOO_LARGE',
  'ATTACH_TIMEOUT',
  'INVALID_ARGS',
  'PLATFORM_BUSY',
  'RATE_LIMIT'
];

const RETRYABLE_CODES = ['PLATFORM_BUSY', 'RATE_LIMIT'];

const OP_HOOK = {
  'chats.list': 'list',
  'chats.get': 'get',
  'chats.export': null,
  'chats.create': 'create',
  'chats.delete': 'delete',
  'chats.send': 'send',
  'platform.capabilities': 'capabilities',
  'containers.list': 'containers',
  'containers.chats': 'containerChats',
  'containers.create': 'containerCreate',
  'containers.delete': 'containerDelete',
  'containers.move_chat': 'containerMoveChat',
  'chats.ask_selection': 'askSelection',
  'chats.side_ask': 'sideAsk',
  'platform.host_state': 'hostState'
};

export class RpcError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    if (details) this.details = details;
  }
}

function ok(id, data) {
  return { id: id, ok: true, data: data };
}

function fail(id, code, message, details) {
  const error = { code: code, message: String(message || code) };
  if (RETRYABLE_CODES.indexOf(code) >= 0) details = Object.assign({}, details, { retryable: true });
  if (details && typeof details === 'object') error.details = details;
  return { id: id, ok: false, error: error };
}

function bytesToB64(bytes) {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

function toProtocolFile(f) {
  const file = { name: f.filename, mime: f.mime };
  if (typeof f.data === 'string') file.text = f.data;
  else file.b64 = bytesToB64(f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data));
  return file;
}

function normalizePayload(platform, raw) {
  const p = raw || {};
  const out = {
    platform: platform,
    url: p.url || location.href,
    title: p.title || 'chat',
    chatId: p.chatId || '',
    model: p.model || '',
    userName: p.userName || '',
    userHandle: p.userHandle || '',
    userEmail: p.userEmail || '',
    messages: Array.isArray(p.messages) ? p.messages : []
  };
  if (p.branch === 'all' || p.branch === 'active') out.branch = p.branch;
  return out;
}

function loadPayload(entry, args, ctx) {
  const chatId = (args && args.chatId) || '';
  const branch = args && args.branch ? String(args.branch) : 'active';
  if (entry.ops.get) return Promise.resolve(entry.ops.get({ chatId: chatId, branch: branch }, ctx));
  if (!chatId || chatId === entry.chatId()) return entry.getData();
  throw new RpcError('HOST_ERROR', 'not implemented');
}

function exportChat(CE, entry, args, ctx) {
  const formats = Array.isArray(args.formats) ? args.formats : [];
  if (!formats.length) throw new RpcError('BAD_REQUEST', 'formats must be a non-empty array');
  return Promise.resolve(loadPayload(entry, args, ctx)).then(function (raw) {
    const payload = normalizePayload(entry.id, raw);
    const settings = typeof CE.getPlatformSettings === 'function' ? CE.getPlatformSettings() : null;
    const exportSchemas = (args && args.exportSchemas) || (settings && settings.exportSchemas) || null;
    const schema = args && args.schema ? String(args.schema) : '';
    return CE.buildExportBundle(
      Object.assign({}, payload, {
        formats: formats,
        exportSchemas: exportSchemas,
        schema: schema || undefined
      })
    ).then(function (bundle) {
      return { files: bundle.files.map(toProtocolFile), payload: payload };
    });
  });
}

function runOp(CE, entry, op, args) {
  const ctx = { platform: entry.id, getData: entry.getData, chatId: entry.chatId, CE: CE };
  if (op === 'chats.export') return exportChat(CE, entry, args, ctx);
  if (op === 'chats.get') {
    return Promise.resolve(loadPayload(entry, args, ctx)).then(function (raw) {
      return normalizePayload(entry.id, raw);
    });
  }
  const hook = entry.ops[OP_HOOK[op]];
  if (!hook) {
    if (op === 'containers.list' || op === 'containers.chats') {
      return { items: [], nextCursor: null };
    }
    if (op === 'containers.create' || op === 'containers.delete' || op === 'containers.move_chat') {
      throw new RpcError('HOST_ERROR', 'not implemented');
    }
    if (op === 'chats.side_ask') {
      throw new RpcError('HOST_ERROR', 'side chat is only supported on grok');
    }
    throw new RpcError('HOST_ERROR', 'not implemented');
  }
  return hook(args, ctx);
}

export function dispatchRpc(msg) {
  const CE = window.ChatExport;
  const id = String((msg && msg.id) || '');
  const op = msg && msg.op;
  const platform = msg && msg.platform;
  const args = (msg && msg.args) || {};
  if (!Object.prototype.hasOwnProperty.call(OP_HOOK, op)) {
    return Promise.resolve(fail(id, 'BAD_REQUEST', 'unknown op: ' + op));
  }
  if (CE && typeof CE.isPlatformEnabled === 'function' && !CE.isPlatformEnabled(platform)) {
    return Promise.resolve(fail(id, 'PLATFORM_DISABLED', 'platform ' + platform + ' is disabled'));
  }
  const entry = CE && CE.platforms[platform];
  if (!entry) {
    return Promise.resolve(fail(id, 'NOT_FOUND', 'platform ' + platform + ' is not loaded in this tab'));
  }
  return Promise.resolve()
    .then(function () {
      return runOp(CE, entry, op, args);
    })
    .then(
      function (data) {
        return ok(id, data);
      },
      function (err) {
        const code = err && ERROR_CODES.indexOf(err.code) >= 0 ? err.code : 'HOST_ERROR';
        return fail(id, code, (err && err.message) || err, err && err.details);
      }
    );
}

export function installRpcListener() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;
  // The isolated world (and its window globals) survives an extension reload, so a plain
  // "installed" flag would block the fresh listener forever. Newest injection wins instead.
  const gen = (Number(window.__chatExportRpcGen) || 0) + 1;
  window.__chatExportRpcGen = gen;
  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || window.__chatExportRpcGen !== gen) return false;
    if (msg.type === PING_TYPE) {
      const CE = window.ChatExport;
      sendResponse({ ok: true, platforms: CE && CE.platforms ? Object.keys(CE.platforms) : [] });
      return false;
    }
    if (msg.type !== RPC_TYPE) return false;
    dispatchRpc(msg).then(sendResponse);
    return true;
  });
}
