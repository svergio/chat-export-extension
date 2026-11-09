import fs from 'fs';
import puppeteer from 'puppeteer-core';

const DELAY_MS = 200;
const RETRIES = 4;

function browserWsEndpoint() {
  const p = fs
    .readFileSync('/Users/svergio_mel/Library/Application Support/Google/Chrome/DevToolsActivePort', 'utf8')
    .trim()
    .split(/\r?\n/);
  if (p.length < 2) throw new Error('DevToolsActivePort invalid');
  return `ws://127.0.0.1:${p[0]}${p[1]}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
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

  const chats = await page.evaluate(async () => {
    const session = await fetch('/api/auth/session', { credentials: 'include' }).then((r) => r.json());
    if (!session || !session.accessToken) throw new Error('no accessToken');
    const headers = { Authorization: 'Bearer ' + session.accessToken };
    const all = [];
    const seen = new Set();
    async function list(extra) {
      let offset = 0;
      for (let i = 0; i < 200; i++) {
        const u = new URL('/backend-api/conversations', location.origin);
        u.searchParams.set('offset', String(offset));
        u.searchParams.set('limit', '28');
        u.searchParams.set('order', 'updated');
        for (const [k, v] of Object.entries(extra || {})) u.searchParams.set(k, String(v));
        const res = await fetch(u.toString(), { credentials: 'include', headers });
        if (!res.ok) throw new Error('list ' + res.status + ' ' + (await res.text()).slice(0, 120));
        const data = await res.json();
        const items = data.items || [];
        for (const it of items) {
          if (!it || !it.id || seen.has(it.id)) continue;
          seen.add(it.id);
          all.push({ id: it.id, title: it.title || '', archived: !!extra.is_archived });
        }
        if (items.length < 28) break;
        offset += items.length;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    await list({});
    try {
      await list({ is_archived: true });
    } catch (_) {}
    return {
      email: (session.user && session.user.email) || '',
      chats: all
    };
  });

  console.log('account', chats.email);
  console.log('to_delete', chats.chats.length);

  let ok = 0;
  let fail = 0;
  const failed = [];

  for (let i = 0; i < chats.chats.length; i++) {
    const chat = chats.chats[i];
    const label = `[${i + 1}/${chats.chats.length}] ${chat.title || chat.id}`;
    let done = false;
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        const res = await page.evaluate(async (id) => {
          const session = await fetch('/api/auth/session', { credentials: 'include' }).then((r) =>
            r.json()
          );
          const headers = {
            Authorization: 'Bearer ' + session.accessToken,
            'Content-Type': 'application/json'
          };
          const r = await fetch('/backend-api/conversation/' + id, {
            method: 'PATCH',
            credentials: 'include',
            headers,
            body: JSON.stringify({ is_visible: false })
          });
          const text = await r.text();
          return { status: r.status, body: text.slice(0, 160) };
        }, chat.id);
        if (res.status === 429) {
          await sleep(Math.min(20000, 2000 * attempt));
          continue;
        }
        if (res.status >= 200 && res.status < 300) {
          ok++;
          console.log('OK', label);
          done = true;
          break;
        }
        failed.push({ id: chat.id, ...res });
        console.log('FAIL', label, res.status, res.body);
        await sleep(400 * attempt);
      } catch (e) {
        console.log('ERR', label, e && e.message ? e.message : e);
        await sleep(500 * attempt);
      }
    }
    if (!done) fail++;
    await sleep(DELAY_MS);
  }

  const left = await page.evaluate(async () => {
    const session = await fetch('/api/auth/session', { credentials: 'include' }).then((r) => r.json());
    const headers = { Authorization: 'Bearer ' + session.accessToken };
    const all = [];
    let offset = 0;
    for (let i = 0; i < 50; i++) {
      const data = await fetch(
        '/backend-api/conversations?offset=' + offset + '&limit=28&order=updated',
        { credentials: 'include', headers }
      ).then((r) => r.json());
      const items = data.items || [];
      for (const it of items) all.push(it.title || it.id);
      if (items.length < 28) break;
      offset += items.length;
    }
    return { count: all.length, titles: all.slice(0, 10) };
  });

  console.log(JSON.stringify({ listed: chats.chats.length, ok, fail, left, failed: failed.slice(0, 10) }));
  browser.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
