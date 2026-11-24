// Provider export parsers against synthetic API fixtures (test/fixtures/providers):
// active branch only, pagination, attachments, warnings and API-only behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fx = (n) => JSON.parse(readFileSync(join(root, 'test/fixtures/providers', n), 'utf8'));
const noop = () => {};

class RpcError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function load(file, url, fetchImpl, opts = {}) {
  const win = new Window({ url });
  win.document.write('<!doctype html><html><body>' + (opts.html || '') + '</body></html>');
  let spec = null;
  const Ops = new Proxy(
    { sleep: async () => {}, toIso: (x) => x || null, normalizeId: (s) => String(s || '').toLowerCase() },
    { get: (t, k) => (k in t ? t[k] : noop) }
  );
  const base = {
    definePlatform: (s) => {
      spec = s;
    },
    Ops,
    platforms: {},
    RpcError,
    modelFenceTag: (_m, fb) => fb,
    dedupeSources: (a) => a || [],
    BAR_ATTR: 'data-chat-export-bar',
    isPlatformEnabled: () => true,
    getPlatformSettings: () => ({})
  };
  win.ChatExport = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop) });
  const calls = [];
  win.fetch = async (u, o = {}) => {
    calls.push({ url: String(u), opts: o });
    const body = await fetchImpl(String(u), o);
    const status = body && body.__status ? body.__status : body ? 200 : 404;
    return { ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
  };
  if (opts.cookie) Object.defineProperty(win.document, 'cookie', { configurable: true, get: () => opts.cookie });
  win.eval(readFileSync(join(root, 'content', file), 'utf8'));
  return { spec, calls, win };
}

const plain = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const texts = (d) => plain(d.messages.map((m) => m.text));

test('chatgpt: active branch only, python code + output kept, internal tool calls dropped', async () => {
  const conv = fx('chatgpt-conversation.json');
  const { spec } = load('chatgpt.js', 'https://chatgpt.com/c/68aa0000-1111-2222-3333-444455556666', async (u) => {
    if (u.includes('/api/auth/session')) return { accessToken: 't', user: { name: 'E' } };
    if (u.includes('/backend-api/conversation/')) return conv;
  });
  const d = await spec.exportData();
  const t = texts(d);
  assert.equal(t[0], 'q0');
  assert.equal(t.at(-1), 'LAST');
  assert.ok(!t.includes('OLD-REGEN'), 'inactive regeneration excluded');
  assert.ok(t.some((x) => x.includes('```python\nprint(6*7)\n```')), 'python code block exported');
  assert.ok(t.some((x) => x.startsWith('Output:') && x.includes('42')), 'execution output exported');
  assert.ok(!t.some((x) => x.includes('search("weather")')), 'web tool call stays internal');
  assert.equal(d.messages.length, 200 + 4);
  assert.deepEqual(plain(d.warnings), []);
});

test('chatgpt: a cyclic mapping terminates', async () => {
  const conv = { current_node: 'a', mapping: { a: { id: 'a', parent: 'b', message: { author: { role: 'assistant' }, content: { parts: ['A'] } } }, b: { id: 'b', parent: 'a', message: { author: { role: 'user' }, content: { parts: ['B'] } } } } };
  const { spec } = load('chatgpt.js', 'https://chatgpt.com/c/68aa0000-1111-2222-3333-444455556666', async (u) => (u.includes('session') ? { accessToken: 't' } : conv));
  const d = await spec.exportData();
  assert.deepEqual(texts(d), ['B', 'A']);
});

test('claude: attachments (pasted text) and file names are exported; other branch is not', async () => {
  const conv = fx('claude-conversation.json');
  const { spec } = load('claude.js', 'https://claude.ai/chat/11111111-2222-3333-4444-555555555555', async (u) => {
    if (u === '/api/organizations') return [{ uuid: 'org1', capabilities: ['chat'] }];
    if (u.includes('/chat_conversations/')) return conv;
    return {};
  });
  const d = await spec.exportData();
  assert.equal(d.messages.length, 120);
  assert.match(d.messages[0].text, /^q0\n\n\[Attachment: paste\.txt\]\n\n```\nPASTED-LONG-TEXT\n```$/);
  assert.match(d.messages[2].text, /\[File: img\.png\]/);
  assert.ok(!texts(d).includes('OTHER-BRANCH'));
});

test('claude: chat in a second organization is found after a 404 in the first', async () => {
  const conv = fx('claude-conversation.json');
  const { spec, calls } = load('claude.js', 'https://claude.ai/chat/11111111-2222-3333-4444-555555555555', async (u) => {
    if (u === '/api/organizations') return [{ uuid: 'orgA', capabilities: ['chat'] }, { uuid: 'orgB', capabilities: ['chat'] }];
    if (u.includes('/orgB/chat_conversations/')) return conv;
    if (u.includes('/chat_conversations/')) return { __status: 404 };
    return {};
  });
  const d = await spec.exportData();
  assert.ok(d && d.messages.length === 120);
  assert.ok(calls.some((c) => c.url.includes('/orgB/chat_conversations/')));
});

function grokFetch(fixture, drop) {
  return async (u, o) => {
    if (u.endsWith('/response-node')) return { responseNodes: fixture.responseNodes };
    if (u.endsWith('/load-responses')) {
      const ids = JSON.parse(o.body).responseIds;
      return { responses: ids.filter((i) => i !== drop).map((i) => fixture.responses[i]) };
    }
    if (/conversations\/[^/]+$/.test(u)) return { conversation: { title: 'G' } };
  };
}

test('grok: only the active branch (newest leaf up via parentResponseId), file names kept', async () => {
  const f = fx('grok-conversation.json');
  const { spec } = load('grok.js', 'https://grok.com/c/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', grokFetch(f));
  const d = await spec.exportData();
  const t = texts(d);
  assert.equal(t.length, 20);
  assert.ok(!t.some((x) => /OLD-/.test(x)), 'old edit branch and old regeneration excluded');
  assert.equal(t.at(-1), 'ans9');
  assert.equal(t[10], 'q5\n\n[File: notes.pdf]');
  assert.equal(d.warnings, undefined);
});

test('grok: a response missing from load-responses is counted as a warning', async () => {
  const f = fx('grok-conversation.json');
  const { spec } = load('grok.js', 'https://grok.com/c/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', grokFetch(f, 'a7'));
  const d = await spec.exportData();
  assert.equal(d.messages.length, 19);
  assert.deepEqual(plain(d.warnings), ['missing-responses:1']);
});

test('grok: project URL ?chat= is parsed; no chat id is never guessed from the sidebar', async () => {
  const f = fx('grok-conversation.json');
  const sidebar = '<a href="/c/99999999-0000-0000-0000-000000000000">other chat</a>';
  const p = load('grok.js', 'https://grok.com/project/12345678-aaaa?chat=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', grokFetch(f), { html: sidebar });
  const d = await p.spec.exportData();
  assert.equal(d.messages.length, 20);
  assert.ok(p.calls[0].url.includes('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'));
  const home = load('grok.js', 'https://grok.com/', grokFetch(f), { html: sidebar });
  assert.equal(await home.spec.exportData(), null);
  assert.equal(home.calls.length, 0, 'sidebar chat is not fetched');
});

test('grok-x: follows the items cursor across pages', async () => {
  const f = fx('grok-x-items.json');
  const { spec, calls } = load('grok-x.js', 'https://x.com/i/grok?conversation=123', async (u) => {
    if (u.includes('GrokConversationItemsByRestId')) {
      const vars = JSON.parse(decodeURIComponent(u.split('variables=')[1]));
      const page = vars.cursor === 'CURSOR-2' ? f.pages[1] : f.pages[0];
      return { data: { grok_conversation_items_by_rest_id: page } };
    }
    if (u.includes('/i/api/graphql/')) return { data: {} };
  }, { cookie: 'ct0=abc' });
  const d = await spec.exportData();
  assert.equal(d.messages.length, 60);
  assert.equal(d.messages[0].text, 'q0');
  assert.equal(d.messages.at(-1).text, 'ans29');
  assert.equal(calls.filter((c) => c.url.includes('ItemsByRestId')).length, 2);
});

test('copilot: active branch via parentMessageID, no-store fetch, references and images', async () => {
  const f = fx('copilot-messages.json');
  const { spec, calls } = load('copilot.js', 'https://github.com/copilot/c/12345678-aaaa-bbbb-cccc-1234567890ab', async (u) => {
    if (u.includes('/chat/token')) return { token: 't' };
    if (u.includes('/messages')) return f;
  });
  const d = await spec.exportData();
  const t = texts(d);
  assert.equal(t.length, 40);
  assert.ok(!t.some((x) => /OLD-/.test(x)), 'retry/edit siblings excluded');
  assert.match(t[0], /\[Attachment: ce-copilot-upload\.md\]\n\n```markdown\n# uploaded\n```/);
  assert.match(t[6], /\[Image attachment: pixel\.png\]/);
  const msgCall = calls.find((c) => c.url.includes('/messages'));
  assert.equal(msgCall.opts.cache, 'no-store');
});

test('perplexity: pages through threads longer than one 100-entry page', async () => {
  const all = fx('perplexity-thread.json');
  const { spec, calls } = load('perplexity.js', 'https://www.perplexity.ai/search/my-thread-abc', async (u) => {
    if (u.includes('/rest/thread/my-thread-abc')) {
      const q = new URL(u, 'https://x').searchParams;
      const lim = +q.get('limit');
      const off = +q.get('offset');
      return { thread_metadata: all.thread_metadata, entries: all.entries.slice(off, off + lim), has_next_page: off + lim < all.entries.length };
    }
  });
  const d = await spec.exportData();
  assert.equal(d.messages.length, 300);
  assert.equal(d.messages.at(-1).text, 'answer number 149');
  assert.equal(calls.filter((c) => c.url.includes('/rest/thread/')).length, 2);
  assert.deepEqual(plain(d.warnings), []);
});

const JAN_COOKIE = 'sb-auth-auth-token=' + encodeURIComponent(JSON.stringify({ access_token: 't' }));

test('janitorai: chat id without locale prefix; swipes keep committed or newest variant', async () => {
  const f = fx('janitorai-swipes.json');
  const { spec } = load('janitorai.js', 'https://janitorai.com/chats/42', async (u) => (/hampter\/chats\/42$/.test(u) ? f : undefined), { cookie: JAN_COOKIE });
  const d = await spec.exportData();
  assert.deepEqual(texts(d), ['greet', 'hi', 'swipe-B-committed', 'next', 'pending-2-newest']);
});

test('janitorai: API failure throws (apiOnly) instead of resolving to null', async () => {
  const { spec } = load('janitorai.js', 'https://janitorai.com/ru/chats/42', async () => ({ __status: 500 }), { cookie: JAN_COOKIE });
  await assert.rejects(spec.exportData(), (e) => e.details && e.details.apiOnly === true);
  const noId = load('janitorai.js', 'https://janitorai.com/characters/1', async () => ({}), { cookie: JAN_COOKIE });
  await assert.rejects(noId.spec.exportData(), (e) => e.details && e.details.apiOnly === true);
});
