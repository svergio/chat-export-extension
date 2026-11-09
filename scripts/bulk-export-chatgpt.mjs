import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const OUT_DIR = '/Users/svergio_mel/Desktop/NodeRed/Экспорты чатов';
const META_DIR = '/Users/svergio_mel/Desktop/NodeRed/chat-export-extension/scripts';
const STATE = path.join(META_DIR, '_chatgpt_state.json');
const LIST = path.join(META_DIR, '_chatgpt_chats.json');
const DELAY_MS = 350;
const RETRIES = 4;

function browserWsEndpoint() {
  const p = fs
    .readFileSync('/Users/svergio_mel/Library/Application Support/Google/Chrome/DevToolsActivePort', 'utf8')
    .trim()
    .split(/\r?\n/);
  if (p.length < 2) throw new Error('DevToolsActivePort invalid');
  return `ws://127.0.0.1:${p[0]}${p[1]}`;
}

function slugTitle(s) {
  return (
    String(s || 'chat')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'chat'
  );
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

function roleTag(role, model) {
  if (role === 'user') return 'user';
  const raw = String(model || '').trim().toLowerCase();
  if (!raw) return 'chatgpt';
  const slug = raw.replace(/[^a-z0-9+._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  if (!slug) return 'chatgpt';
  if (slug.indexOf('chatgpt') === 0) return slug;
  return 'chatgpt-' + slug;
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserWsEndpoint(),
    defaultViewport: null
  });
  const pages = await browser.pages();
  let page = pages.find((p) => /chatgpt\.com/.test(p.url()));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  const bootstrap = await page.evaluate(async () => {
    const session = await fetch('/api/auth/session', { credentials: 'include' }).then((r) => r.json());
    if (!session || !session.accessToken) throw new Error('no accessToken');
    const headers = { Authorization: 'Bearer ' + session.accessToken };
    async function listAll(extra) {
      const all = [];
      let offset = 0;
      for (let i = 0; i < 200; i++) {
        const u = new URL('/backend-api/conversations', location.origin);
        u.searchParams.set('offset', String(offset));
        u.searchParams.set('limit', '28');
        u.searchParams.set('order', 'updated');
        for (const [k, v] of Object.entries(extra || {})) u.searchParams.set(k, String(v));
        const res = await fetch(u.toString(), { credentials: 'include', headers });
        if (!res.ok) throw new Error('list ' + res.status);
        const data = await res.json();
        const items = data.items || [];
        for (const it of items) {
          if (!it || !it.id) continue;
          all.push({
            id: it.id,
            title: it.title || '',
            archived: !!extra.is_archived,
            href: 'https://chatgpt.com/c/' + it.id,
            update_time: it.update_time || null
          });
        }
        if (items.length < 28) break;
        offset += items.length;
        await new Promise((r) => setTimeout(r, 200));
      }
      return all;
    }
    const active = await listAll({});
    let archived = [];
    try {
      archived = await listAll({ is_archived: true });
    } catch (_) {}
    const byId = new Map();
    for (const c of active.concat(archived)) byId.set(c.id, c);
    return {
      email: (session.user && (session.user.email || session.user.name)) || '',
      chats: [...byId.values()]
    };
  });

  fs.writeFileSync(LIST, JSON.stringify(bootstrap.chats, null, 2));
  console.log('chats', bootstrap.chats.length);

  const state = loadState();
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < bootstrap.chats.length; i++) {
    const chat = bootstrap.chats[i];
    if (state.done[chat.id]) {
      skip++;
      continue;
    }
    const label = `[${i + 1}/${bootstrap.chats.length}] ${chat.title || chat.id}`;
    let lastErr = null;
    let payload = null;
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        payload = await page.evaluate(async (id) => {
          const session = await fetch('/api/auth/session', { credentials: 'include' }).then((r) => r.json());
          const headers = { Authorization: 'Bearer ' + session.accessToken };
          const res = await fetch('/backend-api/conversation/' + id, {
            credentials: 'include',
            headers
          });
          if (res.status === 429) {
            return { error: '429', retryAfter: res.headers.get('retry-after') };
          }
          if (!res.ok) {
            const t = await res.text();
            return { error: 'http ' + res.status + ' ' + t.slice(0, 160) };
          }
          const conv = await res.json();
          const mapping = conv.mapping || {};
          let cur = conv.current_node;
          const chain = [];
          while (cur && mapping[cur]) {
            chain.push(cur);
            cur = mapping[cur].parent;
            if (chain.length > 5000) break;
          }
          chain.reverse();

          function partsToText(parts) {
            const out = [];
            for (const p of parts || []) {
              if (typeof p === 'string') {
                if (p.trim()) out.push(p);
              } else if (p && typeof p.text === 'string' && p.text.trim()) {
                out.push(p.text);
              } else if (p && (p.content_type === 'image_asset_pointer' || p.asset_pointer)) {
                out.push('[image]');
              }
            }
            return out.join('\n\n').trim();
          }

          function collectSources(meta) {
            const seen = new Set();
            const out = [];
            function add(title, url) {
              if (!url || !/^https?:\/\//i.test(url)) return;
              if (/chatgpt\.com|openai\.com|oaistatic|gstatic/i.test(url)) return;
              if (seen.has(url)) return;
              seen.add(url);
              out.push({
                title: String(title || url).replace(/\s+/g, ' ').trim() || url,
                url: url.replace(/([?&])utm_source=chatgpt\.com(&|$)/, (_, a, b) => (b === '&' ? a : '')).replace(/[?&]$/, '')
              });
            }
            for (const g of meta.search_result_groups || []) {
              for (const e of g.entries || g.results || g.items || []) {
                add(e.title || e.attribution || g.domain, e.url);
              }
            }
            for (const r of meta.content_references || []) {
              if (r.url) add(r.title, r.url);
              for (const s of r.sources || r.safe_urls || []) {
                if (typeof s === 'string') add(s, s);
                else if (s && s.url) add(s.title || s.url, s.url);
              }
              for (const item of r.items || []) {
                if (item && item.url) add(item.title || item.url, item.url);
              }
            }
            return out;
          }

          const messages = [];
          for (const nid of chain) {
            const node = mapping[nid];
            const m = node && node.message;
            if (!m || !m.author) continue;
            const role = m.author.role;
            if (role !== 'user' && role !== 'assistant') continue;
            const text = partsToText((m.content && m.content.parts) || []);
            if (!text) continue;
            const meta = m.metadata || {};
            const model = meta.model_slug || meta.resolved_model_slug || meta.default_model_slug || '';
            messages.push({
              role,
              model,
              text,
              sources: role === 'assistant' ? collectSources(meta) : []
            });
          }
          return {
            title: conv.title || '',
            model: conv.default_model_slug || '',
            messages
          };
        }, chat.id);

        if (payload && payload.error === '429') {
          const wait = Math.min(30000, (Number(payload.retryAfter) || 5) * 1000 * attempt);
          console.log('RATE', label, 'wait', wait);
          await sleep(wait);
          continue;
        }
        if (payload && payload.error) {
          lastErr = payload.error;
          await sleep(500 * attempt);
          continue;
        }
        break;
      } catch (e) {
        lastErr = String(e && e.message ? e.message : e);
        await sleep(600 * attempt);
      }
    }

    if (!payload || payload.error) {
      state.failed[chat.id] = lastErr || (payload && payload.error) || 'unknown';
      saveState(state);
      fail++;
      console.log('FAIL', label, state.failed[chat.id]);
      await sleep(DELAY_MS);
      continue;
    }

    if (!payload.messages || !payload.messages.length) {
      state.failed[chat.id] = 'empty';
      saveState(state);
      fail++;
      console.log('EMPTY', label);
      await sleep(DELAY_MS);
      continue;
    }

    const messages = payload.messages.map((m) => ({
      role: m.role,
      roleTag: roleTag(m.role, m.model),
      text: m.text,
      sources: m.sources || []
    }));
    const title = payload.title || chat.title || chat.id;
    const md = buildMarkdown(
      {
        platform: 'chatgpt',
        url: chat.href,
        title,
        exported: new Date().toISOString(),
        chat_id: chat.id,
        model: payload.model || undefined,
        user_email: bootstrap.email || undefined
      },
      messages
    );

    let final = path.join(OUT_DIR, `chatgpt-${slugTitle(title)}-${dateStamp()}.md`);
    if (fs.existsSync(final)) {
      final = path.join(
        OUT_DIR,
        `chatgpt-${slugTitle(title)}-${chat.id.slice(0, 8)}-${dateStamp()}.md`
      );
    }
    fs.writeFileSync(final, md, 'utf8');
    state.done[chat.id] = {
      file: path.basename(final),
      messages: messages.length,
      title,
      archived: !!chat.archived
    };
    saveState(state);
    ok++;
    console.log('OK', label, 'msgs=' + messages.length);
    await sleep(DELAY_MS);
  }

  console.log(
    JSON.stringify({
      total: bootstrap.chats.length,
      ok,
      skip,
      fail,
      out: OUT_DIR
    })
  );
  browser.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
