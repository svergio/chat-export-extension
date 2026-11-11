(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var API_VERSION = '2.18';
  var API_QS = '?version=' + API_VERSION + '&source=default';
  var capsCache = { key: '', data: null };
  var threadTokenCache = {};

  function rpcErr(code, message, details) {
    throw new CE.RpcError(code, message, details);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function findByLabel(selector, re, root) {
    var list = (root || document).querySelectorAll(selector);
    var i;
    for (i = 0; i < list.length; i++) {
      if (re.test(labelOf(list[i]))) return list[i];
    }
    return null;
  }

  function currentChatId() {
    var m = location.pathname.match(/\/(?:search|session)\/([^/?#]+)/);
    if (!m) return '';
    var id = decodeURIComponent(m[1]);
    // Transitional SPA route before the real session/search id lands.
    if (!id || id === 'new') return '';
    return id;
  }

  function isThreadRoute() {
    return /\/(?:search|session)\//.test(location.pathname);
  }

  function chatUrl(chatId) {
    if (!chatId) return location.origin + '/';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatId)) {
      return location.origin + '/session/' + encodeURIComponent(chatId);
    }
    return location.origin + '/search/' + encodeURIComponent(chatId);
  }

  function dropPerplexityHost(items) {
    return (items || []).filter(function (s) {
      var url = (s && (s.url || s.href)) || '';
      return url && !/perplexity\.ai|pplx\.ai/i.test(url);
    });
  }

  function findComposerInput() {
    var boxes = document.querySelectorAll('[role="textbox"]');
    var i;
    var best = null;
    for (i = 0; i < boxes.length; i++) {
      if (!visible(boxes[i])) continue;
      var aria = (boxes[i].getAttribute('aria-label') || '').toLowerCase();
      if (/follow-up|уточн|question|вопрос|connector|коннектор/i.test(aria)) {
        best = boxes[i];
        break;
      }
      if (!best) best = boxes[i];
    }
    return best;
  }

  function findSendButton(root) {
    root = root || document;
    return (
      findByLabel('button', /^(send|отправ)/i, root) ||
      findByLabel('button', /send message|отправить/i, root)
    );
  }

  function findModelButton() {
    var btn = findByLabel('button', /^(model|модель)\b/i, document) || findByLabel('button', /model:/i, document);
    if (btn && visible(btn)) return btn;
    var buttons = document.querySelectorAll('button');
    var i;
    for (i = 0; i < buttons.length; i++) {
      if (!visible(buttons[i])) continue;
      var t = (buttons[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (/^(model|модель)$/i.test(t)) return buttons[i];
    }
    return null;
  }

  function findComposerToolbar() {
    var input = findComposerInput();
    if (!input || !visible(input)) return null;
    var model = findModelButton();
    var slot =
      (model && model.parentElement) ||
      input.closest('[class*="composer-row"]') ||
      input.closest('.group\\/composer-row') ||
      input.parentElement;
    if (!slot) return null;
    var send = findSendButton(slot);
    return {
      el: slot,
      insertAfter: model || send,
      nativeFrom: model || send,
      nativeIconFrom: model || send
    };
  }

  function findTitle() {
    if (isThreadRoute() && document.title && document.title !== 'Perplexity') {
      return document.title.replace(/\s*[|\u2013\u2014-]\s*Perplexity\s*$/i, '').trim();
    }
    return 'chat';
  }

  function findModel() {
    var btn = findModelButton();
    if (!btn) return '';
    var aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    var m = aria.match(/^(?:model|модель)\s*[:：]\s*(.+)$/i);
    if (m && m[1]) return m[1].trim().slice(0, 64);
    var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    if (t && !/^model$|^модель$/i.test(t)) return t.slice(0, 64);
    return '';
  }

  function findUserMeta() {
    return { userName: '', userHandle: '', userEmail: '' };
  }

  function liveScroller() {
    var main = document.querySelector('main');
    if (!main) return CE.findOverflowScroller(document.body);
    var explicit = main.querySelector('.scrollable-container.overflow-auto, .scrollable-container');
    if (explicit && explicit.clientHeight > 120) return explicit;
    return CE.findOverflowScroller(main) || explicit;
  }

  function isUserBubble(el) {
    return el && /user-bubble/.test(String(el.className || ''));
  }

  function isTimestampText(t) {
    return /^\d{1,2}:\d{2}$/.test(String(t || '').trim());
  }

  function turnNodes(root) {
    root = root || document;
    var main = root.querySelector('main') || root;
    var list = main.querySelectorAll('[class*="user-bubble"], .prose');
    var nodes = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.classList && el.classList.contains('prose')) {
        if (el.closest('[class*="user-bubble"]')) continue;
        if ((el.textContent || '').replace(/\s+/g, ' ').trim().length < 8) continue;
      }
      if (isUserBubble(el)) {
        var ut = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!ut || isTimestampText(ut)) continue;
      }
      nodes.push(el);
    }
    nodes.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    return nodes;
  }

  function turnKey(el, idx) {
    if (!el) return 'n' + idx;
    if (isUserBubble(el)) return 'u:' + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96);
    return 'a:' + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96);
  }

  function extractSourcesSync(turn, body) {
    var raw = [];
    var scope = turn || document;
    var fav = CE.collectFaviconSources(scope);
    var fi;
    for (fi = 0; fi < fav.length; fi++) raw.push(fav[fi]);
    if (body && body !== turn) {
      var favB = CE.collectFaviconSources(body);
      for (fi = 0; fi < favB.length; fi++) raw.push(favB[fi]);
    }
    if (turn && turn.dispatchEvent) {
      turn.dispatchEvent(new CustomEvent('chat-export-harvest', { bubbles: true, detail: {} }));
      var harvested = turn.getAttribute && turn.getAttribute('data-ce-sources');
      if (harvested) {
        turn.removeAttribute('data-ce-sources');
        try {
          var parsed = JSON.parse(harvested);
          for (var p = 0; p < parsed.length; p++) raw.push(parsed[p]);
        } catch (eH) {}
      }
    }
    var links = CE.collectLinks(body || turn);
    var L;
    for (L = 0; L < links.length; L++) {
      raw.push({ title: links[L].text || links[L].href, url: links[L].href });
    }
    return CE.dedupeSources(dropPerplexityHost(raw));
  }

  function captureTurn(turn, assistantTag) {
    try {
      if (isUserBubble(turn)) {
        var ub = turn.querySelector('.whitespace-pre-wrap') || turn;
        var ut = (ub.innerText || ub.textContent || '').replace(/\s+/g, ' ').trim();
        if (!ut || isTimestampText(ut)) return null;
        return { role: 'user', roleTag: 'user', text: ut, links: CE.collectLinks(ub) };
      }
      var body = turn.classList && turn.classList.contains('prose') ? turn : turn.querySelector('.prose') || turn;
      var text = '';
      try {
        text = CE.htmlToMarkdown(body);
      } catch (mdErr) {}
      if (!text) text = (body.innerText || body.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return null;
      var sources = extractSourcesSync(turn, body);
      return {
        role: 'assistant',
        roleTag: assistantTag,
        text: text,
        links: dropPerplexityHost(CE.collectLinks(body)),
        sources: CE.dedupeSources(sources || [])
      };
    } catch (err) {
      console.error('[chat-export]', err);
      return null;
    }
  }

  function isGenerating() {
    if (findByLabel('button', /stop|останов|abort|прерв/i, document)) return true;
    var main = document.querySelector('main');
    if (main && main.getAttribute('aria-busy') === 'true') return true;
    return false;
  }

  function apiHeaders(extra, withJsonBody) {
    var headers = {
      Accept: 'application/json',
      'x-app-apiclient': 'default',
      'x-app-apiversion': API_VERSION
    };
    // Some Perplexity GETs return empty/403 when Content-Type is forced.
    if (withJsonBody) headers['Content-Type'] = 'application/json';
    return Object.assign(headers, extra || {});
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var method = opts.method || 'GET';
    var url = path;
    if (path.indexOf('http') !== 0) {
      if (path.indexOf('?') >= 0) {
        url = path.indexOf('version=') >= 0 ? path : path + '&version=' + API_VERSION + '&source=default';
      } else {
        url = path + API_QS;
      }
    }
    return fetch(url, {
      method: method,
      credentials: 'include',
      headers: apiHeaders(opts.headers, !!opts.body || method !== 'GET'),
      body: opts.body
    });
  }

  async function failFromResponse(res, what) {
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', what + ' ' + res.status);
    if (res.status === 404) rpcErr('NOT_FOUND', what + ' not found');
    if (res.status === 429) rpcErr('RATE_LIMIT', what + ' rate limited');
    var body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch (e) {}
    rpcErr('HOST_ERROR', what + ' ' + res.status + ' ' + body);
  }

  function collectSourcesFromJson(obj, acc) {
    acc = acc || [];
    if (!obj) return acc;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) collectSourcesFromJson(obj[i], acc);
      return acc;
    }
    if (typeof obj !== 'object') return acc;
    var url = obj.url || obj.href || obj.link;
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      acc.push({
        title: String(obj.name || obj.title || obj.domain || obj.text || url).slice(0, 200),
        url: url
      });
    }
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      collectSourcesFromJson(obj[k], acc);
    }
    return acc;
  }

  function extractAnswerFromBlocks(blocks) {
    if (!blocks || !blocks.length) return '';
    var i;
    for (i = 0; i < blocks.length; i++) {
      var usage = String(blocks[i].intended_usage || '');
      if (/ask_text.*markdown|^ask_text$/i.test(usage)) {
        var answer = blocks[i].markdown_block && blocks[i].markdown_block.answer;
        if (answer && String(answer).trim()) return String(answer).trim();
      }
    }
    for (i = 0; i < blocks.length; i++) {
      var md = blocks[i].markdown_block && blocks[i].markdown_block.answer;
      if (md && String(md).trim().length > 16) return String(md).trim();
    }
    var text = blocks[0] && blocks[0].text;
    if (text && String(text).trim().length > 16) return String(text).trim();
    return '';
  }

  function messagesFromApiData(data, assistantTag) {
    var messages = [];
    var entries = (data && data.entries) || [];
    var i;
    for (i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry && entry.read_write_token) {
        var cacheKey = (data.thread_metadata && data.thread_metadata.context_uuid) || currentChatId();
        threadTokenCache[String(cacheKey)] = {
          read_write_token: entry.read_write_token,
          entry_uuid: entry.uuid || entry.entry_uuid
        };
      }
      var q = String(entry.query_str || '').trim();
      if (q) messages.push({ role: 'user', roleTag: 'user', text: q, links: [] });
      var answer = extractAnswerFromBlocks(entry.blocks || []);
      var sources = CE.dedupeSources(dropPerplexityHost(collectSourcesFromJson(entry.blocks || entry)));
      if (answer) {
        messages.push({
          role: 'assistant',
          roleTag: assistantTag,
          text: answer,
          links: [],
          sources: sources
        });
      }
    }
    return messages;
  }

  function threadIdCandidates(chatId) {
    var ids = [];
    if (chatId) ids.push(chatId);
    var meta = document.querySelector('meta[name="thread-id"], meta[property="thread:id"]');
    if (meta && meta.content) ids.push(meta.content.trim());
    return ids.filter(function (id, idx, arr) {
      return id && arr.indexOf(id) === idx;
    });
  }

  async function loadThreadApi(chatId) {
    var candidates = threadIdCandidates(chatId);
    var i;
    for (i = 0; i < candidates.length; i++) {
      var path =
        '/rest/thread/' +
        encodeURIComponent(candidates[i]) +
        '?with_parent_info=true&with_schematized_response=true&limit=100&offset=0&from_first=true&version=' +
        API_VERSION +
        '&source=default';
      var res = await apiFetch(path);
      if (res.status === 403 || res.status === 404) continue;
      if (!res.ok) continue;
      var data = await res.json();
      var entries = (data && data.entries) || [];
      if (!entries.length && data && data.first_entry) entries = [data.first_entry];
      if (!entries.length && data && data.latest_entry) entries = [data.latest_entry];
      if (data && entries.length) {
        if (!data.entries || !data.entries.length) data.entries = entries;
        return { data: data, chatId: candidates[i] };
      }
    }
    return null;
  }

  async function exportDataFromApi() {
    var chatId = currentChatId();
    if (!chatId) return null;
    var loaded = await loadThreadApi(chatId);
    if (!loaded) return null;
    var data = loaded.data;
    var meta = data.thread_metadata || {};
    var title = (meta.title || findTitle() || chatId).trim();
    var model = findModel();
    var assistantTag = CE.modelFenceTag(model, 'perplexity');
    var messages = messagesFromApiData(data, assistantTag);
    if (!messages.length) return null;
    return {
      title: title,
      chatId: loaded.chatId || chatId,
      model: model,
      messages: messages
    };
  }

  function pickChatId(row) {
    return (row && (row.context_uuid || row.slug || row.uuid || row.frontend_uuid || row.thread_url_slug)) || '';
  }

  function toListChat(row) {
    var id = pickChatId(row);
    var slug = row.slug || row.thread_url_slug || '';
    return {
      platform: 'perplexity',
      chatId: String(id),
      title: (row.title || row.name || row.first_query || '').trim(),
      url: row.url || row.thread_url || (slug ? chatUrl(slug) : chatUrl(id)),
      updatedAt: Ops.toIso ? Ops.toIso(row.last_query_datetime || row.updated_datetime) : null,
      createdAt: Ops.toIso ? Ops.toIso(row.created_datetime || row.created_at) : null
    };
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href*="/search/"], a[href*="/session/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/(?:search|session)\/([^/?#]+)/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = 1;
      var chat = {
        platform: 'perplexity',
        chatId: decodeURIComponent(m[1]),
        title: (links[i].textContent || '').replace(/\s+/g, ' ').trim(),
        url: links[i].href || chatUrl(m[1]),
        updatedAt: null,
        createdAt: null
      };
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, query)) continue;
      items.push(chat);
    }
    return items;
  }

  async function loadChatFromApi(chatId) {
    var loaded = await loadThreadApi(chatId);
    if (!loaded) rpcErr('UNAUTHORIZED', 'thread not available via API');
    var data = loaded.data;
    var meta = data.thread_metadata || {};
    var model = findModel();
    var assistantTag = CE.modelFenceTag(model, 'perplexity');
    return {
      platform: 'perplexity',
      url: chatUrl(chatId),
      chatId: chatId,
      title: (meta.title || chatId).trim(),
      model: model,
      messages: messagesFromApiData(data, assistantTag)
    };
  }

  async function waitForIdle(opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Perplexity idle timeout' }
    );
  }

  async function ensureNewChat() {
    if (location.pathname === '/' || location.pathname === '') return;
    if (Ops.softNavigate) Ops.softNavigate('/');
    else {
      history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    await Ops.waitFor(function () {
      return visible(findComposerInput()) ? true : null;
    }, { timeoutMs: 20000, message: 'Perplexity home timeout' });
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId) return;
    var path = /^[0-9a-f-]{36}$/i.test(chatId)
      ? '/session/' + encodeURIComponent(chatId)
      : '/search/' + encodeURIComponent(chatId);
    if (Ops.softNavigate) Ops.softNavigate(path);
    else {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    await Ops.waitFor(function () {
      return currentChatId() === chatId && (visible(findComposerInput()) || turnNodes().length > 0)
        ? true
        : null;
    }, { timeoutMs: 30000, message: 'Perplexity navigate timeout' });
  }

  async function fillComposer(text) {
    var input = await Ops.waitFor(function () {
      var el = findComposerInput();
      return el && visible(el) ? el : null;
    }, { timeoutMs: 15000, message: 'Perplexity composer timeout' });
    // TipTap/ProseMirror ignores plain textContent from the isolated world.
    if (Ops.fillRichComposer) await Ops.fillRichComposer(input, text);
    else if (Ops.fillEditable) Ops.fillEditable(input, text);
    else if (Ops.typeEditable) await Ops.typeEditable(input, text);
    else {
      input.textContent = text;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    await Ops.sleep(200);
    return input;
  }

  async function submitComposer(text) {
    var turnsBefore = turnNodes().length;
    var input = await fillComposer(text);
    var send = await Ops.waitFor(function () {
      var btn =
        findSendButton(document) ||
        findByLabel('button', /отправ|send/i, document);
      if (!btn || btn.closest('.chat-export-fmt, .chat-export-dl, .chat-export-menu')) return null;
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return null;
      return visible(btn) ? btn : null;
    }, { timeoutMs: 20000, message: 'Perplexity send enable timeout' });
    if (Ops.ensureComposerSubmitted) {
      await Ops.ensureComposerSubmitted({
        send: send,
        input: input,
        message: 'Perplexity submit failed',
        isDone: function () {
          if (isGenerating()) return true;
          if (turnNodes().length > turnsBefore) return true;
          if (currentChatId()) return true;
          return null;
        }
      });
    } else Ops.clickEl(send);
    return turnsBefore;
  }

  async function waitForReply(turnsBefore) {
    await Ops.waitFor(
      function () {
        if (isGenerating()) return null;
        return turnNodes().length > turnsBefore ? true : null;
      },
      { timeoutMs: 180000, message: 'Perplexity reply timeout' }
    );
  }

  async function detectCapabilities() {
    var models = [];
    try {
      var res = await apiFetch('/rest/models/config/v2' + API_QS);
      if (res.ok) {
        var cfg = await res.json();
        var raw = (cfg && (cfg.models || cfg.available_models || cfg.data)) || [];
        if (Array.isArray(raw)) {
          for (var i = 0; i < raw.length; i++) {
            var row = raw[i];
            var id = row && (row.id || row.name || row.label);
            if (!id) continue;
            models.push({ id: Ops.normalizeId ? Ops.normalizeId(id) : id, label: row.label || row.name || id, kind: 'model' });
          }
        }
      }
    } catch (eCfg) {}
    if (!models.length) {
      var cur = findModel();
      if (cur) models.push({ id: Ops.normalizeId ? Ops.normalizeId(cur) : cur, label: cur, kind: 'model' });
    }
    var projectsSupported = false;
    try {
      var cp = await apiFetch('/rest/collections/list_user_collections' + API_QS);
      if (cp.ok) projectsSupported = true;
    } catch (ePr) {}
    return {
      platform: 'perplexity',
      projectsSupported: projectsSupported,
      models: models,
      modes: [{ id: 'search', label: 'Search', kind: 'mode' }],
      toggles: [],
      tools: [],
      attach: { supported: true, multiple: true, accept: [] },
      current: { model: findModel() ? Ops.normalizeId(findModel()) : undefined, mode: 'search', toggles: [] },
      detectedAt: new Date().toISOString()
    };
  }

  var dlSvg =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="chat-export-dl-icon">' +
    '<path d="M10 2.75a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.5A.75.75 0 0 1 10 2.75z"/>' +
    '<path d="M3.75 14.5a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75z"/>' +
    '</svg>';

  CE.definePlatform({
    id: 'perplexity',
    modifier: 'perplexity',
    fenceTag: 'perplexity',
    active: function () {
      return visible(findComposerInput());
    },
    composer: findComposerToolbar,
    chatId: currentChatId,
    title: findTitle,
    model: findModel,
    user: findUserMeta,
    scroller: liveScroller,
    turns: turnNodes,
    turnKey: turnKey,
    capture: captureTurn,
    exportData: exportDataFromApi,
    downloadSvg: function () {
      return dlSvg;
    },
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          var offset = 0;
          if (args && args.cursor != null && String(args.cursor) !== '') {
            offset = Math.max(0, parseInt(String(args.cursor), 10) || 0);
          }
          var body = {
            limit: Math.max(limit, 20),
            ascending: false,
            offset: offset,
            search_term: String((args && args.query) || ''),
            exclude_asi: false
          };
          var res = await apiFetch('/rest/thread/list_ask_threads' + API_QS, {
            method: 'POST',
            body: JSON.stringify(body)
          });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
          if (!res.ok) return { items: listFromDom(args && args.query).slice(0, limit), nextCursor: null };
          var data = await res.json();
          var raw = Array.isArray(data) ? data : (data && (data.threads || data.items)) || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            var chat = toListChat(raw[i]);
            if (!chat.chatId) continue;
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          return { items: items, nextCursor: raw.length >= body.limit ? String(offset + body.limit) : null };
        } catch (err) {
          if (err && err.code && err.code !== 'HOST_ERROR') throw err;
          return { items: listFromDom(args && args.query).slice(0, Ops.clampLimit(args && args.limit)), nextCursor: null };
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            if (ctx && typeof ctx.getData === 'function') {
              var live = await ctx.getData();
              return Object.assign({ platform: 'perplexity', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          try {
            return await loadChatFromApi(chatId);
          } catch (apiErr) {
            if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
              var onPage = await ctx.getData();
              if (onPage && onPage.messages && onPage.messages.length) {
                return Object.assign({ platform: 'perplexity', url: location.href, chatId: chatId }, onPage);
              }
            }
            throw apiErr;
          }
        } catch (err) {
          hostErr(err);
        }
      },
      create: async function (args) {
        try {
          var text = String((args && args.text) || '').trim();
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          await ensureNewChat();
          await submitComposer(text);
          var chatId = await Ops.waitFor(function () {
            return currentChatId() || null;
          }, { timeoutMs: 120000, message: 'Perplexity chatId timeout' });
          await waitForReply(0);
          return {
            platform: 'perplexity',
            chatId: String(chatId),
            title: findTitle(),
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var text = String((args && args.text) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          await navigateToChat(chatId);
          await waitForIdle();
          var turnsBefore = await submitComposer(text);
          await waitForReply(turnsBefore);
          return {
            platform: 'perplexity',
            chatId: chatId,
            title: findTitle(),
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      delete: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (currentChatId() && currentChatId() !== chatId) {
            await navigateToChat(chatId);
          }
          var loaded = await loadThreadApi(chatId);
          if (!loaded && currentChatId()) loaded = await loadThreadApi(currentChatId());
          if (!loaded) rpcErr('NOT_FOUND', 'thread not found: ' + chatId);
          var entry = (loaded.data.entries && loaded.data.entries[0]) || {};
          var token = entry.read_write_token;
          var entryUuid = entry.uuid || entry.entry_uuid;
          var cached =
            threadTokenCache[chatId] ||
            threadTokenCache[loaded.chatId] ||
            (entry.context_uuid && threadTokenCache[entry.context_uuid]);
          if (!token && cached) {
            token = cached.read_write_token;
            entryUuid = entryUuid || cached.entry_uuid;
          }
          if (!token || !entryUuid) rpcErr('HOST_ERROR', 'delete tokens missing');
          messagesFromApiData(loaded.data, 'perplexity');
          var res = await apiFetch('/rest/thread/delete_thread_by_entry_uuid' + API_QS, {
            method: 'DELETE',
            body: JSON.stringify({ entry_uuid: entryUuid, read_write_token: token })
          });
          if (res.status === 404) {
            rpcErr('NOT_FOUND', 'delete rejected for: ' + chatId + ' (guest/anonymous threads may be undeletable)');
          }
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          if (!res.ok) await failFromResponse(res, 'delete');
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function (args) {
        try {
          var refresh = !!(args && args.refresh);
          var key = 'pplx';
          if (!refresh && capsCache.data && capsCache.key === key) return capsCache.data;
          var data = await detectCapabilities();
          capsCache = { key: key, data: data };
          return data;
        } catch (err) {
          hostErr(err);
        }
      },
      hostState: function () {
        var input = findComposerInput();
        return {
          generating: isGenerating(),
          composerReady: !!(input && visible(input) && (Ops.composerReady ? Ops.composerReady(input) : true))
        };
      }
    }
  });
})();
