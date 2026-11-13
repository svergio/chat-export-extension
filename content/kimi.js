(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var capsCache = { key: '', data: null };
  var gatewayCache = { listPath: '', deletePath: '', probed: false };

  function rpcErr(code, message, details) {
    throw new CE.RpcError(code, message, details);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function currentChatId() {
    var m = location.pathname.match(/\/chat\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function chatUrl(id) {
    return location.origin + '/chat/' + encodeURIComponent(id);
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8;
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function findComposerInput() {
    var nodes = document.querySelectorAll(
      '.chat-input-editor[contenteditable="true"], .chat-input-editor[contenteditable], .chat-input-editor, [contenteditable="true"][role="textbox"]'
    );
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (visible(nodes[i])) return nodes[i];
    }
    return nodes[0] || null;
  }

  function composerShell(input) {
    if (!input) return null;
    return (
      input.closest('.chat-input') ||
      input.closest('[class*="chat-input"]') ||
      input.closest('form') ||
      input.parentElement
    );
  }

  function actionButtons(scope) {
    return (scope || document).querySelectorAll('button, [role="button"]');
  }

  function findSendButton() {
    var action = document.querySelector('.chat-editor-action');
    var sendBox =
      (action && action.querySelector('.send-button-container')) ||
      document.querySelector('.chat-editor-action .send-button-container, .send-button-container');
    if (sendBox && visible(sendBox)) return sendBox;
    var input = findComposerInput();
    var shell = composerShell(input);
    var scope = (action && action.parentElement) || shell || document;
    var btns = actionButtons(scope);
    var i;
    var best = null;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      if (btns[i].closest('[data-chat-export], .chat-export-fmt, .chat-export-dl, .chat-export-menu')) continue;
      var blob = labelOf(btns[i]);
      var cls = String(btns[i].className || '');
      if (/stop|останов|прерв|cancel/i.test(blob)) continue;
      if (/отправ|send|submit/i.test(blob)) return btns[i];
      if (/\bsend\b/i.test(cls) || /send-button|submit-button/i.test(cls)) return btns[i];
      if (!best && /primary|solid/i.test(cls) && btns[i].querySelector('svg')) best = btns[i];
      if (!best && btns[i].querySelector('svg') && shell && shell.contains(btns[i])) best = btns[i];
    }
    return best;
  }

  function findModelChip(scope) {
    var root = scope || document;
    var chip = root.querySelector('.current-model');
    if (chip && visible(chip)) return chip;
    return null;
  }

  function findToolkitButton(scope) {
    var root = scope || document;
    var btn = root.querySelector('.icon-button.toolkit-trigger-btn, .icon-button');
    if (btn && visible(btn)) return btn;
    return null;
  }

  function findStopButton() {
    var input = findComposerInput();
    var shell = composerShell(input);
    var scope = shell || document;
    var btns = actionButtons(scope);
    var i;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      if (btns[i].closest('[data-chat-export], .chat-export-fmt, .chat-export-dl, .chat-export-menu')) continue;
      var blob = labelOf(btns[i]);
      if (/stop|останов|прерв|cancel/i.test(blob)) return btns[i];
      var cls = String(btns[i].className || '');
      if (/\bstop\b/i.test(cls)) return btns[i];
    }
    if (Ops.findStopControl) return Ops.findStopControl(document);
    return null;
  }

  function findComposerToolbar() {
    var input = findComposerInput();
    if (!input || !visible(input)) return null;
    var action = document.querySelector('.chat-editor-action');
    var right = action && action.querySelector('.right-area');
    var left = action && action.querySelector('.left-area');
    var model = findModelChip(right || action) || findModelChip(document);
    var send = findSendButton();
    var voice = right && right.querySelector('.voice-input-controls');
    var toolkit = findToolkitButton(left || action) || findToolkitButton(document);
    var before = null;
    if (right) {
      if (voice && right.contains(voice)) before = voice;
      else if (send && right.contains(send)) before = send;
    }
    if (right && (model || send || voice)) {
      return {
        el: right,
        beforeChild: before,
        insertAfter: before ? null : model || right.lastElementChild,
        nativeFrom: model || toolkit || send || null,
        nativeClass: model ? 'current-model' : '',
        nativeIconFrom: toolkit || send || model || null
      };
    }
    if (action) {
      return {
        el: action,
        beforeChild: right || send || null,
        insertAfter: null,
        nativeFrom: model || toolkit || send || null,
        nativeClass: model ? 'current-model' : '',
        nativeIconFrom: toolkit || send || model || null
      };
    }
    var shell = composerShell(input);
    var row =
      (send && send.parentElement) ||
      (shell && shell.querySelector('[class*="toolbar"], [class*="action"], [class*="footer"]')) ||
      shell ||
      input.parentElement;
    if (!row) return null;
    return {
      el: row,
      beforeChild: send || null,
      insertAfter: send ? null : row.lastElementChild,
      nativeFrom: model || send || null,
      nativeClass: model ? 'current-model' : '',
      nativeIconFrom: toolkit || send || null
    };
  }

  function active() {
    if (/login|sign[_-]?in|auth/i.test(location.pathname)) return false;
    return !!findComposerInput() || !!currentChatId();
  }

  function findTitle() {
    var id = currentChatId();
    if (id) {
      var links = document.querySelectorAll('a[href*="/chat/"]');
      var i;
      for (i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href') || '';
        if (href.indexOf('/chat/' + id) >= 0 || href.indexOf(id) >= 0) {
          var t = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (t && t.length < 200) return t;
        }
      }
    }
    var title = (document.title || '').replace(/\s*[|\u2013\u2014-]\s*Kimi.*$/i, '').trim();
    if (title && !/^kimi$/i.test(title)) return title;
    return 'chat';
  }

  function findModel() {
    var chip = findModelChip(document);
    if (chip) {
      var name = (chip.textContent || '').replace(/\s+/g, ' ').trim();
      if (name) return name.slice(0, 64);
    }
    var btns = document.querySelectorAll('button, [role="button"]');
    var i;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      var blob = labelOf(btns[i]);
      if (/kimi|moonshot|model|модель|k3/i.test(blob) && blob.length < 64) {
        if (/send|отправ|stop|останов|attach|файл/i.test(blob)) continue;
        return blob.slice(0, 64);
      }
    }
    return '';
  }

  function sessionUser() {
    var btn =
      document.querySelector('[class*="user-avatar"], [class*="avatar"] button, button[aria-label*="account" i], button[aria-label*="profile" i]') ||
      document.querySelector('img[alt*="avatar" i], img[class*="avatar"]');
    var name = '';
    if (btn) name = labelOf(btn).slice(0, 80);
    return { userName: name, userHandle: '', userEmail: '' };
  }

  function liveScroller() {
    var turn = document.querySelector(
      '[class*="chat-content"], [class*="message-list"], [class*="segment"], main'
    );
    if (turn && CE.findOverflowScroller) {
      var sc = CE.findOverflowScroller(turn);
      if (sc) return sc;
    }
    return document.querySelector('main') || document.body;
  }

  function turnNodes(root) {
    root = root || liveScroller() || document;
    var marked = root.querySelectorAll(
      '[data-role="user"], [data-role="assistant"], [class*="chat-content-item"], [class*="segment-container"], [class*="message-item"], [class*="chat-item"]'
    );
    if (marked.length) return Array.prototype.slice.call(marked);
    var md = root.querySelectorAll('.markdown-body, [class*="markdown"]');
    if (md.length) {
      var out = [];
      var i;
      for (i = 0; i < md.length; i++) {
        var wrap =
          md[i].closest('[class*="segment"], [class*="message"], [class*="chat-content"]') || md[i].parentElement;
        if (wrap && out.indexOf(wrap) < 0) out.push(wrap);
      }
      if (out.length) return out;
    }
    return [];
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    var role = roleOfTurn(el);
    var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return (role === 'user' ? 'u:' : 'a:') + text || 'n' + i;
  }

  function roleOfTurn(turn) {
    if (!turn) return 'assistant';
    var role = (turn.getAttribute('data-role') || '').toLowerCase();
    if (role === 'user' || role === 'human') return 'user';
    if (role === 'assistant' || role === 'bot') return 'assistant';
    var cls = String(turn.className || '').toLowerCase();
    if (/user|human|self|question|prompt/.test(cls) && !/assistant|bot|answer|response/.test(cls)) {
      return 'user';
    }
    if (/assistant|bot|answer|response|kimi/.test(cls)) return 'assistant';
    if (turn.querySelector('.markdown-body, [class*="markdown"], [class*="assistant"]')) return 'assistant';
    return 'user';
  }

  function captureTurn(turn, assistantTag) {
    try {
      var role = roleOfTurn(turn);
      var body =
        turn.querySelector('.markdown-body, [class*="markdown"], [class*="segment-content"], [class*="message-content"]') ||
        turn;
      var text = '';
      if (role === 'user') {
        text = (body.innerText || body.textContent || '').trim();
      } else {
        try {
          text = CE.htmlToMarkdown(body);
        } catch (e) {
          text = (body.innerText || body.textContent || '').trim();
        }
      }
      if (!text) return null;
      return {
        role: role,
        roleTag: role === 'user' ? 'user' : assistantTag || 'kimi',
        text: text,
        links: CE.collectLinks ? CE.collectLinks(body) : []
      };
    } catch (err) {
      console.error('[chat-export]', err);
      return null;
    }
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
      { timeoutMs: opts.timeoutMs || 180000, message: 'Kimi idle timeout' }
    );
  }

  function turnCount() {
    return turnNodes().length;
  }

  async function waitForReply(beforeTurns, opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        if (turnCount() > beforeTurns && !isGenerating()) return true;
        if (isGenerating()) return null;
        return turnCount() > beforeTurns ? true : null;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Kimi reply timeout' }
    );
    await waitForIdle(opts);
  }

  async function submitComposer(text) {
    var input = findComposerInput();
    if (!input) rpcErr('HOST_ERROR', 'composer not found');
    await waitForIdle();
    if (Ops.fillRichComposer) await Ops.fillRichComposer(input, text);
    else if (Ops.fillEditable) Ops.fillEditable(input, text);
    else {
      input.focus();
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await Ops.sleep(80);
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

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId && visible(findComposerInput())) return;
    var path = '/chat/' + encodeURIComponent(chatId);
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
        { timeoutMs: 5000, message: 'Kimi soft navigate timeout' }
      );
      softOk = true;
    } catch (e) {}
    if (!softOk) {
      location.assign(chatUrl(chatId));
      await Ops.waitFor(
        function () {
          return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 30000, message: 'Kimi navigate timeout' }
      );
    }
  }

  async function ensureNewChat() {
    if (!currentChatId() && visible(findComposerInput())) return;
    var neu = null;
    var nodes = document.querySelectorAll('a, button, [role="button"]');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!visible(nodes[i])) continue;
      var blob = labelOf(nodes[i]);
      if (/^(новый чат|new chat|new conversation)$/i.test(blob) || /\/$/.test(nodes[i].getAttribute('href') || '')) {
        if (/new|нов/i.test(blob)) {
          neu = nodes[i];
          break;
        }
      }
    }
    if (neu) {
      if (Ops.clickEl) Ops.clickEl(neu);
      else neu.click();
    } else if (Ops.softNavigate) {
      Ops.softNavigate('/');
    } else {
      history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    try {
      await Ops.waitFor(
        function () {
          return !currentChatId() && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 8000, message: 'Kimi new chat soft timeout' }
      );
      return;
    } catch (e) {}
    location.assign(location.origin + '/');
    await Ops.waitFor(
      function () {
        return !currentChatId() && visible(findComposerInput()) ? true : null;
      },
      { timeoutMs: 30000, message: 'Kimi new chat timeout' }
    );
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href*="/chat/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/chat\/([^/?#]+)/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = 1;
      var title = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
      var chat = {
        platform: 'kimi',
        chatId: decodeURIComponent(m[1]),
        title: title,
        url: chatUrl(decodeURIComponent(m[1])),
        updatedAt: null,
        createdAt: null
      };
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, query)) continue;
      items.push(chat);
    }
    return items;
  }

  function sidebarRowFor(chatId) {
    var links = document.querySelectorAll('a[href*="/chat/"]');
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/chat\/([^/?#]+)/);
      if (!m) continue;
      if (decodeURIComponent(m[1]) === chatId) {
        return links[i].closest('li, [role="listitem"], [class*="chat"], [class*="history"], div') || links[i].parentElement;
      }
    }
    return null;
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'POST',
      credentials: 'include',
      headers: Object.assign(
        { Accept: 'application/json', 'Content-Type': 'application/json' },
        opts.headers || {}
      ),
      body: opts.body != null ? opts.body : '{}'
    });
  }

  function parseGatewayRows(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.items)) return json.items;
    if (Array.isArray(json.chats)) return json.chats;
    if (Array.isArray(json.list)) return json.list;
    if (json.data) return parseGatewayRows(json.data);
    if (json.result) return parseGatewayRows(json.result);
    return [];
  }

  function toChat(row) {
    var id = String(row.id || row.chat_id || row.chatId || row.uuid || '');
    return {
      platform: 'kimi',
      chatId: id,
      title: row.name || row.title || '',
      url: id ? chatUrl(id) : location.origin + '/',
      updatedAt: Ops.toIso
        ? Ops.toIso(row.updated_at || row.updatedAt || row.mtime || row.last_modified)
        : row.updated_at || null,
      createdAt: Ops.toIso ? Ops.toIso(row.created_at || row.createdAt) : row.created_at || null
    };
  }

  var LIST_PATHS = [
    '/apiv2/kimi.gateway.chat.ChatService/List',
    '/apiv2/kimi.gateway.chat.ChatService/ListChats',
    '/apiv2/kimi.gateway.chat.ChatService/ChatList'
  ];

  var DELETE_PATHS = [
    '/apiv2/kimi.gateway.chat.ChatService/Delete',
    '/apiv2/kimi.gateway.chat.ChatService/DeleteChat',
    '/apiv2/kimi.gateway.chat.ChatService/Remove'
  ];

  async function probeGateway() {
    if (gatewayCache.probed) return gatewayCache;
    gatewayCache.probed = true;
    var i;
    for (i = 0; i < LIST_PATHS.length; i++) {
      try {
        var res = await apiFetch(LIST_PATHS[i], { body: JSON.stringify({ limit: 1 }) });
        if (res.status === 401 || res.status === 403) {
          gatewayCache.listPath = LIST_PATHS[i];
          return gatewayCache;
        }
        if (res.ok) {
          gatewayCache.listPath = LIST_PATHS[i];
          break;
        }
      } catch (e) {}
    }
    for (i = 0; i < DELETE_PATHS.length; i++) {
      gatewayCache.deletePath = DELETE_PATHS[i];
      break;
    }
    return gatewayCache;
  }

  async function listFromApi(args) {
    await probeGateway();
    if (!gatewayCache.listPath) return null;
    var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
    var res = await apiFetch(gatewayCache.listPath, {
      body: JSON.stringify({ limit: Math.max(limit, 20) })
    });
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
    if (!res.ok) return null;
    var json = await res.json();
    var raw = parseGatewayRows(json);
    var items = [];
    var i;
    for (i = 0; i < raw.length && items.length < limit; i++) {
      if (!raw[i]) continue;
      var chat = toChat(raw[i]);
      if (!chat.chatId) continue;
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
      items.push(chat);
    }
    return { items: items, nextCursor: null };
  }

  function messagesFromDom() {
    var nodes = turnNodes();
    var model = findModel();
    var tag = CE.modelFenceTag ? CE.modelFenceTag(model, 'kimi') : 'kimi';
    var out = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      var row = captureTurn(nodes[i], tag);
      if (row) out.push(row);
    }
    return out;
  }

  function exportPayload(chatId, messages) {
    var user = sessionUser();
    return {
      platform: 'kimi',
      url: chatId === currentChatId() ? location.href : chatUrl(chatId),
      title: findTitle(),
      chatId: chatId,
      model: findModel(),
      userName: user.userName || '',
      userHandle: user.userHandle || '',
      userEmail: user.userEmail || '',
      messages: messages || []
    };
  }

  async function exportDataFromDom() {
    var chatId = currentChatId();
    if (!chatId) return null;
    var messages = messagesFromDom();
    if (!messages.length) return null;
    return exportPayload(chatId, messages);
  }

  async function getFromDom(chatId) {
    if (chatId && chatId !== currentChatId()) {
      await navigateToChat(chatId);
      await Ops.sleep(400);
    }
    var id = currentChatId() || chatId;
    if (!id) rpcErr('BAD_REQUEST', 'chatId required');
    var messages = messagesFromDom();
    return exportPayload(id, messages);
  }

  async function deleteViaApi(chatId) {
    await probeGateway();
    if (!gatewayCache.deletePath) return false;
    var bodies = [
      JSON.stringify({ id: chatId }),
      JSON.stringify({ chat_id: chatId }),
      JSON.stringify({ chatId: chatId }),
      JSON.stringify({ ids: [chatId] })
    ];
    var i;
    for (i = 0; i < bodies.length; i++) {
      var res = await apiFetch(gatewayCache.deletePath, { body: bodies[i] });
      if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
      if (res.status === 404) continue;
      if (res.ok) return true;
    }
    return false;
  }

  async function deleteViaUi(chatId) {
    var row = sidebarRowFor(chatId);
    if (!row) return false;
    var trigger = null;
    var depth = 0;
    var node = row;
    for (depth = 0; node && depth < 5 && !trigger; depth++) {
      trigger =
        node.querySelector(
          'button[aria-label*="more" i], button[aria-label*="menu" i], button[aria-label*="опц" i], button[aria-label*="действ" i], button[aria-haspopup], [class*="more"] button, [class*="action"] button'
        ) || null;
      if (!trigger) {
        var btns = node.querySelectorAll('button, [role="button"]');
        var b;
        for (b = 0; b < btns.length; b++) {
          if (!visible(btns[b])) continue;
          if (btns[b].querySelector('svg') && labelOf(btns[b]).length < 24) {
            trigger = btns[b];
            break;
          }
        }
      }
      node = node.parentElement;
    }
    if (!trigger || !Ops.openMenu) return false;
    var menu = await Ops.openMenu(trigger, { message: 'kimi chat menu did not open' }).catch(function () {
      return null;
    });
    if (!menu) return false;
    var picked = Ops.pickMenuItem ? Ops.pickMenuItem(menu, /удалить|delete|remove/i) : null;
    if (!picked) {
      if (Ops.closeMenu) Ops.closeMenu(document);
      return false;
    }
    try {
      var confirm = await Ops.waitFor(
        function () {
          var dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
          var d;
          for (d = 0; d < dialogs.length; d++) {
            var btns = dialogs[d].querySelectorAll('button, [role="button"]');
            var b;
            for (b = 0; b < btns.length; b++) {
              var t = (btns[b].textContent || '').replace(/\s+/g, ' ').trim();
              if (/^(удалить|delete|confirm|подтверд)/i.test(t) && !btns[b].disabled) return btns[b];
            }
          }
          return null;
        },
        { timeoutMs: 4000, message: 'delete confirmation not found' }
      );
      if (Ops.clickEl) Ops.clickEl(confirm);
      else confirm.click();
    } catch (e) {}
    await Ops.waitFor(
      function () {
        return sidebarRowFor(chatId) ? null : true;
      },
      { timeoutMs: 10000, message: 'chat still present after delete' }
    ).catch(function () {
      rpcErr('HOST_ERROR', 'conversation still present after delete: ' + chatId);
    });
    return true;
  }

  function capabilitiesCacheKey() {
    return (findModel() || '') + '|' + location.pathname;
  }

  async function detectCapabilities() {
    var model = findModel();
    var models = model
      ? [{ id: Ops.normalizeId ? Ops.normalizeId(model) : model, label: model, kind: 'model' }]
      : [{ id: 'default', label: 'Default', kind: 'model' }];
    return {
      platform: 'kimi',
      projectsSupported: false,
      models: models,
      modes: [{ id: 'chat', label: 'Chat', kind: 'mode' }],
      toggles: [],
      tools: [],
      attach: { supported: false, multiple: false, accept: [] },
      current: {
        model: models[0] && models[0].id,
        mode: 'chat',
        toggles: []
      },
      detectedAt: new Date().toISOString()
    };
  }

  CE.definePlatform({
    id: 'kimi',
    modifier: 'kimi',
    fenceTag: 'kimi',
    exportData: exportDataFromDom,
    active: active,
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
          try {
            var apiList = await listFromApi(args);
            if (apiList && apiList.items && apiList.items.length) return apiList;
          } catch (apiErr) {
            if (apiErr && apiErr.code === 'UNAUTHORIZED') {
              var domGuest = listFromDom(args && args.query);
              if (domGuest.length) {
                return {
                  items: domGuest.slice(0, Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20),
                  nextCursor: null
                };
              }
              throw apiErr;
            }
            if (apiErr && apiErr.code && apiErr.code !== 'HOST_ERROR') throw apiErr;
          }
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
            var live = await exportDataFromDom();
            if (live && live.messages && live.messages.length) {
              return Object.assign({ url: location.href }, live);
            }
            if (ctx && typeof ctx.getData === 'function') {
              var page = await ctx.getData();
              return Object.assign({ platform: 'kimi', url: location.href, chatId: chatId }, page || {});
            }
            return exportPayload(chatId, messagesFromDom());
          }
          return await getFromDom(chatId);
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
            platform: 'kimi',
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
          var before = turnCount();
          await submitComposer(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              return id || null;
            },
            { timeoutMs: 120000, message: 'Kimi chatId timeout' }
          );
          await waitForReply(before);
          return {
            platform: 'kimi',
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
          try {
            var apiOk = await deleteViaApi(chatId);
            if (apiOk) return { deleted: true, chatId: chatId };
          } catch (apiErr) {
            if (apiErr && apiErr.code === 'UNAUTHORIZED') throw apiErr;
            if (apiErr && apiErr.code && apiErr.code !== 'HOST_ERROR') throw apiErr;
          }
          var uiOk = await deleteViaUi(chatId);
          if (uiOk) return { deleted: true, chatId: chatId };
          rpcErr(
            'HOST_ERROR',
            'Kimi delete unavailable — ChatService/UI delete not found for: ' + chatId
          );
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
