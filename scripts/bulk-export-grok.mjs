import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const OUT_DIR = '/Users/svergio_mel/Desktop/NodeRed/Экспорты чатов';
const META_DIR = '/Users/svergio_mel/Desktop/NodeRed/chat-export-extension/scripts';
const STATE = path.join(META_DIR, '_grok_state.json');
const LIST = path.join(META_DIR, '_grok_chats.json');
const PREFER_URL = process.env.GROK_PAGE_MATCH || '';

function slugTitle(s) {
  return String(s || 'chat')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'chat';
}

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function mdFence(label, body) {
  const name = String(label || '').replace(/[`\r\n]+/g, ' ').trim();
  const text = String(body == null ? '' : body).replace(/^\n+/, '').replace(/\n+$/, '');
  const inner = name ? (text ? name + '\n' + text : name) : text;
  return '```md\n' + inner + '\n```';
}

function roleTag(sender, model) {
  if (sender === 'human' || sender === 'user') return 'user';
  const m = String(model || '').trim();
  if (!m) return 'grok';
  return 'grok-' + m.toLowerCase().replace(/[^a-z0-9+._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function buildMarkdown(meta, messages) {
  const parts = [];
  const sys = [];
  for (const k of ['platform', 'url', 'title', 'exported', 'chat_id', 'model', 'user_email']) {
    if (meta[k]) sys.push(k + ': ' + meta[k]);
  }
  parts.push(mdFence('sys', sys.join('\n')));
  parts.push('');
  for (const msg of messages) {
    parts.push(mdFence((msg.roleTag || msg.role) + ':', ''));
    parts.push('');
    parts.push(String(msg.text || '').trim());
    parts.push('');
    if (msg.sources && msg.sources.length) {
      const lines = msg.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`);
      parts.push(mdFence('sources', lines.join('\n')));
      parts.push('');
    }
  }
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n';
}

function dedupeSources(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    const url = it && it.url;
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    if (/grok\.com|cookielaw|onetrust|gstatic|googleapis/i.test(url)) continue;
    seen.add(url);
    out.push({ title: (it.title || url).replace(/\s+/g, ' ').trim() || url, url });
  }
  return out;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return { done: {}, failed: {} };
  }
}

function saveState(st) {
  fs.writeFileSync(STATE, JSON.stringify(st, null, 2));
}

function browserWsEndpoint() {
  const p = fs
    .readFileSync('/Users/svergio_mel/Library/Application Support/Google/Chrome/DevToolsActivePort', 'utf8')
    .trim()
    .split(/\r?\n/);
  if (p.length < 2) throw new Error('DevToolsActivePort invalid');
  return `ws://127.0.0.1:${p[0]}${p[1]}`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(META_DIR, { recursive: true });
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserWsEndpoint(),
    defaultViewport: null
  });
  const pages = await browser.pages();
  let page =
    (PREFER_URL && pages.find((p) => p.url().includes(PREFER_URL))) ||
    pages.find((p) => /grok\.com\/c\//.test(p.url())) ||
    pages.find((p) => /grok\.com/.test(p.url())) ||
    pages[0];
  if (!/grok\.com/.test(page.url())) {
    page = await browser.newPage();
    await page.goto('https://grok.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  console.log('page', page.url());

  const account = await page.evaluate(async () => {
    const s = await fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .catch(() => null);
    return {
      email: (s && s.session && s.session.email) || '',
      userId: (s && s.session && s.session.userId) || ''
    };
  });
  console.log('account', account.email || account.userId || 'unknown');

  const chats = await page.evaluate(async () => {
    async function fetchPage(pageToken) {
      const u = new URL('https://grok.com/rest/app-chat/conversations');
      u.searchParams.set('pageSize', '60');
      u.searchParams.set('excludeProjects', 'true');
      if (pageToken) u.searchParams.set('pageToken', pageToken);
      const res = await fetch(u.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('list ' + res.status);
      return res.json();
    }
    const all = [];
    let token = '';
    for (let i = 0; i < 40; i++) {
      const data = await fetchPage(token || undefined);
      const list = data.conversations || [];
      for (const c of list) {
        if (c.conversationId) {
          all.push({
            id: c.conversationId,
            title: c.title || '',
            href: 'https://grok.com/c/' + c.conversationId
          });
        }
      }
      token = data.nextPageToken || '';
      if (!token) break;
    }
    return all;
  });

  fs.writeFileSync(LIST, JSON.stringify(chats, null, 2));
  console.log('chats', chats.length);

  const state = loadState();
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    if (state.done[chat.id]) {
      skip++;
      continue;
    }
    const label = `[${i + 1}/${chats.length}] ${chat.title || chat.id}`;
    try {
      const payload = await page.evaluate(async (id) => {
        const nodeRes = await fetch(
          'https://grok.com/rest/app-chat/conversations/' + id + '/response-node',
          { credentials: 'include' }
        );
        if (!nodeRes.ok) throw new Error('node ' + nodeRes.status);
        const node = await nodeRes.json();
        const ids = (node.responseNodes || []).map((n) => n.responseId).filter(Boolean);
        const responses = [];
        for (let off = 0; off < ids.length; off += 40) {
          const chunk = ids.slice(off, off + 40);
          const lr = await fetch(
            'https://grok.com/rest/app-chat/conversations/' + id + '/load-responses',
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ responseIds: chunk })
            }
          );
          if (!lr.ok) throw new Error('load ' + lr.status);
          const data = await lr.json();
          for (const r of data.responses || []) responses.push(r);
        }
        const v2 = await fetch(
          'https://grok.com/rest/app-chat/conversations_v2/' + id + '?includeWorkspaces=true',
          { credentials: 'include' }
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        return {
          title: (v2 && v2.conversation && v2.conversation.title) || '',
          responses
        };
      }, chat.id);

      const byId = new Map();
      for (const r of payload.responses || []) {
        if (r && r.responseId) byId.set(r.responseId, r);
      }
      const ordered = [];
      const nodeOrder = await page.evaluate(async (id) => {
        const node = await fetch(
          'https://grok.com/rest/app-chat/conversations/' + id + '/response-node',
          { credentials: 'include' }
        ).then((r) => r.json());
        return (node.responseNodes || []).map((n) => n.responseId);
      }, chat.id);

      for (const rid of nodeOrder) {
        const r = byId.get(rid);
        if (!r) continue;
        const sender = String(r.sender || '').toLowerCase();
        if (sender !== 'human' && sender !== 'assistant' && sender !== 'user') continue;
        const text = String(r.message || '').trim();
        if (!text) continue;
        const sources = dedupeSources([
          ...(r.citedWebSearchResults || []),
          ...(r.webSearchResults || []),
          ...((r.webpageUrls || []).map((u) => ({ title: u, url: u })))
        ].map((s) => ({
          title: s.title || s.name || s.url || s.href,
          url: s.url || s.href || s.uri
        })));
        ordered.push({
          role: sender === 'human' || sender === 'user' ? 'user' : 'assistant',
          roleTag: roleTag(sender, r.model),
          text,
          sources
        });
      }

      if (!ordered.length) {
        state.failed[chat.id] = 'empty';
        saveState(state);
        fail++;
        console.log('EMPTY', label);
        continue;
      }

      const title = payload.title || chat.title || chat.id;
      const md = buildMarkdown(
        {
          platform: 'grok',
          url: chat.href,
          title,
          exported: new Date().toISOString(),
          chat_id: chat.id,
          user_email: account.email || undefined
        },
        ordered
      );
      let final = path.join(
        OUT_DIR,
        `grok-${slugTitle(title)}-${chat.id.slice(0, 8)}-${dateStamp()}.md`
      );
      if (fs.existsSync(final)) {
        final = path.join(
          OUT_DIR,
          `grok-${slugTitle(title)}-${chat.id.slice(0, 8)}-${Date.now()}.md`
        );
      }
      fs.writeFileSync(final, md, 'utf8');
      state.done[chat.id] = { file: path.basename(final), messages: ordered.length, title };
      saveState(state);
      ok++;
      console.log('OK', label, 'msgs=' + ordered.length);
    } catch (e) {
      state.failed[chat.id] = String(e && e.message ? e.message : e);
      saveState(state);
      fail++;
      console.log('FAIL', label, e && e.message ? e.message : e);
      await new Promise((r) => setTimeout(r, 800));
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(JSON.stringify({ total: chats.length, ok, skip, fail, out: OUT_DIR }));
  browser.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
