import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(repoRoot, 'fixtures/dom/zai-export-fidelity.html'), 'utf8');

const BRANCH_IDS = {
  u1: 'u1',
  a1: 'aaaa1111-bbbb-cccc-dddd-eeeeeeeeeeee',
  u2: 'u2',
  a2: 'ffff2222-bbbb-cccc-dddd-eeeeeeeeeeee',
  u3: 'u3',
  a3: '33333333-bbbb-cccc-dddd-eeeeeeeeeeee',
  u4: 'u4',
  a4: '44444444-bbbb-cccc-dddd-eeeeeeeeeeee',
  u5: 'u5',
  a5: '55555555-bbbb-cccc-dddd-eeeeeeeeeeee'
};

function apiPayload() {
  const messages = {};
  const chain = [
    [BRANCH_IDS.u1, 'user', '', null],
    [BRANCH_IDS.a1, 'assistant', '', BRANCH_IDS.u1],
    [BRANCH_IDS.u2, 'user', '', BRANCH_IDS.a1],
    [BRANCH_IDS.a2, 'assistant', '', BRANCH_IDS.u2],
    [BRANCH_IDS.u3, 'user', '', BRANCH_IDS.a2],
    [BRANCH_IDS.a3, 'assistant', '', BRANCH_IDS.u3],
    [BRANCH_IDS.u4, 'user', '', BRANCH_IDS.a3],
    [BRANCH_IDS.a4, 'assistant', '', BRANCH_IDS.u4],
    [BRANCH_IDS.u5, 'user', '', BRANCH_IDS.a4],
    [BRANCH_IDS.a5, 'assistant', '', BRANCH_IDS.u5]
  ];
  // Only oldest user has API content; rest empty (live Z.ai shape).
  for (const [id, role, content, parentId] of chain) {
    messages[id] = {
      id,
      role,
      content,
      parentId: parentId || '',
      childrenIds: []
    };
  }
  return {
    title: 'Exact Reply: ok',
    chat: {
      models: ['glm-5.2'],
      history: {
        currentId: BRANCH_IDS.a5,
        messages
      }
    }
  };
}

function loadZai(win) {
  let spec = null;
  win.localStorage.setItem('token', 'test-zai-token');
  win.ChatExport = {
    definePlatform: (s) => {
      spec = s;
      win.ChatExport.platforms.zai = {
        id: 'zai',
        ops: s.ops || {},
        getData: () => s.exportData(),
        chatId: s.chatId
      };
    },
    platforms: {},
    Ops: {
      waitFor: async (fn) => {
        const v = typeof fn === 'function' ? fn() : null;
        if (v) return v;
        return true;
      },
      sleep: async () => {},
      softNavigate: () => {},
      clickEl: () => {},
      fillEditable: () => {},
      dispatchEnter: () => {},
      clampLimit: (n) => n || 20,
      matchQuery: () => true
    },
    RpcError: class RpcError extends Error {
      constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
      }
    },
    modelFenceTag: (m, fb) => (m ? `zai-${m}` : fb || 'zai'),
    collectLinks: () => [],
    htmlToMarkdown: (el) => (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim(),
    isPlatformEnabled: () => true
  };
  const payload = apiPayload();
  win.fetch = async (url) => {
    if (String(url).includes('/api/v1/chats/')) {
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload)
      };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  win.eval(readFileSync(join(repoRoot, 'content/zai.js'), 'utf8'));
  return { spec, platform: win.ChatExport.platforms.zai };
}

test('zai export backfills empty user content from ordered .user-message DOM', async () => {
  const win = new Window({
    url: 'https://chat.z.ai/c/e202d64d-fa72-45e8-8bdd-d6c4dff7b847'
  });
  win.document.write(html);
  const { platform } = loadZai(win);
  assert.ok(platform && typeof platform.getData === 'function');
  const data = await platform.getData();
  assert.ok(data && Array.isArray(data.messages));
  const roles = data.messages.map((m) => m.role);
  const users = data.messages.filter((m) => m.role === 'user');
  const asst = data.messages.filter((m) => m.role === 'assistant');
  assert.ok(users.length >= 5, `expected >=5 users, got ${users.length}: ${JSON.stringify(roles)}`);
  assert.ok(asst.length >= 5, `expected >=5 assistants, got ${asst.length}`);
  assert.ok(users.some((m) => /user-one|questions/i.test(m.text)));
  assert.ok(users.some((m) => /user-five|steps/i.test(m.text)));
  assert.ok(!data.messages.every((m) => m.role === 'assistant'));
});
