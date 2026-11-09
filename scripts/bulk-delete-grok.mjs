import fs from 'fs';
import puppeteer from 'puppeteer-core';

function browserWsEndpoint() {
  const p = fs
    .readFileSync('/Users/svergio_mel/Library/Application Support/Google/Chrome/DevToolsActivePort', 'utf8')
    .trim()
    .split(/\r?\n/);
  if (p.length < 2) throw new Error('DevToolsActivePort invalid');
  return `ws://127.0.0.1:${p[0]}${p[1]}`;
}

async function main() {
  const browser = await puppeteer.connect({
    browserWSEndpoint: browserWsEndpoint(),
    defaultViewport: null
  });
  const prefer = process.env.GROK_PAGE_MATCH || '';
  const expectEmail = (process.env.GROK_EXPECT_EMAIL || '').toLowerCase();
  const pages = await browser.pages();
  let page =
    (prefer && pages.find((p) => p.url().includes(prefer))) ||
    pages.find((p) => /grok\.com\/c\//.test(p.url())) ||
    pages.find((p) => /grok\.com/.test(p.url()));
  if (!page) {
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
  if (expectEmail && account.email.toLowerCase() !== expectEmail) {
    throw new Error('wrong account: ' + account.email + ' expected ' + expectEmail);
  }

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
    for (let i = 0; i < 50; i++) {
      const data = await fetchPage(token || undefined);
      for (const c of data.conversations || []) {
        if (c.conversationId) all.push({ id: c.conversationId, title: c.title || '' });
      }
      token = data.nextPageToken || '';
      if (!token) break;
    }
    return all;
  });

  console.log('to_delete', chats.length);

  let ok = 0;
  let fail = 0;
  const failed = [];

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    const label = `[${i + 1}/${chats.length}] ${chat.title || chat.id}`;
    try {
      const status = await page.evaluate(async (id) => {
        const res = await fetch('https://grok.com/rest/app-chat/conversations/' + id, {
          method: 'DELETE',
          credentials: 'include'
        });
        const text = await res.text();
        return { status: res.status, body: text.slice(0, 120) };
      }, chat.id);
      if (status.status >= 200 && status.status < 300) {
        ok++;
        console.log('OK', label);
      } else {
        fail++;
        failed.push({ id: chat.id, ...status });
        console.log('FAIL', label, status.status, status.body);
      }
    } catch (e) {
      fail++;
      failed.push({ id: chat.id, err: String(e && e.message ? e.message : e) });
      console.log('FAIL', label, e && e.message ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const left = await page.evaluate(async () => {
    const res = await fetch(
      'https://grok.com/rest/app-chat/conversations?pageSize=5&excludeProjects=true',
      { credentials: 'include' }
    );
    const data = await res.json();
    return {
      count: (data.conversations || []).length,
      next: !!data.nextPageToken,
      titles: (data.conversations || []).map((c) => c.title)
    };
  });

  console.log(JSON.stringify({ listed: chats.length, ok, fail, left, failed: failed.slice(0, 10) }));
  browser.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
