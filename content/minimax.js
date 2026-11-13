(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var capsCache = { key: '', data: null };
  var API_BASE = '/minimax-cloud/api/v1';

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
    return r.width > 8 && r.height > 8;
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function signedOut() {
    var btn =
      document.querySelector('button[aria-label="Sign in"]') ||
      document.querySelector('[aria-label="Sign in"]');
    return !!(btn && visible(btn));
  }

  function requireAuth() {
    if (signedOut()) rpcErr('UNAUTHORIZED', 'MiniMax Agent requires sign-in');
  }

  function idFromHref(href) {
    if (!href) return '';
    try {
      var u = new URL(href, location.origin);
      var q = u.searchParams.get('chatID') || u.searchParams.get('chatId');
      if (q) return String(q);
      var m = (u.pathname || '').match(/\/(?:task|session|chat|c)\/([^/?#]+)/i);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function currentChatId() {
    try {
      var u = new URL(location.href);
      var q = u.searchParams.get('chatID') || u.searchParams.get('chatId');
      if (q) return String(q);
    } catch (e0) {}
    var m = (location.pathname || '').match(/\/(?:task|session|chat|c)\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    var active = document.querySelector(
      '[data-session-id].is-active, [data-session-id][aria-current="page"], a[href*="chatID="][aria-current="page"]'
    );
    if (active) {
      var sid = active.getAttribute('data-session-id') || idFromHref(active.getAttribute('href') || '');
      if (sid) return sid;
    }
    return '';
  }

  function chatUrl(id) {
    if (!id) return location.origin + '/';
    return location.origin + '/?chatID=' + encodeURIComponent(id);
  }

  function findComposerInput() {
    var nodes = document.querySelectorAll(
      '[data-testid="message-textarea"].tiptap, .tiptap.ProseMirror.rich-text-editor, .tiptap.ProseMirror[contenteditable="true"]'
    );
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (visible(nodes[i])) return nodes[i];
    }
    return nodes[0] || null;
  }

  function findSendButton() {
    return (
      document.querySelector('[data-testid="send-button"]') ||
      document.querySelector('[aria-label="Send message"]') ||
      document.querySelector('[aria-label*="Send" i][role="button"]')
    );
  }

  function findStopButton() {
    return (
      document.querySelector('[data-testid="stop-button"]') ||
      document.querySelector('[aria-label*="Stop" i]') ||
      document.querySelector('[aria-label*="Останов" i]')
    );
  }

  function findModelButton() {
    return (
      document.querySelector('[data-testid="model-selector-trigger"]') ||
      document.querySelector('button.mavis-model-selector-trigger')
    );
  }

  function findNewTaskButton() {
    var btns = document.querySelectorAll('button');
    var i;
    for (i = 0; i < btns.length; i++) {
      if (/^new\s*task$/i.test((btns[i].textContent || '').replace(/\s+/g, ' ').trim())) return btns[i];
    }
    return null;
  }

  var STATE_CLASS_RE =
    /(--(selected|disabled|active|loading|pressed|checked|open))$|^(active|selected|disabled|is-active|is-selected|is-open)$/;

  function nativeClassOf(el) {
    if (!el) return '';
    return String(el.className || '')
      .split(/\s+/)
      .filter(function (c) {
        if (!c) return false;
        if (STATE_CLASS_RE.test(c)) return false;
        if (/^mavis-model-selector/.test(c)) return false;
        if (/^hover:/.test(c) || /^focus:/.test(c) || /^active:/.test(c)) return false;
        if (/^cursor-/.test(c) || c === 'ant-dropdown-trigger') return false;
        return true;
      })
      .join(' ');
  }

  function findComposerToolbar() {
    var input = findComposerInput();
    if (!input || !visible(input)) return null;
    var right = document.querySelector('[data-message-input-toolbar-right="true"]');
    var model = findModelButton();
    var send = findSendButton();
    var attach =
      document.querySelector('[data-testid="attach-button"]') ||
      document.querySelector('[aria-label="Add attachment"]');
    var slot =
      right ||
      (send && send.parentElement) ||
      (model && model.parentElement) ||
      input.closest('.mavis-message-input-card') ||
      input.closest('[data-testid="message-input"]');
    if (!slot) return null;
    var chip = model || attach || send;
    var icon = attach || send || model;
    var cls = nativeClassOf(chip);
    var iconCls = nativeClassOf(icon) || cls;
    return {
      el: slot,
      beforeChild: send || null,
      insertAfter: !send && model ? model : null,
      nativeFrom: chip || null,
      nativeClass: cls || 'mavis-control-surface',
      nativeIconFrom: icon || null,
      nativeIconClass: iconCls || cls || 'mavis-control-surface'
    };
  }

  function findTitle() {
    var active =
      document.querySelector('[data-session-id].is-active') ||
      document.querySelector('[data-testid*="session"][aria-current="page"]') ||
      document.querySelector('a[href*="chatID="][aria-current="page"]');
    if (active) {
      var t = (active.getAttribute('title') || active.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 200) return t;
    }
    var h = document.querySelector('h1, [data-testid="session-title"], [class*="session-title"]');
    if (h) {
      var ht = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (ht && ht.length < 200 && !/makes your work easier/i.test(ht)) return ht;
    }
    if (document.title && !/^MiniMax/i.test(document.title)) {
      return document.title.replace(/\s*[|\u2013\u2014-]\s*MiniMax.*$/i, '').trim() || 'task';
    }
    return currentChatId() ? 'task' : 'task';
  }

  function findModel() {
    var btn = findModelButton();
    if (!btn) return '';
    var label = btn.querySelector('[data-composer-model-label], bdi');
    var t = ((label && label.textContent) || btn.getAttribute('title') || btn.textContent || '')
      .replace(/\s+/g, ' ')
      .replace(/\bdefault\b/gi, '')
      .trim();
    return t && t.length < 64 ? t : '';
  }

  function sessionUser() {
    return { userName: '', userHandle: '', userEmail: '' };
  }

  function isGenerating() {
    var stop = findStopButton();
    if (stop && visible(stop) && stop.getAttribute('aria-disabled') !== 'true' && !stop.disabled) {
      return true;
    }
    var send = findSendButton();
    if (!send) return false;
    var aria = (send.getAttribute('aria-label') || '').toLowerCase();
    if (/stop|cancel|interrupt|останов/i.test(aria)) return true;
    if (send.getAttribute('data-state') === 'loading' || send.classList.contains('is-loading')) return true;
    return false;
  }

  async function waitForIdle(opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'MiniMax idle timeout' }
    );
  }

  function liveScroller() {
    var turn = document.querySelector(
      '[data-testid="user-message"], [data-testid="assistant-message"], [data-message-role], [class*="message-item"]'
    );
    if (turn && CE.findOverflowScroller) return CE.findOverflowScroller(turn);
    return (
      document.querySelector('[data-testid="chat-scroll"], [data-testid="session-scroll"], main') ||
      document.body
    );
  }

  function turnNodes(root) {
    root = root || liveScroller() || document;
    var sel =
      '[data-testid="user-message"], [data-testid="assistant-message"], [data-message-role="user"], [data-message-role="assistant"], [data-role="user"], [data-role="assistant"]';
    var nodes = Array.prototype.slice.call(root.querySelectorAll(sel));
    if (nodes.length) return nodes;
    var loose = Array.prototype.slice.call(
      root.querySelectorAll('[class*="message-item"], [class*="chat-message"], [class*="mavis-message"]')
    );
    return loose.filter(function (el) {
      if (!visible(el)) return false;
      if (el.closest('.mavis-message-input-card, [data-testid="message-input"]')) return false;
      var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      return text.length > 0;
    });
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    return (
      el.getAttribute('data-message-id') ||
      el.getAttribute('data-testid') ||
      el.id ||
      (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) ||
      'n' + i
    );
  }

  function roleOfTurn(el) {
    var role = (el.getAttribute('data-message-role') || el.getAttribute('data-role') || '').toLowerCase();
    if (role === 'user' || role === 'human') return 'user';
    if (role === 'assistant' || role === 'bot' || role === 'agent') return 'assistant';
    var tid = (el.getAttribute('data-testid') || '').toLowerCase();
    if (tid.indexOf('user') >= 0) return 'user';
    if (tid.indexOf('assistant') >= 0 || tid.indexOf('agent') >= 0) return 'assistant';
    var cls = String(el.className || '').toLowerCase();
    if (/\buser\b/.test(cls)) return 'user';
    if (/\bassistant\b|\bagent\b|\bbot\b/.test(cls)) return 'assistant';
    return 'assistant';
  }

  function captureTurn(turn, assistantTag) {
    var role = roleOfTurn(turn);
    var body =
      turn.querySelector('[data-testid*="markdown"], [class*="markdown"], .ProseMirror, [class*="message-content"]') ||
      turn;
    var text = '';
    try {
      text = role === 'user' ? (body.innerText || body.textContent || '').trim() : CE.htmlToMarkdown(body);
    } catch (e) {
      text = (body.innerText || body.textContent || '').trim();
    }
    if (!text) return null;
    return {
      role: role,
      roleTag: role === 'user' ? 'user' : assistantTag,
      text: text,
      links: CE.collectLinks(body)
    };
  }

  function turnCount() {
    return turnNodes().length;
  }

  function toChat(row) {
    var id = String((row && (row.id || row.session_id || row.chatId || row.chatID)) || '');
    return {
      platform: 'minimax',
      chatId: id,
      title: (row && (row.title || row.name || row.display_name)) || '',
      url: chatUrl(id),
      updatedAt: Ops.toIso
        ? Ops.toIso(row && (row.last_active_at || row.updated_at || row.updatedAt))
        : null,
      createdAt: Ops.toIso ? Ops.toIso(row && (row.created_at || row.createdAt)) : null
    };
  }

  function fiberSessionId(el) {
    if (!el) return '';
    var key = Object.keys(el).find(function (k) {
      return k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0;
    });
    if (!key) return '';
    var fiber = el[key];
    var i;
    for (i = 0; i < 30 && fiber; i++) {
      var props = fiber.memoizedProps || fiber.pendingProps;
      if (props && typeof props === 'object') {
        var cand =
          props.sessionId ||
          props.session_id ||
          props.chatID ||
          props.chatId ||
          (props.session && (props.session.id || props.session.session_id)) ||
          props.id;
        if (cand && typeof cand === 'string' && cand.length >= 6 && cand.length < 128) {
          if (!/^(new|home|root)$/i.test(cand)) return cand;
        }
      }
      fiber = fiber.return;
    }
    return '';
  }

  function listFromDom(query) {
    var seen = {};
    var items = [];
    function push(id, title, updatedAt) {
      if (!id || seen[id]) return;
      seen[id] = 1;
      var chat = {
        platform: 'minimax',
        chatId: id,
        title: title || '',
        url: chatUrl(id),
        updatedAt: updatedAt || null,
        createdAt: null
      };
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, query)) return;
      items.push(chat);
    }

    var links = document.querySelectorAll(
      'a[href*="chatID="], a[href*="chatId="], a[href*="/session/"], a[href*="/task/"], [data-session-id]'
    );
    var i;
    for (i = 0; i < links.length; i++) {
      var el = links[i];
      var id = el.getAttribute('data-session-id') || idFromHref(el.getAttribute('href') || '') || fiberSessionId(el);
      if (!id) continue;
      var title = (el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim();
      push(id, title);
    }

    var side = document.querySelector('[data-testid="sidebar-content"], [data-testid="sidebar-base-card"]');
    if (side) {
      var rows = side.querySelectorAll('[role="button"], button, a, [data-session-id]');
      for (i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.closest('.mavis-message-input-card')) continue;
        var blob = labelOf(row);
        if (/^new\s*task$|^sign\s*in$|^plugins|^connect mobile|^download/i.test(blob)) continue;
        var rid = row.getAttribute('data-session-id') || idFromHref(row.getAttribute('href') || '') || fiberSessionId(row);
        if (!rid) continue;
        push(rid, blob);
      }
    }
    return items;
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: Object.assign(
        { Accept: 'application/json', 'Content-Type': 'application/json' },
        opts.headers || {}
      ),
      body: opts.body
    });
  }

  async function tryApiJson(path, opts) {
    var res = await apiFetch(path, opts);
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', path + ' ' + res.status);
    if (res.status === 404) return { ok: false, status: 404, data: null };
    var text = '';
    try {
      text = await res.text();
    } catch (e) {
      text = '';
    }
    var data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e2) {
      data = null;
    }
    if (!res.ok) {
      var msg = (data && (data.error || data.message || (data.base_resp && data.base_resp.status_msg))) || text;
      if (/invalid signature/i.test(String(msg))) {
        return { ok: false, status: res.status, data: null, unsigned: true };
      }
      return { ok: false, status: res.status, data: data, error: String(msg || res.status).slice(0, 200) };
    }
    return { ok: true, status: res.status, data: data };
  }

  function unwrapList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    var keys = ['sessions', 'session_list', 'list', 'items', 'data', 'history', 'chats', 'tasks'];
    var i;
    for (i = 0; i < keys.length; i++) {
      var v = data[keys[i]];
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.list)) return v.list;
      if (v && Array.isArray(v.sessions)) return v.sessions;
    }
    return [];
  }

  function unwrapMessages(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    var keys = ['messages', 'message_list', 'history', 'turns', 'items', 'data', 'records'];
    var i;
    for (i = 0; i < keys.length; i++) {
      var v = data[keys[i]];
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.messages)) return v.messages;
      if (v && Array.isArray(v.list)) return v.list;
    }
    if (data.session && Array.isArray(data.session.messages)) return data.session.messages;
    return [];
  }

  function mapApiMessages(messages, fallbackModel) {
    var out = [];
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (!m) continue;
      var role = String(m.role || m.sender || m.type || '').toLowerCase();
      if (role === 'human' || role === 'query') role = 'user';
      if (role === 'bot' || role === 'agent' || role === 'ai' || role === 'model') role = 'assistant';
      if (role !== 'user' && role !== 'assistant') continue;
      var text = '';
      if (typeof m.content === 'string') text = m.content;
      else if (typeof m.text === 'string') text = m.text;
      else if (typeof m.message === 'string') text = m.message;
      else if (Array.isArray(m.content)) {
        text = m.content
          .map(function (p) {
            if (!p) return '';
            if (typeof p === 'string') return p;
            return p.text || p.content || '';
          })
          .filter(Boolean)
          .join('\n\n');
      }
      text = String(text || '').trim();
      if (!text) continue;
      var model = m.model || m.model_name || fallbackModel || '';
      out.push({
        role: role,
        roleTag: role === 'user' ? 'user' : CE.modelFenceTag ? CE.modelFenceTag(model, 'minimax') : 'minimax',
        text: text,
        links: []
      });
    }
    return out;
  }

  async function listFromApi(args) {
    var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
    var tried = await tryApiJson(API_BASE + '/session/list');
    if (tried.unsigned) return null;
    if (!tried.ok) {
      if (tried.status === 401 || tried.status === 403) rpcErr('UNAUTHORIZED', 'list ' + tried.status);
      return null;
    }
    var raw = unwrapList(tried.data);
    var items = [];
    var i;
    for (i = 0; i < raw.length && items.length < limit; i++) {
      var chat = toChat(raw[i]);
      if (!chat.chatId) continue;
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
      items.push(chat);
    }
    return { items: items, nextCursor: null };
  }

  async function loadChatFromApi(chatId) {
    var paths = [
      API_BASE + '/session/history?session_id=' + encodeURIComponent(chatId),
      API_BASE + '/session/detail?session_id=' + encodeURIComponent(chatId),
      API_BASE + '/session/info?session_id=' + encodeURIComponent(chatId)
    ];
    var i;
    for (i = 0; i < paths.length; i++) {
      var tried = await tryApiJson(paths[i]);
      if (tried.unsigned) return null;
      if (tried.status === 404) continue;
      if (!tried.ok) {
        if (tried.status === 401 || tried.status === 403) rpcErr('UNAUTHORIZED', 'get ' + tried.status);
        continue;
      }
      var messages = mapApiMessages(unwrapMessages(tried.data), findModel());
      var title =
        (tried.data && (tried.data.title || (tried.data.session && tried.data.session.title))) || findTitle();
      return {
        platform: 'minimax',
        url: chatUrl(chatId),
        title: title || '',
        chatId: chatId,
        model: findModel(),
        userName: '',
        userHandle: '',
        userEmail: '',
        messages: messages
      };
    }
    return null;
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId) return;
    var path = '/?chatID=' + encodeURIComponent(chatId);
    if (Ops.softNavigate) Ops.softNavigate(path);
    else location.assign(path);
    await Ops.waitFor(
      function () {
        return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
      },
      { timeoutMs: 30000, message: 'MiniMax navigate timeout' }
    );
  }

  async function ensureNewTask() {
    if (!currentChatId() && visible(findComposerInput())) return;
    var neu = findNewTaskButton();
    if (neu && visible(neu)) {
      if (Ops.clickEl) Ops.clickEl(neu);
      else neu.click();
    } else if (Ops.softNavigate) {
      Ops.softNavigate('/');
    } else {
      location.assign('/');
    }
    await Ops.waitFor(
      function () {
        return !currentChatId() && visible(findComposerInput()) ? true : null;
      },
      { timeoutMs: 20000, message: 'MiniMax new task timeout' }
    );
  }

  async function fillComposer(text) {
    var input = await Ops.waitFor(
      function () {
        var el = findComposerInput();
        return el && visible(el) ? el : null;
      },
      { timeoutMs: 15000, message: 'MiniMax composer timeout' }
    );
    if (Ops.fillRichComposer) await Ops.fillRichComposer(input, text);
    else if (Ops.fillEditable) Ops.fillEditable(input, text);
    else {
      input.textContent = text;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    }
    await Ops.sleep(120);
    return input;
  }

  function sendEnabled(btn) {
    if (!btn || !visible(btn)) return false;
    if (btn.disabled) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    if (btn.getAttribute('tabindex') === '-1' && /inactive|disabled|not-allowed/i.test(String(btn.className || ''))) {
      return false;
    }
    return true;
  }

  async function submitComposer(text) {
    var before = turnCount();
    var input = await fillComposer(text);
    var send = await Ops.waitFor(
      function () {
        var btn = findSendButton();
        return sendEnabled(btn) ? btn : null;
      },
      { timeoutMs: 20000, message: 'MiniMax send enable timeout' }
    );
    if (Ops.ensureComposerSubmitted) {
      await Ops.ensureComposerSubmitted({
        send: send,
        input: input,
        message: 'MiniMax submit failed',
        isDone: function () {
          if (isGenerating()) return true;
          if (turnCount() > before) return true;
          if (currentChatId()) return true;
          return null;
        }
      });
    } else if (Ops.clickEl) {
      Ops.clickEl(send);
    } else {
      send.click();
    }
    return before;
  }

  async function waitForReply(turnsBefore) {
    await Ops.waitFor(
      function () {
        if (isGenerating()) return null;
        if (turnCount() > turnsBefore) return true;
        if (currentChatId() && turnsBefore === 0) return true;
        return null;
      },
      { timeoutMs: 180000, message: 'MiniMax reply timeout' }
    );
  }

  async function waitForChatId(timeoutMs) {
    return Ops.waitFor(
      function () {
        var id = currentChatId();
        return id ? id : null;
      },
      { timeoutMs: timeoutMs || 120000, message: 'MiniMax chatId timeout' }
    );
  }

  async function getFromDom(chatId, ctx) {
    if (chatId && currentChatId() !== chatId) await navigateToChat(chatId);
    if (ctx && typeof ctx.getData === 'function') {
      var live = await ctx.getData();
      return Object.assign(
        {
          platform: 'minimax',
          url: location.href,
          chatId: chatId || currentChatId(),
          title: findTitle(),
          model: findModel()
        },
        live || {}
      );
    }
    var assistantTag = CE.modelFenceTag ? CE.modelFenceTag(findModel(), 'minimax') : 'minimax';
    var turns = turnNodes();
    var messages = [];
    var i;
    for (i = 0; i < turns.length; i++) {
      var msg = captureTurn(turns[i], assistantTag);
      if (msg) messages.push(msg);
    }
    return {
      platform: 'minimax',
      url: chatUrl(chatId || currentChatId()),
      title: findTitle(),
      chatId: chatId || currentChatId(),
      model: findModel(),
      userName: '',
      userHandle: '',
      userEmail: '',
      messages: messages
    };
  }

  function exportDataFromPage() {
    var chatId = currentChatId();
    if (!chatId) return Promise.resolve(null);
    return loadChatFromApi(chatId).then(function (api) {
      if (api && api.messages && api.messages.length) return api;
      return getFromDom(chatId, null);
    });
  }

  async function detectCapabilities() {
    var models = [];
    var cfg = await tryApiJson(API_BASE + '/config');
    if (cfg && cfg.ok && cfg.data && Array.isArray(cfg.data.models)) {
      var i;
      for (i = 0; i < cfg.data.models.length; i++) {
        var row = cfg.data.models[i];
        if (!row) continue;
        var id = row.model_id || row.id || row.display_name;
        if (!id) continue;
        models.push({
          id: Ops.normalizeId ? Ops.normalizeId(id) : id,
          label: row.display_name || row.model_id || id,
          kind: 'model'
        });
      }
    }
    var cur = findModel();
    if (!models.length && cur) {
      models.push({ id: Ops.normalizeId ? Ops.normalizeId(cur) : cur, label: cur, kind: 'model' });
    }
    if (!models.length) {
      models.push({ id: 'default', label: 'Default', kind: 'model' });
    }
    var attach = document.querySelector('[data-testid="attach-button"], [aria-label="Add attachment"]');
    return {
      platform: 'minimax',
      projectsSupported: false,
      models: models,
      modes: [{ id: 'agent', label: 'Agent', kind: 'mode' }],
      toggles: [],
      tools: [],
      attach: {
        supported: !!attach,
        multiple: true,
        accept: []
      },
      current: {
        model: cur
          ? Ops.normalizeId
            ? Ops.normalizeId(cur)
            : cur
          : models[0] && models[0].id,
        mode: 'agent',
        toggles: []
      },
      detectedAt: new Date().toISOString()
    };
  }

  function capabilitiesCacheKey() {
    return findModel() + '|' + (signedOut() ? 'out' : 'in') + '|' + document.documentElement.className;
  }

  async function deleteViaApi(chatId) {
    var tried = await tryApiJson(API_BASE + '/session/' + encodeURIComponent(chatId), { method: 'DELETE' });
    if (tried.unsigned) return false;
    if (tried.status === 404) rpcErr('NOT_FOUND', 'session not found: ' + chatId);
    if (tried.status === 401 || tried.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + tried.status);
    return !!(tried.ok);
  }

  async function deleteViaUi(chatId) {
    var nodes = document.querySelectorAll(
      '[data-session-id], a[href*="chatID="], a[href*="chatId="], [role="button"]'
    );
    var target = null;
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var id = el.getAttribute('data-session-id') || idFromHref(el.getAttribute('href') || '') || fiberSessionId(el);
      if (id === chatId) {
        target = el;
        break;
      }
    }
    if (!target) return false;
    if (Ops.clickEl) Ops.clickEl(target);
    else target.click();
    await Ops.sleep(200);
    var more =
      target.querySelector('button[aria-label*="More" i], button[aria-label*="menu" i], [aria-haspopup="menu"]') ||
      (target.parentElement &&
        target.parentElement.querySelector('button[aria-label*="More" i], [aria-haspopup="menu"]'));
    if (more) {
      if (Ops.clickEl) Ops.clickEl(more);
      else more.click();
      await Ops.sleep(200);
    }
    var del = null;
    var items = document.querySelectorAll('[role="menuitem"], button, [role="option"]');
    for (i = 0; i < items.length; i++) {
      if (/delete|remove|archive|удал|архив/i.test(labelOf(items[i]))) {
        del = items[i];
        break;
      }
    }
    if (!del) return false;
    if (Ops.clickEl) Ops.clickEl(del);
    else del.click();
    await Ops.sleep(400);
    var confirm = null;
    var dialogs = document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button');
    for (i = 0; i < dialogs.length; i++) {
      if (/delete|remove|confirm|удал|подтвер/i.test(labelOf(dialogs[i]))) {
        confirm = dialogs[i];
        break;
      }
    }
    if (confirm) {
      if (Ops.clickEl) Ops.clickEl(confirm);
      else confirm.click();
      await Ops.sleep(300);
    }
    return true;
  }

  CE.definePlatform({
    id: 'minimax',
    modifier: 'minimax',
    fenceTag: 'minimax',
    exportData: exportDataFromPage,
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
        '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="chat-export-dl-icon">' +
        '<path d="M10 2.75a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.5A.75.75 0 0 1 10 2.75z"/>' +
        '<path d="M3.75 14.5a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75z"/>' +
        '</svg>'
      );
    },
    ops: {
      list: async function (args) {
        try {
          requireAuth();
          var api = await listFromApi(args);
          if (api) return api;
          var domItems = listFromDom(args && args.query).slice(
            0,
            Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20
          );
          return { items: domItems, nextCursor: null };
        } catch (err) {
          hostErr(err);
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            chatId = currentChatId();
            if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          }
          requireAuth();
          try {
            var api = await loadChatFromApi(chatId);
            if (api && api.messages && api.messages.length) return api;
          } catch (apiErr) {
            if (apiErr && (apiErr.code === 'UNAUTHORIZED' || apiErr.code === 'NOT_FOUND')) throw apiErr;
          }
          return await getFromDom(chatId, ctx);
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
          requireAuth();
          await navigateToChat(chatId);
          await waitForIdle();
          var before = turnCount();
          await submitComposer(text);
          await waitForReply(before);
          return {
            platform: 'minimax',
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
          requireAuth();
          await ensureNewTask();
          await waitForIdle();
          var before = turnCount();
          await submitComposer(text);
          var chatId = await waitForChatId(120000);
          await waitForReply(before);
          return {
            platform: 'minimax',
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
          requireAuth();
          var viaApi = false;
          try {
            viaApi = await deleteViaApi(chatId);
          } catch (apiErr) {
            if (apiErr && (apiErr.code === 'UNAUTHORIZED' || apiErr.code === 'NOT_FOUND')) throw apiErr;
          }
          if (viaApi) return { deleted: true, chatId: chatId };
          var viaUi = await deleteViaUi(chatId);
          if (viaUi) return { deleted: true, chatId: chatId };
          rpcErr('HOST_ERROR', 'MiniMax delete unavailable (signed API/UI)');
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
