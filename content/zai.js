(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var capsCache = { key: '', data: null };

  function rpcErr(code, message, extra) {
    throw new CE.RpcError(code, message, extra);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function currentChatId() {
    var m = location.pathname.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : '';
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
      var t = localStorage.getItem('token');
      return t ? String(t) : '';
    } catch (e) {
      return '';
    }
  }

  function requireToken() {
    var tok = accessToken();
    if (!tok) rpcErr('UNAUTHORIZED', 'sign in required');
    return tok;
  }

  function apiHeaders(extra) {
    var h = { Accept: 'application/json' };
    var tok = accessToken();
    if (tok) h.Authorization = 'Bearer ' + tok;
    return Object.assign(h, extra || {});
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: apiHeaders(opts.headers || {}),
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

  function findComposerInput() {
    return document.querySelector('#chat-input') || document.querySelector('textarea#chat-input');
  }

  function findSendButton() {
    return (
      document.querySelector('#send-message-button') ||
      document.querySelector('button[aria-label="Send Message"]') ||
      document.querySelector('button[aria-label*="Send Message" i]') ||
      document.querySelector('button[type="submit"][aria-label*="Send" i]') ||
      document.querySelector('button[aria-label*="Send" i][type="submit"]')
    );
  }

  function findStopButton() {
    var nodes = document.querySelectorAll('button, [role="button"]');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!visible(nodes[i])) continue;
      if (nodes[i].closest('[data-chat-export], .chat-export-bar, .chat-export-menu')) continue;
      var blob = labelOf(nodes[i]) + ' ' + (nodes[i].id || '');
      if (/stop|останов|прерв|cancel generating/i.test(blob)) return nodes[i];
    }
    var send = findSendButton();
    if (send && /stop/i.test(labelOf(send))) return send;
    return null;
  }

  function findModelButton() {
    return (
      document.querySelector('button.modelSelectorButton') ||
      document.querySelector('button[aria-label="Select a model"]') ||
      document.querySelector('button[aria-label*="model" i]')
    );
  }

  function findMoreButton() {
    return document.querySelector('#upload-file-button') || document.querySelector('button[aria-label="More"]');
  }

  function modelChip(model) {
    if (!model) return null;
    return (
      model.querySelector('[class*="rounded-full"]') ||
      model.querySelector('.flex.items-center') ||
      model.firstElementChild ||
      model
    );
  }

  function directChildContaining(parent, descendant) {
    if (!parent || !descendant) return null;
    var cur = descendant;
    while (cur && cur.parentElement !== parent) cur = cur.parentElement;
    return cur && cur.parentElement === parent ? cur : null;
  }

  function findComposerToolbar() {
    var model = findModelButton();
    var send = findSendButton();
    var more = findMoreButton();
    var input = findComposerInput();
    var chip = modelChip(model);
    if (model && model.parentElement) {
      var row = model.parentElement;
      var before = directChildContaining(row, send) || null;
      return {
        el: row,
        insertAfter: model,
        beforeChild: before,
        nativeFrom: chip || model,
        nativeClass: chip ? String(chip.className || '').trim() : String(model.className || '').trim(),
        nativeIconFrom: more || send || model,
        nativeIconClass: more
          ? String(more.className || '').trim()
          : send
            ? String(send.className || '').trim()
            : ''
      };
    }
    var footer =
      (input && input.closest('form') && input.closest('form').querySelector('.flex.justify-between')) ||
      (send && send.closest('.flex.justify-between'));
    if (footer) {
      return {
        el: footer,
        insertAfter: null,
        beforeChild: directChildContaining(footer, send) || send || null,
        nativeFrom: chip || send || model,
        nativeClass: chip ? String(chip.className || '').trim() : '',
        nativeIconFrom: more || send || null,
        nativeIconClass: more ? String(more.className || '').trim() : ''
      };
    }
    if (input && input.parentElement) {
      return {
        el: input.parentElement,
        insertAfter: input,
        beforeChild: null,
        nativeFrom: chip || send || input,
        nativeIconFrom: more || send || null
      };
    }
    return null;
  }

  function findTitle() {
    var id = currentChatId();
    if (id) {
      var links = document.querySelectorAll('a[href*="/c/"]');
      var i;
      for (i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href') || '';
        if (href.indexOf(id) >= 0) {
          var t = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (t && t.length < 200) return t;
        }
      }
    }
    var doc = (document.title || '').replace(/\s*[-|].*Z\.ai.*$/i, '').trim();
    return doc || 'chat';
  }

  function findModel() {
    var btn = findModelButton();
    if (!btn) return '';
    var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    return t && t.length < 80 ? t : '';
  }

  function sessionUser() {
    return { userName: '', userHandle: '', userEmail: '' };
  }

  function isGenerating() {
    var stop = findStopButton();
    if (stop && visible(stop) && !stop.disabled) return true;
    return false;
  }

  async function waitForIdle(opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Z.ai idle timeout' }
    );
  }

  function liveScroller() {
    var turn = document.querySelector('.user-message, .chat-assistant');
    if (turn && CE.findOverflowScroller) return CE.findOverflowScroller(turn);
    return document.querySelector('main') || document.body;
  }

  function turnNodes(root) {
    root = root || liveScroller() || document;
    var nodes = root.querySelectorAll('.user-message, [class*="message-"]');
    var out = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('.messageInputContainer') || el.id === 'chat-input') continue;
      if (el.classList && el.classList.contains('user-message')) {
        out.push(el);
        continue;
      }
      if (/message-[0-9a-f-]{8,}/i.test(String(el.className || '')) && el.querySelector('.chat-assistant')) {
        out.push(el);
      }
    }
    return out;
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    var cls = String(el.className || '');
    var m = cls.match(/message-([0-9a-f-]{8,})/i);
    if (m) return m[1];
    if (el.classList && el.classList.contains('user-message')) {
      return 'u:' + (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    }
    return 'n' + i;
  }

  function captureTurn(turn, assistantTag) {
    try {
      var user = turn.classList && turn.classList.contains('user-message');
      if (user) {
        var ubody = turn.querySelector('.chat-user, .markdown-prose') || turn;
        var ut = (ubody.innerText || ubody.textContent || '').trim();
        if (!ut) return null;
        return { role: 'user', roleTag: 'user', text: ut, links: CE.collectLinks(ubody) };
      }
      var body = turn.querySelector('.chat-assistant, .markdown-prose') || turn;
      var thinkEl =
        turn.querySelector('[class*="think"], [class*="reasoning"], [class*="Thought"]') || null;
      var thinking = '';
      if (thinkEl && thinkEl !== body) {
        thinking = (thinkEl.innerText || thinkEl.textContent || '').replace(/\s+/g, ' ').trim();
      }
      var md = '';
      try {
        md = CE.htmlToMarkdown(body);
      } catch (e) {
        md = (body.innerText || body.textContent || '').trim();
      }
      md = String(md || '').trim();
      if (/^Thought Process\b/i.test(md)) {
        var split = md.replace(/^Thought Process\s*/i, '');
        if (!thinking) thinking = 'Thought Process';
        md = split.trim();
      }
      if (!md && !thinking) return null;
      var row = {
        role: 'assistant',
        roleTag: assistantTag || (CE.modelFenceTag ? CE.modelFenceTag(findModel(), 'zai') : 'zai'),
        text: md,
        links: CE.collectLinks(body)
      };
      if (thinking) row.thinkingChars = thinking.length;
      return row;
    } catch (err) {
      console.error('[chat-export]', err);
      return null;
    }
  }

  function toChat(row) {
    return {
      platform: 'zai',
      chatId: String(row.id || row.chatId || ''),
      title: row.title || '',
      url: chatUrl(row.id || row.chatId),
      updatedAt: Ops.toIso ? Ops.toIso(row.updated_at || row.updatedAt) : null,
      createdAt: Ops.toIso ? Ops.toIso(row.created_at || row.createdAt) : null
    };
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href*="/c/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/c\/([^/?#]+)/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = 1;
      var title = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
      var chat = {
        platform: 'zai',
        chatId: m[1],
        title: title,
        url: chatUrl(m[1]),
        updatedAt: null,
        createdAt: null
      };
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, query)) continue;
      items.push(chat);
    }
    return items;
  }

  function orderedBranch(messagesMap, currentId) {
    var byId = messagesMap || {};
    var chain = [];
    var cur = currentId;
    var guard = 0;
    while (cur && byId[cur] && guard++ < 5000) {
      chain.push(byId[cur]);
      cur = byId[cur].parentId || byId[cur].parent_id || '';
    }
    chain.reverse();
    if (chain.length) return chain;
    var keys = Object.keys(byId);
    keys.sort(function (a, b) {
      return (Number(byId[a].timestamp) || 0) - (Number(byId[b].timestamp) || 0);
    });
    var out = [];
    var i;
    for (i = 0; i < keys.length; i++) out.push(byId[keys[i]]);
    return out;
  }

  function roleTagFor(model) {
    if (CE.modelFenceTag) return CE.modelFenceTag(model, 'zai');
    return 'zai';
  }

  function domAssistantText(messageId) {
    if (!messageId) return '';
    var root =
      document.querySelector('.message-' + messageId) ||
      document.querySelector('[class*="message-' + messageId + '"]');
    if (!root) return '';
    var body = root.querySelector('.chat-assistant, .markdown-prose') || root;
    var md = '';
    try {
      md = CE.htmlToMarkdown(body);
    } catch (e) {
      md = (body.innerText || body.textContent || '').trim();
    }
    return String(md || '').trim();
  }

  function mapApiMessages(branch, fallbackModel) {
    var out = [];
    var i;
    for (i = 0; i < (branch || []).length; i++) {
      var m = branch[i];
      if (!m) continue;
      var role = String(m.role || '').toLowerCase();
      if (role !== 'user' && role !== 'assistant') continue;
      var model =
        (Array.isArray(m.models) && m.models[0]) ||
        m.model ||
        fallbackModel ||
        '';
      if (role === 'user') {
        var ut = String(m.content || '').trim();
        if (!ut) continue;
        out.push({ role: 'user', roleTag: 'user', text: ut, links: [] });
        continue;
      }
      var text = String(m.content || '').trim();
      if (!text) text = domAssistantText(m.id);
      if (!text) continue;
      var thinkingChars = 0;
      if (/^Thought Process\b/i.test(text)) {
        thinkingChars = 'Thought Process'.length;
        text = text.replace(/^Thought Process\s*/i, '').trim();
      }
      var item = {
        role: 'assistant',
        roleTag: roleTagFor(model),
        text: text,
        links: []
      };
      if (thinkingChars) item.thinkingChars = thinkingChars;
      out.push(item);
    }
    return out;
  }

  function messagesFromDom() {
    var nodes = turnNodes();
    var tag = roleTagFor(findModel());
    var out = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      var row = captureTurn(nodes[i], tag);
      if (row) out.push(row);
    }
    return out;
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId && visible(findComposerInput())) return;
    var path = '/c/' + chatId;
    if (Ops.softNavigate) Ops.softNavigate(path);
    else {
      try {
        history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {
        location.assign(chatUrl(chatId));
      }
    }
    var softOk = false;
    try {
      await Ops.waitFor(
        function () {
          return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 5000, message: 'Z.ai soft navigate timeout' }
      );
      softOk = true;
    } catch (e2) {}
    if (!softOk) {
      location.assign(chatUrl(chatId));
      await Ops.waitFor(
        function () {
          return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 30000, message: 'Z.ai navigate timeout' }
      );
    }
  }

  async function ensureNewChat() {
    if (!currentChatId() && visible(findComposerInput())) return;
    var neu =
      document.querySelector('button[aria-label="New Chat"]') ||
      document.querySelector('a[aria-label="New Chat"]') ||
      document.querySelector('button[aria-label*="New chat" i]');
    if (neu) {
      if (Ops.clickEl) Ops.clickEl(neu);
      else neu.click();
    } else if (Ops.softNavigate) {
      Ops.softNavigate('/');
    } else {
      try {
        history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {
        location.assign(location.origin + '/');
      }
    }
    try {
      await Ops.waitFor(
        function () {
          return !currentChatId() && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 8000, message: 'Z.ai new chat soft timeout' }
      );
      return;
    } catch (e2) {}
    location.assign(location.origin + '/');
    await Ops.waitFor(
      function () {
        return !currentChatId() && visible(findComposerInput()) ? true : null;
      },
      { timeoutMs: 30000, message: 'Z.ai new chat timeout' }
    );
  }

  function turnCount() {
    return turnNodes().length;
  }

  async function submitComposer(text) {
    var input = findComposerInput();
    if (!input) rpcErr('HOST_ERROR', 'composer not found');
    await waitForIdle();
    if (Ops.fillEditable) Ops.fillEditable(input, text);
    else {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (Ops.sleep) await Ops.sleep(80);
    var send = findSendButton();
    if (send && !send.disabled) {
      if (Ops.clickEl) Ops.clickEl(send);
      else send.click();
      return;
    }
    if (Ops.dispatchEnter) Ops.dispatchEnter(input);
    else {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
      );
    }
  }

  async function waitForReply(beforeTurns, opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        if (turnCount() > beforeTurns && !isGenerating()) return true;
        if (isGenerating()) return null;
        return turnCount() > beforeTurns ? true : null;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Z.ai reply timeout' }
    );
  }

  async function loadChatPayload(chatId, opts) {
    opts = opts || {};
    requireToken();
    var res = await apiFetch('/api/v1/chats/' + encodeURIComponent(chatId));
    if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
    if (!res.ok) await failFromResponse(res, 'get');
    var json = await res.json();
    var chat = (json && json.chat) || {};
    var history = chat.history || {};
    var messagesMap = history.messages || {};
    var currentId = history.currentId || history.current_id || '';
    var branch = orderedBranch(messagesMap, currentId);
    var model = (chat.models && chat.models[0]) || findModel() || '';
    var mapped = mapApiMessages(branch, model);
    var missingAssistant = false;
    var i;
    for (i = 0; i < branch.length; i++) {
      if (String(branch[i].role || '').toLowerCase() === 'assistant' && !String(branch[i].content || '').trim()) {
        if (!domAssistantText(branch[i].id)) missingAssistant = true;
      }
    }
    if ((missingAssistant || !mapped.length) && opts.allowNavigate !== false) {
      if (currentChatId() !== chatId) await navigateToChat(chatId);
      await Ops.waitFor(
        function () {
          return turnNodes().length || document.querySelector('.chat-assistant, .user-message') ? true : null;
        },
        { timeoutMs: 15000, message: 'Z.ai messages timeout' }
      ).catch(function () {});
      mapped = mapApiMessages(branch, model);
      if (!mapped.length) mapped = messagesFromDom();
    }
    var user = sessionUser();
    return {
      platform: 'zai',
      url: chatId === currentChatId() ? location.href : chatUrl(chatId),
      title: (json && json.title) || findTitle(),
      chatId: chatId,
      model: model || findModel(),
      userName: user.userName || '',
      userHandle: user.userHandle || '',
      userEmail: user.userEmail || '',
      messages: mapped,
      meta: {
        flags: (json && json.meta && json.meta.flags) || [],
        type: json && json.type,
        enableThinking: !!chat.enable_thinking
      }
    };
  }

  function exportDataFromApi() {
    var chatId = currentChatId();
    if (!chatId) return Promise.resolve(null);
    return loadChatPayload(chatId, { allowNavigate: false }).catch(function () {
      var msgs = messagesFromDom();
      if (!msgs.length) return null;
      var user = sessionUser();
      return {
        platform: 'zai',
        url: location.href,
        title: findTitle(),
        chatId: chatId,
        model: findModel(),
        userName: user.userName || '',
        userHandle: user.userHandle || '',
        userEmail: user.userEmail || '',
        messages: msgs
      };
    });
  }

  function detectModeLabel() {
    var nodes = document.querySelectorAll('button, [role="tab"], a');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!visible(nodes[i])) continue;
      var blob = labelOf(nodes[i]);
      if (/^agent$/i.test(blob)) return 'agent';
      if (/^chat$/i.test(blob)) return 'chat';
    }
    return '';
  }

  async function detectCapabilities() {
    var model = findModel();
    var modes = [
      { id: 'chat', label: 'Chat', kind: 'mode' },
      { id: 'agent', label: 'Agent', kind: 'mode' }
    ];
    var currentMode = detectModeLabel();
    var models = [];
    if (model) {
      models.push({
        id: Ops.normalizeId ? Ops.normalizeId(model) : model,
        label: model,
        kind: 'model'
      });
    }
    return {
      platform: 'zai',
      projectsSupported: false,
      models: models,
      modes: modes,
      toggles: [],
      tools: [],
      attach: { supported: true, multiple: true, accept: [] },
      current: {
        model: model ? (Ops.normalizeId ? Ops.normalizeId(model) : model) : undefined,
        mode: currentMode || undefined,
        toggles: []
      },
      detectedAt: new Date().toISOString()
    };
  }

  function capabilitiesCacheKey() {
    return findModel() + '|' + detectModeLabel() + '|' + location.pathname;
  }

  CE.definePlatform({
    id: 'zai',
    modifier: 'zai',
    fenceTag: 'zai',
    exportData: exportDataFromApi,
    exportDomFallback: true,
    active: function () {
      return visible(findComposerInput()) || !!currentChatId();
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
    ops: {
      list: async function (args) {
        try {
          requireToken();
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          var page = 1;
          if (args && args.cursor != null && String(args.cursor) !== '') {
            page = Math.max(1, parseInt(String(args.cursor), 10) || 1);
          }
          var res = await apiFetch(
            '/api/v1/chats/?page=' +
              encodeURIComponent(String(page)) +
              '&type=all&channel=zai-web&project_id=none'
          );
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
          if (!res.ok) await failFromResponse(res, 'list');
          var raw = await res.json();
          if (!Array.isArray(raw)) {
            raw = (raw && (raw.data || raw.chats || raw.items)) || [];
          }
          if (!Array.isArray(raw)) raw = [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            if (!raw[i] || !(raw[i].id || raw[i].chatId)) continue;
            var chat = toChat(raw[i]);
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          var nextCursor = null;
          if (raw.length > 0 && (raw.length >= limit || items.length >= limit)) {
            nextCursor = String(page + 1);
          }
          return { items: items, nextCursor: nextCursor };
        } catch (err) {
          if (err && err.code && err.code !== 'HOST_ERROR') throw err;
          var domItems = listFromDom(args && args.query).slice(
            0,
            Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20
          );
          return { items: domItems, nextCursor: null };
        }
      },
      get: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            chatId = currentChatId();
            if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          }
          return await loadChatPayload(chatId);
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function (args) {
        try {
          var refresh = !!(args && args.refresh);
          var key = capabilitiesCacheKey();
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
          var input = findComposerInput();
          var beforeVal = input ? String(input.value || '') : '';
          await submitComposer(text);
          try {
            await Ops.waitFor(
              function () {
                if (isGenerating()) return true;
                if (turnCount() > before) return true;
                var el = findComposerInput();
                if (el && beforeVal && String(el.value || '') !== beforeVal && !String(el.value || '').trim()) {
                  return true;
                }
                return null;
              },
              { timeoutMs: 20000, message: 'Z.ai send accept timeout' }
            );
          } catch (acceptErr) {
            if (currentChatId() !== chatId) throw acceptErr;
          }
          return {
            platform: 'zai',
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
          await waitForIdle();
          await submitComposer(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              return id || null;
            },
            { timeoutMs: 120000, message: 'Z.ai chatId timeout' }
          );
          return {
            platform: 'zai',
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
          requireToken();
          var res = await apiFetch('/api/v1/chats/' + encodeURIComponent(chatId), { method: 'DELETE' });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (!(res.status >= 200 && res.status < 300)) await failFromResponse(res, 'delete');
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
