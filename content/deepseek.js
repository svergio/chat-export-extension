(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var capsCache = { key: '', data: null };

  function rpcErr(code, message) {
    throw new CE.RpcError(code, message);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function currentChatId() {
    var m = location.pathname.match(/\/a\/chat\/s\/([^/]+)/);
    return m ? m[1] : '';
  }

  function chatUrl(id) {
    return location.origin + '/a/chat/s/' + id;
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 12 && r.height > 12;
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function findComposerInput() {
    var nodes = document.querySelectorAll(
      'textarea.ds-scroll-area, textarea.ds-textarea__textarea, textarea[placeholder*="DeepSeek" i], textarea'
    );
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (visible(nodes[i])) return nodes[i];
    }
    return null;
  }

  function composerActionNodes(scope) {
    return scope.querySelectorAll('button, [role="button"], .ds-button');
  }

  function findSendButton() {
    var input = findComposerInput();
    if (!input) return null;
    var shell = input.closest('._77cefa5, ._9996a53, [class*="ds-textarea"]') || input.parentElement;
    var scope = shell && shell.parentElement ? shell.parentElement : document;
    var btns = composerActionNodes(scope);
    var i;
    var best = null;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      if (btns[i].closest('[data-chat-export], .chat-export-fmt, .chat-export-dl, .chat-export-menu')) continue;
      var cls = String(btns[i].className || '');
      var blob = labelOf(btns[i]);
      if (/отправ|send|submit/i.test(blob)) return btns[i];
      if (/\bds-button--primary\b/.test(cls) && /\bds-button--circle\b/.test(cls)) return btns[i];
      if (!best && /\bds-button--primary\b/.test(cls)) best = btns[i];
      if (!best && btns[i].querySelector('svg')) best = btns[i];
    }
    return best;
  }

  function findStopButton() {
    var scope = document;
    var input = findComposerInput();
    if (input) {
      var shell = input.closest('._77cefa5, ._9996a53, [class*="ds-textarea"]');
      if (shell && shell.parentElement) scope = shell.parentElement;
    }
    var btns = composerActionNodes(scope);
    var i;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      if (btns[i].closest('[data-chat-export], .chat-export-fmt, .chat-export-dl, .chat-export-menu')) continue;
      var blob = labelOf(btns[i]);
      if (/stop|останов|прерв/i.test(blob)) return btns[i];
    }
    return null;
  }

  function findModeToggleRow() {
    var toggles = document.querySelectorAll('.ds-toggle-button');
    if (!toggles.length) return null;
    var last = null;
    var i;
    for (i = 0; i < toggles.length; i++) {
      if (visible(toggles[i])) last = toggles[i];
    }
    if (!last) return null;
    return last.closest('.ec4f5d61') || last.parentElement;
  }

  function findComposerToolbar() {
    var input = findComposerInput();
    if (!input) return null;
    var modeRow = findModeToggleRow();
    var send = findSendButton();
    if (modeRow) {
      var toggles = modeRow.querySelectorAll('.ds-toggle-button');
      var anchor = toggles.length ? toggles[toggles.length - 1] : modeRow.lastElementChild;
      return {
        el: modeRow,
        insertAfter: anchor,
        nativeFrom: anchor,
        nativeIconFrom: send || anchor
      };
    }
    var shell = input.parentElement;
    var barRow = shell && shell.parentElement;
    if (barRow) {
      return {
        el: barRow,
        insertAfter: shell,
        beforeChild: send,
        nativeFrom: send || shell,
        nativeIconFrom: send
      };
    }
    return null;
  }

  function active() {
    if (/sign_in|sign_up|forgot_password/i.test(location.pathname)) return false;
    return !!findComposerInput() || !!currentChatId();
  }

  function findTitle() {
    var id = currentChatId();
    if (id) {
      var links = document.querySelectorAll('a[href*="/a/chat/s/"]');
      var i;
      for (i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href') || '';
        if (href.indexOf(id) >= 0) {
          var t = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (t && t.length < 200) return t;
        }
      }
    }
    var t = document.title || '';
    t = t.replace(/\s*-\s*DeepSeek.*$/i, '').trim();
    return t || 'chat';
  }

  function findModel() {
    var pills = findModePillButtons();
    var i;
    for (i = 0; i < pills.length; i++) {
      var blob = labelOf(pills[i]);
      if (/deepseek|v3|r1|model/i.test(blob) && !/deepthink|search/i.test(blob)) {
        return blob.slice(0, 80);
      }
    }
    return '';
  }

  function findUserMeta() {
    return { userName: '', userHandle: '', userEmail: '' };
  }

  function liveScroller() {
    var nodes = document.querySelectorAll('.ds-scroll-area');
    var i;
    for (i = nodes.length - 1; i >= 0; i--) {
      if (visible(nodes[i]) && nodes[i].scrollHeight > nodes[i].clientHeight + 40) return nodes[i];
    }
    var first = document.querySelector('.ds-message');
    if (first && CE.findOverflowScroller) return CE.findOverflowScroller(first);
    return nodes[0] || null;
  }

  function turnNodes() {
    var marked = document.querySelectorAll('.ds-message');
    if (marked.length) return marked;
    return document.querySelectorAll('[class*="ds-assistant-message"], [data-message-id]');
  }

  function turnKey(turn) {
    if (!turn) return '';
    var idx = turn.getAttribute('data-ce-turn');
    if (idx) return String(idx);
    var text = (turn.innerText || '').slice(0, 120);
    return String(turnNodes().length) + ':' + text;
  }

  function thinkTextFromDom(turn) {
    var nodes = turn.querySelectorAll('.ds-think-content');
    var parts = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      var t = (nodes[i].innerText || nodes[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (t) parts.push(t);
    }
    return parts.join('\n\n');
  }

  function roleOfTurn(turn) {
    if (turn.querySelector('.ds-assistant-message-main-content, .ds-markdown, .ds-think-content')) {
      return 'assistant';
    }
    return 'user';
  }

  function messageFromTurn(turn) {
    try {
      var role = roleOfTurn(turn);
      if (role === 'user') {
        var clone = turn.cloneNode(true);
        var rm = clone.querySelectorAll('.ds-assistant-message-main-content, .ds-think-content, .ds-markdown');
        var ri;
        for (ri = 0; ri < rm.length; ri++) rm[ri].remove();
        var ut = (clone.innerText || clone.textContent || '').trim();
        if (!ut) return null;
        return { role: 'user', roleTag: 'user', text: ut, links: CE.collectLinks(clone) };
      }
      var think = thinkTextFromDom(turn);
      var body =
        turn.querySelector('.ds-assistant-message-main-content') ||
        turn.querySelector('.ds-markdown') ||
        turn;
      var md = '';
      try {
        md = CE.htmlToMarkdown(body);
      } catch (e) {}
      if (!md) md = (body.innerText || body.textContent || '').trim();
      if (!md && !think) return null;
      if (think) {
        md = (md ? '### DeepThink\n\n' + think + '\n\n' + md : '### DeepThink\n\n' + think).trim();
      }
      return {
        role: 'assistant',
        roleTag: CE.modelFenceTag ? CE.modelFenceTag(findModel(), 'deepseek') : 'deepseek',
        text: md,
        links: CE.collectLinks(body),
        thinkingChars: think ? think.length : 0
      };
    } catch (err) {
      console.error('[chat-export]', err);
      return null;
    }
  }

  function isGenerating() {
    if (findStopButton()) return true;
    return !!Ops.findStopControl && !!Ops.findStopControl(document);
  }

  async function waitForIdle() {
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: 180000, message: 'DeepSeek idle timeout' }
    );
  }

  function bearerToken() {
    try {
      var raw = localStorage.getItem('userToken');
      if (!raw) return '';
      try {
        var p = JSON.parse(raw);
        return String((p && (p.token || p.value || p.accessToken)) || '').trim();
      } catch (e) {
        return String(raw).trim();
      }
    } catch (e2) {
      return '';
    }
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var url = path.indexOf('/api/') === 0 ? path : '/api/v0' + path;
    var token = bearerToken();
    var headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(url, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: headers,
      body: opts.body
    });
  }

  async function readBiz(res, what) {
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', what + ' ' + res.status);
    var json;
    try {
      json = await res.json();
    } catch (e) {
      rpcErr('HOST_ERROR', what + ' invalid json ' + res.status);
    }
    if (json && json.code && json.data == null) {
      if (String(json.msg || '').toUpperCase().indexOf('TOKEN') >= 0) {
        rpcErr('UNAUTHORIZED', what + ' ' + (json.msg || 'token'));
      }
      rpcErr('HOST_ERROR', what + ' ' + (json.msg || json.code));
    }
    var envelope = json && json.data;
    if (!envelope) {
      if (!res.ok) await failFromResponse(res, what);
      return json;
    }
    if (envelope.biz_code !== 0) {
      var msg = envelope.biz_msg || 'biz ' + envelope.biz_code;
      if (res.status === 401 || res.status === 403 || envelope.biz_code === 401) {
        rpcErr('UNAUTHORIZED', msg);
      }
      rpcErr('HOST_ERROR', what + ' ' + msg);
    }
    return envelope.biz_data;
  }

  async function failFromResponse(res, what) {
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', what + ' ' + res.status);
    if (res.status === 404) rpcErr('NOT_FOUND', what + ' not found');
    if (res.status === 429) rpcErr('RATE_LIMIT', what + ' rate limited');
    var body = '';
    try {
      body = (await res.text()).slice(0, 160);
    } catch (e) {}
    rpcErr('HOST_ERROR', what + ' ' + res.status + ' ' + body);
  }

  function parseListCursor(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(String(raw));
    } catch (e) {
      return null;
    }
  }

  function encodeListCursor(obj) {
    return JSON.stringify(obj);
  }

  function toListChat(row) {
    return {
      platform: 'deepseek',
      chatId: String(row.id),
      title: row.title || '',
      url: chatUrl(row.id),
      updatedAt: row.updated_at != null ? Ops.toIso(row.updated_at * 1000) : null,
      createdAt: null
    };
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href*="/a/chat/s/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/a\/chat\/s\/([^/?#]+)/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = 1;
      var title = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
      var chat = {
        platform: 'deepseek',
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

  function fragmentContent(frag) {
    if (!frag) return '';
    var c = frag.content;
    if (c == null) return '';
    if (typeof c === 'string') return c.trim();
    if (typeof c === 'object') {
      if (typeof c.text === 'string') return c.text.trim();
      if (typeof c.content === 'string') return c.content.trim();
    }
    return '';
  }

  function fragmentsByType(frags, type) {
    var out = [];
    var i;
    for (i = 0; i < (frags || []).length; i++) {
      if (frags[i] && String(frags[i].type || '').toUpperCase() === type) out.push(frags[i]);
    }
    return out;
  }

  function mapApiMessage(msg, modelName) {
    var role = String(msg.message_role || msg.role || '').toUpperCase();
    var frags = msg.fragments || [];
    if (role === 'USER' || role === 'HUMAN') {
      var req = fragmentsByType(frags, 'REQUEST');
      var text = req.length ? fragmentContent(req[0]) : '';
      if (!text) text = fragmentContent(frags[0]);
      if (!text) return null;
      return { role: 'user', roleTag: 'user', text: text, links: [] };
    }
    if (role !== 'ASSISTANT') return null;
    var thinkParts = [];
    var thinks = fragmentsByType(frags, 'THINK');
    var ti;
    for (ti = 0; ti < thinks.length; ti++) {
      var th = fragmentContent(thinks[ti]);
      if (th) thinkParts.push(th);
    }
    var bodyParts = [];
    var types = ['RESPONSE', 'TEMPLATE_RESPONSE'];
    var t;
    for (t = 0; t < types.length; t++) {
      var rows = fragmentsByType(frags, types[t]);
      var ri;
      for (ri = 0; ri < rows.length; ri++) {
        var bt = fragmentContent(rows[ri]);
        if (bt) bodyParts.push(bt);
      }
    }
    var answer = bodyParts.join('\n\n').trim();
    if (!answer && !thinkParts.length) return null;
    if (thinkParts.length) {
      answer = (answer ? '### DeepThink\n\n' + thinkParts.join('\n\n') + '\n\n' + answer : '### DeepThink\n\n' + thinkParts.join('\n\n')).trim();
    }
    var row = {
      role: 'assistant',
      roleTag: CE.modelFenceTag ? CE.modelFenceTag(modelName, 'deepseek') : 'deepseek',
      text: answer,
      links: []
    };
    if (thinkParts.length) row.thinkingChars = thinkParts.join('\n\n').length;
    return row;
  }

  function orderedBranch(messages, leafId) {
    var byId = {};
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (m && m.message_id) byId[m.message_id] = m;
    }
    var chain = [];
    var cur = leafId;
    var guard = 0;
    while (cur && byId[cur] && guard++ < 5000) {
      chain.push(byId[cur]);
      cur = byId[cur].parent_id || byId[cur].parent_message_id || '';
    }
    chain.reverse();
    return chain;
  }

  function mapHistoryMessages(data) {
    var session = (data && data.chat_session) || {};
    var messages = (data && data.chat_messages) || [];
    var leaf =
      session.current_message_id ||
      (messages.length ? messages[messages.length - 1].message_id : '');
    var branch = orderedBranch(messages, leaf);
    var modelName = session.model_type || '';
    var out = [];
    for (var i = 0; i < branch.length; i++) {
      var row = mapApiMessage(branch[i], modelName);
      if (row) out.push(row);
    }
    return {
      title: session.title || findTitle(),
      chatId: session.id || '',
      model: modelName,
      messages: out
    };
  }

  async function fetchHistory(chatId) {
    var qs = new URLSearchParams({ chat_session_id: chatId });
    var res = await apiFetch('/chat/history_messages?' + qs.toString());
    var data = await readBiz(res, 'get');
    if (!data || !data.chat_messages) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
    return mapHistoryMessages(data);
  }

  async function sessionUser() {
    try {
      var res = await apiFetch('/users');
      if (!res.ok) return findUserMeta();
      var data = await readBiz(res, 'users');
      var u = (data && data.user) || data || {};
      return {
        userName: u.nickname || u.user_name || u.name || '',
        userHandle: u.user_id != null ? String(u.user_id) : '',
        userEmail: u.email || ''
      };
    } catch (e) {
      return findUserMeta();
    }
  }

  function capabilitiesCacheKey() {
    return (findModel() || '') + '|' + location.pathname;
  }

  async function detectCapabilities() {
    var models = [];
    try {
      var res = await apiFetch('/client/settings');
      if (res.ok) {
        var data = await readBiz(res, 'settings');
        var features = (data && data.features) || (data && data.client_features) || [];
        var i;
        for (i = 0; i < features.length; i++) {
          if (features[i] && features[i].name === 'model_configs' && Array.isArray(features[i].value)) {
            var cfgs = features[i].value;
            var j;
            for (j = 0; j < cfgs.length; j++) {
              if (cfgs[j] && cfgs[j].enabled !== false && cfgs[j].model_type) {
                models.push({ id: String(cfgs[j].model_type), label: String(cfgs[j].model_type) });
              }
            }
          }
        }
      }
    } catch (e) {}
    return {
      platform: 'deepseek',
      projectsSupported: false,
      models: models,
      modes: [
        { id: 'deepthink', label: 'DeepThink', kind: 'toggle' },
        { id: 'search', label: 'Search', kind: 'toggle' }
      ],
      tools: [],
      attach: { supported: false, multiple: false, accept: [] }
    };
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId && visible(findComposerInput())) return;
    var path = '/a/chat/s/' + chatId;
    var target = location.origin + path;
    if (Ops.softNavigate) Ops.softNavigate(path);
    else {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    var softOk = false;
    try {
      await Ops.waitFor(
        function () {
          return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 4000, message: 'DeepSeek soft navigate timeout' }
      );
      softOk = location.pathname.indexOf('/a/chat/s/' + chatId) === 0;
    } catch (e) {}
    if (!softOk) {
      location.assign(target);
      await Ops.waitFor(
        function () {
          return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 30000, message: 'DeepSeek navigate timeout' }
      );
    }
  }

  async function submitComposer(text) {
    var ta = findComposerInput();
    if (!ta) rpcErr('HOST_ERROR', 'composer not found');
    if (Ops.fillEditable) Ops.fillEditable(ta, text);
    else {
      ta.focus();
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var send = findSendButton();
    if (send && !send.disabled) {
      send.click();
      return;
    }
    ta.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
    );
  }

  function findNewChatControl() {
    var nodes = document.querySelectorAll('button, [role="button"], a, [tabindex]');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!visible(nodes[i])) continue;
      var blob = labelOf(nodes[i]);
      if (/^новый чат$|^new chat$/i.test(blob)) return nodes[i];
    }
    return null;
  }

  async function ensureHomeComposer() {
    if (location.pathname === '/' && visible(findComposerInput()) && !currentChatId()) return;
    var neu = findNewChatControl();
    if (neu) neu.click();
    else if (Ops.softNavigate) Ops.softNavigate('/');
    else {
      history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    try {
      await Ops.waitFor(
        function () {
          return location.pathname === '/' && visible(findComposerInput()) && !currentChatId() ? true : null;
        },
        { timeoutMs: 8000, message: 'DeepSeek home soft timeout' }
      );
      return;
    } catch (e) {}
    // Hard nav is last resort: it drops the extension message port mid-RPC.
    location.assign(location.origin + '/');
    await Ops.waitFor(
      function () {
        return location.pathname === '/' && visible(findComposerInput()) ? true : null;
      },
      { timeoutMs: 30000, message: 'DeepSeek home timeout' }
    );
  }

  function turnCount() {
    return turnNodes().length;
  }

  async function waitForReply(beforeTurns) {
    await Ops.waitFor(
      function () {
        if (isGenerating()) return null;
        if (turnCount() > beforeTurns) return true;
        return null;
      },
      { timeoutMs: 180000, message: 'DeepSeek reply timeout' }
    );
    await waitForIdle();
  }

  async function exportDataFromApi() {
    var chatId = currentChatId();
    if (!chatId) return null;
    try {
      var hist = await fetchHistory(chatId);
      if (!hist.messages || !hist.messages.length) return null;
      var u = await sessionUser();
      return {
        title: hist.title || findTitle(),
        chatId: chatId,
        model: hist.model || findModel(),
        userName: u.userName,
        userHandle: u.userHandle,
        userEmail: u.userEmail,
        messages: hist.messages
      };
    } catch (e) {
      return null;
    }
  }

  async function getChatPayload(chatId) {
    var hist = await fetchHistory(chatId);
    var u = await sessionUser();
    return {
      platform: 'deepseek',
      url: chatId === currentChatId() ? location.href : chatUrl(chatId),
      chatId: chatId,
      title: hist.title || '',
      model: hist.model || '',
      userName: u.userName,
      userHandle: u.userHandle,
      userEmail: u.userEmail,
      messages: hist.messages
    };
  }

  async function createSession() {
    var res = await apiFetch('/chat_session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    var data = await readBiz(res, 'create');
    var session = (data && data.chat_session) || (data && data.session) || data;
    if (!session || !session.id) rpcErr('HOST_ERROR', 'create session id missing');
    return String(session.id);
  }

  CE.definePlatform({
    id: 'deepseek',
    modifier: 'deepseek',
    fenceTag: 'deepseek',
    composer: findComposerToolbar,
    active: active,
    exportData: exportDataFromApi,
    chatId: currentChatId,
    title: findTitle,
    model: findModel,
    user: findUserMeta,
    scroller: liveScroller,
    turns: turnNodes,
    turnKey: turnKey,
    capture: messageFromTurn,
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit(args && args.limit);
          var cursor = parseListCursor(args && args.cursor);
          var query = {
            count: String(Math.max(limit, 20))
          };
          if (cursor && cursor.mode === 'lte') {
            query['lte_cursor.pinned'] = cursor.pinned ? 'true' : 'false';
            query['lte_cursor.updated_at'] = String(cursor.updated_at != null ? cursor.updated_at : 0);
          } else {
            query['gte_cursor.pinned'] = cursor && cursor.pinned ? 'true' : 'false';
            query['gte_cursor.updated_at'] = String(
              cursor && cursor.updated_at != null ? cursor.updated_at : 0
            );
          }
          var qs = new URLSearchParams(query);
          var res = await apiFetch('/chat_session/fetch_page?' + qs.toString());
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
          var data = await readBiz(res, 'list');
          var raw = (data && data.chat_sessions) || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            if (!raw[i] || !raw[i].id) continue;
            var chat = toListChat(raw[i]);
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          var nextCursor = null;
          if (data && data.has_more && raw.length) {
            var last = raw[raw.length - 1];
            nextCursor = encodeListCursor({
              pinned: !!last.pinned,
              updated_at: last.updated_at,
              mode: 'lte'
            });
          }
          return { items: items, nextCursor: nextCursor };
        } catch (err) {
          if (err && err.code && err.code !== 'HOST_ERROR') throw err;
          var domItems = listFromDom(args && args.query).slice(0, Ops.clampLimit(args && args.limit));
          return { items: domItems, nextCursor: null };
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            var exported = await exportDataFromApi();
            if (exported && exported.messages && exported.messages.length) {
              return Object.assign({ platform: 'deepseek', url: location.href }, exported);
            }
            if (ctx && typeof ctx.getData === 'function') {
              var live = await ctx.getData();
              return Object.assign({ platform: 'deepseek', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          try {
            return await getChatPayload(chatId);
          } catch (apiErr) {
            if (apiErr && apiErr.code === 'NOT_FOUND') throw apiErr;
            if (apiErr && apiErr.code === 'UNAUTHORIZED') throw apiErr;
            if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
              var onPage = await ctx.getData();
              return Object.assign({ platform: 'deepseek', url: location.href, chatId: chatId }, onPage || {});
            }
            throw apiErr;
          }
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
          await submitComposer(text);
          await waitForReply(before);
          return {
            platform: 'deepseek',
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
          // Home composer owns session creation; soft-nav to /a/chat/s/:id often bounces back to /
          await ensureHomeComposer();
          await waitForIdle();
          var before = turnCount();
          await submitComposer(text);
          await waitForReply(before);
          await Ops.waitFor(
            function () {
              return currentChatId() || null;
            },
            { timeoutMs: 30000, message: 'DeepSeek chat id timeout' }
          );
          var chatId = currentChatId();
          return {
            platform: 'deepseek',
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
          var res = await apiFetch('/chat_session/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_session_ids: [chatId] })
          });
          await readBiz(res, 'delete');
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
