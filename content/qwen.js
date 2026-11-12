(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var capsCache = { key: '', data: null };
  var API_VERSION = '0.3.40';

  function rpcErr(code, message) {
    throw new CE.RpcError(code, message);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function currentChatId() {
    var m = location.pathname.match(/\/c\/([0-9a-fA-F-]{8,})/);
    if (!m || m[1] === 'new-chat') return '';
    return m[1];
  }

  function chatUrl(id) {
    return location.origin + '/c/' + id;
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 12 && r.height > 12;
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function accessToken() {
    try {
      var raw = localStorage.getItem('qwen_access_token_state');
      if (raw) {
        var st = JSON.parse(raw);
        if (st && st.token) return String(st.token);
      }
    } catch (e) {}
    var t = localStorage.getItem('token');
    return t ? String(t) : '';
  }

  function apiHeaders(extra) {
    var h = {
      Accept: 'application/json, text/plain, */*',
      source: 'web',
      version: API_VERSION
    };
    var tok = accessToken();
    if (tok) h.Authorization = 'Bearer ' + tok;
    return Object.assign(h, extra || {});
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var headers = apiHeaders(opts.headers || {});
    return fetch(path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: headers,
      body: opts.body
    });
  }

  async function failFromResponse(res, what) {
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', what + ' ' + res.status);
    if (res.status === 404) rpcErr('NOT_FOUND', what + ' not found');
    if (res.status === 429) rpcErr('RATE_LIMIT', what + ' rate limited', { retryable: true, kind: 'http' });
    var body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch (e) {}
    rpcErr('HOST_ERROR', what + ' ' + res.status + ' ' + body);
  }

  async function parseJson(res) {
    var json = await res.json();
    if (json && json.success === false) {
      var code = (json.data && json.data.code) || 'HOST_ERROR';
      var details = (json.data && json.data.details) || json.message || '';
      if (/not.?found/i.test(String(code)) || /not.?found/i.test(details)) rpcErr('NOT_FOUND', details || code);
      rpcErr('HOST_ERROR', code + ': ' + details);
    }
    return (json && json.data) != null ? json.data : json;
  }

  function toChat(row) {
    return {
      platform: 'qwen',
      chatId: String(row.id || row.chatId || ''),
      title: row.title || '',
      url: chatUrl(row.id || row.chatId),
      updatedAt: Ops.toIso ? Ops.toIso(row.updated_at || row.updatedAt) : row.updated_at || null,
      createdAt: Ops.toIso ? Ops.toIso(row.created_at || row.createdAt) : row.created_at || null
    };
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a.chat-item-drag-link, a[href*="/c/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var el = links[i];
      var href = el.getAttribute('href') || '';
      var id = '';
      var m = href.match(/\/c\/([0-9a-fA-F-]{8,})/);
      if (m) id = m[1];
      if (!id) continue;
      if (id === 'new-chat' || seen[id]) continue;
      seen[id] = 1;
      var title = (el.textContent || '').replace(/\s+/g, ' ').trim();
      var chat = {
        platform: 'qwen',
        chatId: id,
        title: title,
        url: chatUrl(id),
        updatedAt: null,
        createdAt: null
      };
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, query)) continue;
      items.push(chat);
    }
    return items;
  }

  function roleTagFor(role, model) {
    if (role === 'user') return 'user';
    if (CE.modelFenceTag) return CE.modelFenceTag(model, 'qwen');
    return 'qwen';
  }

  function assistantTextFromMsg(m) {
    var thinking = String(m.reasoning_content || '').trim();
    var parts = [];
    var cl = m.content_list;
    if (Array.isArray(cl)) {
      var i;
      for (i = 0; i < cl.length; i++) {
        var row = cl[i];
        if (!row) continue;
        var phase = String(row.phase || '').toLowerCase();
        var chunk = String(row.content || '').trim();
        if (!chunk) continue;
        if (phase === 'thinking' || phase === 'reasoning') {
          thinking = (thinking + '\n' + chunk).trim();
          continue;
        }
        parts.push(chunk);
      }
    }
    var text = parts.join('\n\n').trim();
    if (!text) text = String(m.content || '').trim();
    return { text: text, thinkingChars: thinking.length };
  }

  function mapApiMessages(messages, fallbackModel) {
    var out = [];
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (!m) continue;
      var role = String(m.role || '').toLowerCase();
      if (role !== 'user' && role !== 'assistant') continue;
      var model = m.modelName || m.model || fallbackModel || '';
      if (role === 'user') {
        var ut = String(m.content || '').trim();
        if (!ut) continue;
        out.push({
          role: 'user',
          roleTag: 'user',
          text: ut,
          links: []
        });
        continue;
      }
      var parsed = assistantTextFromMsg(m);
      if (!parsed.text && !parsed.thinkingChars) continue;
      var item = {
        role: 'assistant',
        roleTag: roleTagFor('assistant', model),
        text: parsed.text,
        links: []
      };
      if (parsed.thinkingChars) item.thinkingChars = parsed.thinkingChars;
      out.push(item);
    }
    return out;
  }

  function findTitle() {
    var active = document.querySelector('a.chat-item-drag-active, a.chat-item-drag-link.chat-item-drag-active');
    if (active) {
      var t = (active.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
    return 'chat';
  }

  function findModel() {
    var btn =
      document.querySelector('button[aria-label="Select Model"]') ||
      document.querySelector('button[aria-label*="Model" i]') ||
      document.querySelector('button[aria-label*="Модел" i]');
    if (!btn) return '';
    var aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    var labeled = aria.match(/^(?:Model|Модель)\s*[:：]?\s*(.+)$/i);
    if (labeled && labeled[1]) return labeled[1].trim();
    var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    return t && t.length < 64 ? t : '';
  }

  function sessionUser() {
    var btn = document.querySelector('.user-menu-btn, button[aria-label*="User profile" i]');
    var name = btn ? (btn.textContent || btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim() : '';
    return { userName: name, userHandle: '', userEmail: '' };
  }

  function findComposerInput() {
    return document.querySelector('textarea.message-input-textarea') || document.querySelector('textarea');
  }

  function findSendButton() {
    return (
      document.querySelector('button.send-button:not(.disabled)') ||
      document.querySelector('button.send-button') ||
      document.querySelector('button[aria-label="Отправить"]') ||
      document.querySelector('button[aria-label="Send" i]')
    );
  }

  function findStopButton() {
    return (
      document.querySelector('button[aria-label="Стоп"]') ||
      document.querySelector('button[aria-label="Stop" i]')
    );
  }

  function isGenerating() {
    var stop = findStopButton();
    if (stop && visible(stop) && !stop.disabled) return true;
    var send = findSendButton();
    if (send && send.classList && send.classList.contains('loading')) return true;
    return false;
  }

  async function waitForIdle(opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Qwen idle timeout' }
    );
  }

  function firstTextChild(slot) {
    var kids = slot.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].hasAttribute('data-ce-host')) continue;
      if ((kids[i].textContent || '').trim()) return kids[i];
    }
    return null;
  }

  // Native classes are not copied: the bar sits before these nodes, so a copied
  // .qwen-thinking-selector / .record-btn would win document.querySelector lookups.
  function findComposerToolbar() {
    var slot = document.querySelector('.message-input-right-button') || document.querySelector('#message-input-container');
    if (!slot) return null;
    var thinking = slot.querySelector('.qwen-thinking-selector');
    // The chip renders after first mount; the core keeps an existing bar, so re-seat it.
    var host = slot.querySelector(':scope > [data-ce-host="qwen"]');
    if (host && thinking && thinking.parentElement === slot && host.nextElementSibling !== thinking) {
      slot.insertBefore(host, thinking);
    }
    return {
      el: slot,
      beforeChild: thinking || firstTextChild(slot),
      insertAfter: null,
      nativeFrom: null,
      nativeIconFrom: null
    };
  }

  function liveScroller() {
    var turn = document.querySelector('.qwen-chat-message-user, .qwen-chat-message-assistant');
    if (turn && CE.findOverflowScroller) return CE.findOverflowScroller(turn);
    return document.querySelector('main') || document.body;
  }

  function turnNodes(root) {
    root = root || liveScroller() || document;
    return Array.prototype.slice.call(
      root.querySelectorAll('.qwen-chat-message-user, .qwen-chat-message-assistant')
    );
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    var cls = el.className || '';
    var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return (cls.indexOf('user') >= 0 ? 'u:' : 'a:') + text || 'n' + i;
  }

  function captureTurn(turn, assistantTag) {
    var user = turn.classList && turn.classList.contains('qwen-chat-message-user');
    var body =
      turn.querySelector('.qwen-markdown') ||
      turn.querySelector('[class*="markdown"]') ||
      turn;
    var text = '';
    try {
      text = user ? (body.innerText || body.textContent || '').trim() : CE.htmlToMarkdown(body);
    } catch (e) {
      text = (body.innerText || body.textContent || '').trim();
    }
    if (!text) return null;
    return {
      role: user ? 'user' : 'assistant',
      roleTag: user ? 'user' : assistantTag,
      text: text,
      links: CE.collectLinks(body)
    };
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId) return;
    if (Ops.softNavigate) Ops.softNavigate('/c/' + chatId);
    else location.assign('/c/' + chatId);
    await Ops.waitFor(
      function () {
        return currentChatId() === chatId && visible(findComposerInput());
      },
      { timeoutMs: 25000, message: 'Qwen navigate timeout' }
    );
  }

  async function ensureNewChat() {
    if (!currentChatId() && visible(findComposerInput())) return;
    if (Ops.softNavigate) Ops.softNavigate('/');
    else location.assign('/');
    await Ops.waitFor(
      function () {
        return !currentChatId() && visible(findComposerInput());
      },
      { timeoutMs: 20000, message: 'Qwen new chat timeout' }
    );
  }

  function turnCount() {
    return turnNodes().length;
  }

  async function submitComposer(text) {
    var input = findComposerInput();
    if (!input) rpcErr('HOST_ERROR', 'composer not found');
    await waitForIdle();
    if (Ops.fillTextarea) await Ops.fillTextarea(input, text);
    else {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await Ops.sleep(80);
    var send = findSendButton();
    if (send && !send.disabled) Ops.clickEl(send);
    else if (Ops.dispatchEnter) Ops.dispatchEnter(input);
    else rpcErr('HOST_ERROR', 'send control not found');
  }

  async function waitForReply(beforeTurns, opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        if (turnCount() > beforeTurns && !isGenerating()) return true;
        if (isGenerating()) return null;
        return turnCount() > beforeTurns ? true : null;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Qwen reply timeout' }
    );
  }

  function mergeMessagesById(existing, incoming) {
    var seen = {};
    var out = [];
    var i;
    for (i = 0; i < existing.length; i++) {
      var row = existing[i];
      var key = row.id || row.turn_id || 'e' + i;
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(row);
    }
    for (i = 0; i < incoming.length; i++) {
      var msg = incoming[i];
      var id = (msg && (msg.id || msg.message_id || msg.turn_id)) || 'n' + i;
      if (seen[id]) continue;
      seen[id] = 1;
      out.push(msg);
    }
    out.sort(function (a, b) {
      return (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0);
    });
    return out;
  }

  async function loadChatFromApi(chatId) {
    var lim = 80;
    var title = '';
    var model = '';
    var merged = [];
    var lastId = '';
    var page = 0;
    while (page < 50) {
      page += 1;
      var path =
        '/api/v2/chats/' +
        encodeURIComponent(chatId) +
        '?direction=up&limit=' +
        encodeURIComponent(String(lim));
      if (lastId) path += '&last_id=' + encodeURIComponent(lastId);
      var res = await apiFetch(path);
      if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
      if (!res.ok) await failFromResponse(res, 'get');
      var data = await parseJson(res);
      if (!title && data && data.title) title = data.title;
      var chat = (data && data.chat) || {};
      var batch = chat.messages || (data && data.messages) || [];
      merged = mergeMessagesById(merged, batch);
      if (!model) {
        model =
          (chat.models && chat.models[0]) ||
          (data.models && data.models[0]) ||
          (merged.length && merged[merged.length - 1] && merged[merged.length - 1].model) ||
          '';
      }
      var pag = chat.history && chat.history.pagination;
      if (!pag || !pag.has_more_older) break;
      if (!pag.oldest_id || pag.oldest_id === lastId) break;
      lastId = pag.oldest_id;
    }
    var user = sessionUser();
    return {
      platform: 'qwen',
      url: chatUrl(chatId),
      title: title || '',
      chatId: chatId,
      model: model || findModel(),
      userName: user.userName || '',
      userHandle: user.userHandle || '',
      userEmail: user.userEmail || '',
      messages: mapApiMessages(merged, model)
    };
  }

  function exportDataFromApi() {
    var chatId = currentChatId();
    if (!chatId) return Promise.resolve(null);
    return loadChatFromApi(chatId);
  }

  async function detectCapabilities(refresh) {
    var model = findModel();
    var res = await apiFetch('/api/v2/models/');
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'models ' + res.status);
    if (!res.ok) await failFromResponse(res, 'models');
    var data = await parseJson(res);
    var raw = (data && data.data) || data || [];
    if (!Array.isArray(raw)) raw = [];
    var models = [];
    var i;
    for (i = 0; i < raw.length; i++) {
      var row = raw[i];
      if (!row) continue;
      var id = row.id || row.name;
      if (!id) continue;
      models.push({ id: Ops.normalizeId ? Ops.normalizeId(id) : id, label: row.name || id, kind: 'model' });
    }
    var thinking = document.querySelector('.qwen-thinking-selector');
    var toggles = [];
    if (thinking) toggles.push({ id: 'thinking_mode', label: labelOf(thinking) || 'thinking', kind: 'toggle' });
    return {
      platform: 'qwen',
      projectsSupported: true,
      models: models,
      modes: [],
      toggles: toggles,
      tools: [],
      attach: { supported: false, multiple: false, accept: [] },
      current: {
        model: model ? (Ops.normalizeId ? Ops.normalizeId(model) : model) : models[0] && models[0].id,
        toggles: []
      },
      detectedAt: new Date().toISOString()
    };
  }

  function capabilitiesCacheKey() {
    return findModel() + '|' + document.documentElement.className;
  }

  CE.definePlatform({
    id: 'qwen',
    modifier: 'qwen',
    fenceTag: 'qwen',
    exportData: exportDataFromApi,
    exportDomFallback: false,
    active: function () {
      return visible(findComposerInput());
    },
    composer: findComposerToolbar,
    chatId: currentChatId,
    title: findTitle,
    model: findModel,
    user: sessionUser,
    scroller: liveScroller,
    turns: turnNodes,
    turnKey: turnKey,
    capture: captureTurn,
    downloadSvg: function () {
      return (
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="chat-export-dl-icon">' +
        '<path d="M10 2.75a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.5A.75.75 0 0 1 10 2.75z"/>' +
        '<path d="M3.75 14.5a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75z"/>' +
        '</svg>'
      );
    },
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          var page = 1;
          if (args && args.cursor != null && String(args.cursor) !== '') {
            page = Math.max(1, parseInt(String(args.cursor), 10) || 1);
          }
          var res = await apiFetch(
            '/api/v2/chats/?page=' + encodeURIComponent(String(page)) + '&exclude_project=true'
          );
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
          if (!res.ok) {
            var body = await res.text();
            rpcErr('HOST_ERROR', 'list ' + res.status + ' ' + body.slice(0, 160));
          }
          var raw = await parseJson(res);
          if (!Array.isArray(raw)) raw = [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            if (!raw[i] || !raw[i].id) continue;
            var chat = toChat(raw[i]);
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          var nextCursor = raw.length > 0 && items.length >= limit ? String(page + 1) : raw.length ? String(page + 1) : null;
          if (raw.length === 0) nextCursor = null;
          return { items: items, nextCursor: nextCursor };
        } catch (err) {
          if (err && err.code && err.code !== 'HOST_ERROR') throw err;
          var domItems = listFromDom(args && args.query).slice(0, Ops.clampLimit(args && args.limit));
          return { items: domItems, nextCursor: null };
        }
      },
      get: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            chatId = currentChatId();
            if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
            var current = await loadChatFromApi(chatId);
            return Object.assign({ url: location.href }, current);
          }
          return await loadChatFromApi(chatId);
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function (args) {
        try {
          var refresh = !!(args && args.refresh);
          var key = capabilitiesCacheKey();
          if (!refresh && capsCache.data && capsCache.key === key) return capsCache.data;
          var data = await detectCapabilities(refresh);
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
          composerReady: visible(input) && (Ops.composerReady ? Ops.composerReady(input) : true)
        };
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var text = String((args && args.text) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          await navigateToChat(chatId);
          await waitForIdle();
          var before = turnCount();
          await submitComposer(text);
          await waitForReply(before);
          return {
            platform: 'qwen',
            chatId: chatId,
            title: findTitle(),
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      create: async function (args) {
        try {
          var text = String((args && args.text) || '').trim();
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          await ensureNewChat();
          var before = turnCount();
          await submitComposer(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              if (id && id !== 'new-chat') return id;
              if (turnCount() > before && location.pathname.indexOf('/c/') === 0) {
                var m = location.pathname.match(/\/c\/([0-9a-fA-F-]{8,})/);
                if (m && m[1] !== 'new-chat') return m[1];
              }
              return null;
            },
            { timeoutMs: 120000, message: 'Qwen chatId timeout' }
          );
          await waitForReply(before);
          return {
            platform: 'qwen',
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
          var res = await apiFetch('/api/v2/chats/' + encodeURIComponent(chatId), { method: 'DELETE' });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          var data = null;
          try {
            data = await res.json();
          } catch (e) {}
          if (data && data.success === false) {
            var details = (data.data && data.data.details) || '';
            if (/not.?found/i.test(details)) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          }
          if (!(res.status >= 200 && res.status < 300)) await failFromResponse(res, 'delete');
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
