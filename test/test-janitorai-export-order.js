import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(
  readFileSync(join(repoRoot, 'fixtures/api/janitorai-chat-get.json'), 'utf8')
);

function loadJanitorPlatform(win) {
  let spec = null;
  win.ChatExport = {
    definePlatform: (s) => {
      spec = s;
      win.ChatExport.platforms.janitorai = {
        id: 'janitorai',
        ops: s.ops || {},
        getData: () => (typeof s.exportData === 'function' ? s.exportData() : null),
        chatId: s.chatId
      };
    },
    platforms: {},
    Ops: {
      waitFor: async (fn) => {
        const v = fn();
        if (v) return v;
        throw new Error('wait');
      },
      sleep: async () => {},
      softNavigate: () => {},
      matchQuery: () => true,
      clampLimit: (n) => n || 20,
      toIso: (x) => x || null
    },
    RpcError: class RpcError extends Error {
      constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
      }
    },
    BAR_ATTR: 'data-chat-export-bar',
    modelFenceTag: (_m, fb) => fb || 'janitorai',
    collectLinks: () => [],
    htmlToMarkdown: (el) => (el && (el.innerText || el.textContent) || '').trim(),
    getPlatformSettings: () => ({}),
    isPlatformEnabled: () => true
  };
  win.fetch = async (url) => {
    const path = String(url || '');
    if (/\/hampter\/chats\/\d+/.test(path)) {
      return {
        ok: true,
        status: 200,
        json: async () => fixture,
        text: async () => JSON.stringify(fixture)
      };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  // Fake auth cookie so requireToken passes.
  Object.defineProperty(win.document, 'cookie', {
    configurable: true,
    get: () =>
      'sb-auth-auth-token=' +
      encodeURIComponent(JSON.stringify({ access_token: 'test-token-for-order' }))
  });
  win.eval(readFileSync(join(repoRoot, 'content/janitorai.js'), 'utf8'));
  return { spec, platform: win.ChatExport.platforms.janitorai };
}

test('janitorai export orders chatMessages oldest-first', async () => {
  const win = new Window({ url: 'https://janitorai.com/ru/chats/2479896085' });
  win.document.write('<!doctype html><html><body></body></html>');
  const { platform } = loadJanitorPlatform(win);
  assert.ok(platform && platform.ops && typeof platform.ops.get === 'function');
  const payload = await platform.ops.get({ chatId: '2479896085' }, {
    platform: 'janitorai',
    getData: platform.getData,
    chatId: platform.chatId,
    CE: win.ChatExport
  });
  assert.ok(payload && Array.isArray(payload.messages));
  assert.equal(payload.messages.length, 3);
  assert.equal(
    payload.messages.map((m) => String(m.text)).join('|'),
    'msg-first-greeting|msg-mid-user|msg-last-assistant'
  );
  assert.equal(payload.messages.map((m) => m.role).join('|'), 'assistant|user|assistant');
});

test('janitorai newest-first without timestamps still reverses', async () => {
  const win = new Window({ url: 'https://janitorai.com/ru/chats/1' });
  win.document.write('<!doctype html><html><body></body></html>');
  const noTs = {
    chat: { title: 'NoTs' },
    character: { name: 'Bot' },
    chatMessages: [
      { is_bot: true, message: 'newest' },
      { is_bot: false, message: 'older-user' },
      { is_bot: true, message: 'oldest' }
    ]
  };
  let spec = null;
  win.ChatExport = {
    definePlatform: (s) => {
      spec = s;
      win.ChatExport.platforms.janitorai = {
        id: 'janitorai',
        ops: s.ops || {},
        getData: () => s.exportData(),
        chatId: s.chatId
      };
    },
    platforms: {},
    Ops: {},
    RpcError: class RpcError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
      }
    },
    modelFenceTag: (_m, fb) => fb,
    collectLinks: () => [],
    htmlToMarkdown: (el) => (el.innerText || '').trim(),
    isPlatformEnabled: () => true
  };
  win.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => noTs,
    text: async () => JSON.stringify(noTs)
  });
  Object.defineProperty(win.document, 'cookie', {
    configurable: true,
    get: () =>
      'sb-auth-auth-token=' +
      encodeURIComponent(JSON.stringify({ access_token: 'test-token-for-order' }))
  });
  win.eval(readFileSync(join(repoRoot, 'content/janitorai.js'), 'utf8'));
  const payload = await win.ChatExport.platforms.janitorai.ops.get({ chatId: '1' }, {
    CE: win.ChatExport
  });
  assert.equal(
    payload.messages.map((m) => String(m.text)).join('|'),
    'oldest|older-user|newest'
  );
  assert.ok(spec);
});
