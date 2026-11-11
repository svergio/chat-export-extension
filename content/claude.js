(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var orgCache = { id: '', at: 0 };
  var capsCache = { key: '', data: null };

  function rpcErr(code, message) {
    throw new CE.RpcError(code, message);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function currentChatId() {
    var m = location.pathname.match(/\/chat\/([0-9a-fA-F-]{8,})/);
    return m ? m[1] : '';
  }

  function chatUrl(id) {
    return location.origin + '/chat/' + id;
  }

  function pmVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 12;
  }

  function findProseMirror() {
    var nodes = document.querySelectorAll(
      '[data-testid="chat-input"] .ProseMirror, .ProseMirror[contenteditable="true"], .ProseMirror'
    );
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (pmVisible(nodes[i]) && nodes[i].classList.contains('ProseMirror-focused')) {
        return nodes[i];
      }
    }
    for (i = 0; i < nodes.length; i++) {
      if (pmVisible(nodes[i])) return nodes[i];
    }
    return nodes[0] || null;
  }

  function findModelButton() {
    return (
      document.querySelector('[data-testid="model-selector-dropdown"]') ||
      document.querySelector('button[aria-label^="Model:" i]') ||
      document.querySelector('button[aria-label^="Модель:"]')
    );
  }

  function findComposerBarSlot(model) {
    if (!model) return null;
    return (
      model.closest('.bottom-0.end-0') ||
      model.closest('.flex.min-w-0.items-center.justify-end') ||
      model.parentElement
    );
  }

  function findAttachButton() {
    return (
      document.querySelector('[data-testid="chat-input-attach"]') ||
      document.querySelector('button[aria-label*="Add files" i]') ||
      document.querySelector('button[aria-label*="Добавить файлы" i]')
    );
  }

  function findSendButton() {
    return (
      document.querySelector('[data-testid="chat-input-send"]') ||
      document.querySelector('button[aria-label*="Send" i]') ||
      document.querySelector('button[aria-label*="Отправ" i]')
    );
  }

  function findStopButton() {
    return (
      document.querySelector('button[aria-label*="Stop" i]') ||
      document.querySelector('button[aria-label*="Останов" i]')
    );
  }

  function findFileInput() {
    return (
      document.querySelector('#chat-input-file-upload-onpage') ||
      document.querySelector('#chat-input-file-upload-bottom') ||
      document.querySelector('input[type="file"][multiple]') ||
      document.querySelector('input[type="file"]')
    );
  }

  function isGenerating() {
    var stop = findStopButton();
    if (!stop) return false;
    return !stop.disabled && stop.getAttribute('aria-disabled') !== 'true';
  }

  async function waitForIdle(opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'Claude idle timeout' }
    );
  }

  async function resolveOrgId(force) {
    if (!force && orgCache.id && Date.now() - orgCache.at < 300000) return orgCache.id;
    var res = await fetch('/api/organizations', { credentials: 'include' });
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'organizations ' + res.status);
    if (!res.ok) {
      var t = await res.text();
      rpcErr('HOST_ERROR', 'organizations ' + res.status + ' ' + t.slice(0, 120));
    }
    var list = await res.json();
    if (!Array.isArray(list) || !list.length) rpcErr('HOST_ERROR', 'no organizations');
    var i;
    var picked = null;
    for (i = 0; i < list.length; i++) {
      var caps = list[i] && list[i].capabilities;
      if (Array.isArray(caps) && caps.indexOf('chat') >= 0) {
        picked = list[i];
        break;
      }
    }
    if (!picked) picked = list[0];
    if (!picked || !picked.uuid) rpcErr('HOST_ERROR', 'org uuid missing');
    orgCache = { id: picked.uuid, at: Date.now() };
    return picked.uuid;
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var orgId = await resolveOrgId();
    var url = '/api/organizations/' + encodeURIComponent(orgId) + path;
    var res = await fetch(url, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: Object.assign({ Accept: 'application/json' }, opts.headers || {}),
      body: opts.body
    });
    return res;
  }

  function toChat(row) {
    return {
      platform: 'claude',
      chatId: row.uuid,
      title: row.name || '',
      url: chatUrl(row.uuid),
      updatedAt: Ops.toIso ? Ops.toIso(row.updated_at) : row.updated_at || null,
      createdAt: Ops.toIso ? Ops.toIso(row.created_at) : row.created_at || null
    };
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href^="/chat/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/chat\/([0-9a-fA-F-]{8,})/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = 1;
      var title = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
      var chat = {
        platform: 'claude',
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

  function roleTagFor(role, model) {
    if (role === 'user') return 'user';
    if (CE.modelFenceTag) return CE.modelFenceTag(model, 'claude');
    return 'claude';
  }

  function thinkingText(block) {
    if (!block) return '';
    var th = String(block.thinking || '').trim();
    if (!th && Array.isArray(block.summaries)) {
      th = block.summaries
        .map(function (s) {
          return (s && s.summary) || '';
        })
        .filter(Boolean)
        .join('\n')
        .trim();
    }
    return th;
  }

  function blockToText(block) {
    if (!block) return '';
    var kind = String(block.type || '');
    if (kind === 'text') return String(block.text || '').trim();
    if (kind === 'thinking') return '';
    if (kind === 'tool_use') {
      var name = block.name || block.tool_name || 'tool';
      var input = block.input != null ? block.input : block.tool_input;
      return (
        '```tool_use ' +
        name +
        '\n' +
        (typeof input === 'string' ? input : JSON.stringify(input, null, 2)) +
        '\n```'
      );
    }
    return '';
  }

  function messageParts(msg) {
    if (!msg) return { text: '', thinkingChars: 0 };
    var content = msg.content || [];
    var hasBlocks = Array.isArray(content) && content.length > 0;
    if (hasBlocks) {
      var parts = [];
      var thinkingChars = 0;
      var i;
      for (i = 0; i < content.length; i++) {
        var block = content[i];
        if (String((block && block.type) || '') === 'thinking') {
          thinkingChars += thinkingText(block).length;
          continue;
        }
        var t = blockToText(block);
        if (t) parts.push(t);
      }
      return { text: parts.join('\n\n').trim(), thinkingChars: thinkingChars };
    }
    if (typeof msg.text === 'string' && msg.text.trim()) {
      return { text: msg.text.trim(), thinkingChars: 0 };
    }
    return { text: '', thinkingChars: 0 };
  }

  function messageText(msg) {
    return messageParts(msg).text;
  }

  function orderedBranch(messages, leafUuid) {
    var byId = {};
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (m && m.uuid) byId[m.uuid] = m;
    }
    var chain = [];
    var cur = leafUuid;
    var guard = 0;
    while (cur && byId[cur] && guard++ < 5000) {
      chain.push(byId[cur]);
      cur = byId[cur].parent_message_uuid;
    }
    chain.reverse();
    return chain;
  }

  function mapOneApiMessage(msg, modelName) {
    var sender = String(msg.sender || '').toLowerCase();
    if (sender !== 'human' && sender !== 'assistant') return null;
    var parts = messageParts(msg);
    if (!parts.text) return null;
    var row = {
      role: sender === 'human' ? 'user' : 'assistant',
      roleTag: roleTagFor(sender === 'human' ? 'user' : 'assistant', modelName || msg.model),
      text: parts.text,
      links: []
    };
    if (parts.thinkingChars > 0) row.thinkingChars = parts.thinkingChars;
    return row;
  }

  function mapApiMessages(messages, leafUuid, modelName) {
    var branch = orderedBranch(messages, leafUuid);
    var out = [];
    for (var i = 0; i < branch.length; i++) {
      var row = mapOneApiMessage(branch[i], modelName);
      if (row) out.push(row);
    }
    return out;
  }

  function childrenByParent(messages) {
    var kids = {};
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (!m || !m.uuid) continue;
      var parent = m.parent_message_uuid || '';
      if (!kids[parent]) kids[parent] = [];
      kids[parent].push(m);
    }
    return kids;
  }

  function mapApiMessagesAll(messages, leafUuid, modelName) {
    var byId = {};
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      if (messages[i] && messages[i].uuid) byId[messages[i].uuid] = messages[i];
    }
    var kids = childrenByParent(messages);
    var out = [];
    var seen = {};
    function walk(uuid, branchIdx) {
      var msg = byId[uuid];
      if (!msg || seen[uuid]) return;
      seen[uuid] = 1;
      var row = mapOneApiMessage(msg, modelName);
      if (row) {
        if (branchIdx > 0) {
          row.text = '[branch ' + (branchIdx + 1) + ']\n\n' + row.text;
        }
        out.push(row);
      }
      var childs = kids[uuid] || [];
      var c;
      for (c = 0; c < childs.length; c++) {
        walk(childs[c].uuid, childs.length > 1 ? c : branchIdx);
      }
    }
    var roots = kids[''] || [];
    if (!roots.length && leafUuid && byId[leafUuid]) {
      return mapApiMessages(messages, leafUuid, modelName);
    }
    for (i = 0; i < roots.length; i++) {
      walk(roots[i].uuid, roots.length > 1 ? i : 0);
    }
    if (!out.length) return mapApiMessages(messages, leafUuid, modelName);
    return out;
  }

  function currentTitle() {
    var t = document.title || '';
    t = t.replace(/\s*-\s*Claude\s*$/i, '').trim();
    return t || 'chat';
  }

  function readModelFromDom() {
    var btn = findModelButton();
    if (!btn) return '';
    var aria = btn.getAttribute('aria-label') || '';
    var m = aria.match(/^(?:Model|Модель):\s*(.+)$/i);
    if (m && m[1]) return m[1].trim().slice(0, 80);
    return (btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  var accountCache = { at: 0, data: null };

  async function sessionUser() {
    if (accountCache.data && Date.now() - accountCache.at < 300000) return accountCache.data;
    try {
      var res = await fetch('/api/bootstrap', { credentials: 'include' });
      if (!res.ok) return { userName: '', userHandle: '', userEmail: '' };
      var j = await res.json();
      var a = (j && j.account) || {};
      var data = {
        userName: a.display_name || a.full_name || '',
        userHandle: a.display_name || '',
        userEmail: a.email_address || ''
      };
      accountCache = { at: Date.now(), data: data };
      return data;
    } catch (e) {
      return { userName: '', userHandle: '', userEmail: '' };
    }
  }

  function capabilitiesCacheKey() {
    return (readModelFromDom() || '') + '|' + (findFileInput() ? 'files' : '');
  }

  function clearCapCache() {
    capsCache = { key: '', data: null };
  }

  function isPromoModelLabel(label) {
    return /открывается в новой вкладке|opens in a new tab|подробнее|learn more|входит в план/i.test(
      String(label || '')
    );
  }

  async function detectCapabilities() {
    var models = [];
    var accept = '';
    var input = findFileInput();
    if (input && input.getAttribute('accept')) accept = input.getAttribute('accept');

    var chip = findModelButton();
    if (chip) {
      Ops.clickEl(chip);
      await Ops.sleep(450);
      var menu = document.querySelector('[role="menu"]');
      if (menu) {
        var rows = menu.querySelectorAll('[role="menuitem"]');
        var i;
        for (i = 0; i < rows.length; i++) {
          var label = (rows[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (!label || /другие модели|other models|уровень усилий|effort/i.test(label)) continue;
          if (isPromoModelLabel(label)) continue;
          var id = Ops.normalizeId ? Ops.normalizeId(label) : label.toLowerCase();
          if (!id) continue;
          var locked =
            rows[i].getAttribute('aria-disabled') === 'true' ||
            /max|ultra|pro\+|upgrade|улучшить план|upgrade plan|заблокир|locked/i.test(label);
          models.push({ id: id, label: label.slice(0, 120), locked: !!locked });
        }
      }
      Ops.closeMenu(document);
    }
    var currentModel = readModelFromDom();
    var currentId = Ops.normalizeId ? Ops.normalizeId(currentModel) : currentModel;
    if (currentId && !models.some(function (m) { return m.id === currentId; })) {
      models.unshift({ id: currentId, label: currentModel || currentId, locked: false });
    }
    return {
      platform: 'claude',
      projectsSupported: true,
      models: models,
      modes: [],
      toggles: [],
      tools: [],
      current: { model: currentId, toggles: [] },
      attach: { supported: !!input, accept: accept, multiple: !!(input && input.multiple) },
      detectedAt: new Date().toISOString()
    };
  }

  async function applyModelChoice(wanted) {
    var want = String(wanted || '').trim();
    if (!want) return;
    var wantId = Ops.normalizeId ? Ops.normalizeId(want) : want.toLowerCase();
    var currentId = Ops.normalizeId ? Ops.normalizeId(readModelFromDom() || '') : String(readModelFromDom() || '');
    if (currentId && (currentId === wantId || currentId.indexOf(wantId) === 0 || wantId.indexOf(currentId) === 0)) {
      return;
    }
    var caps = await detectCapabilities();
    var listed = null;
    var i;
    for (i = 0; i < (caps.models || []).length; i++) {
      var m = caps.models[i];
      if (
        m.id === wantId ||
        String(m.label || '').toLowerCase().indexOf(want.toLowerCase()) >= 0
      ) {
        listed = m;
        break;
      }
    }
    if (listed && listed.locked) rpcErr('OPTION_LOCKED', 'model: ' + want);
    var chip = findModelButton();
    if (!chip) rpcErr('OPTION_NOT_FOUND', 'model: ' + want);
    Ops.clickEl(chip);
    await Ops.sleep(450);
    var menu = document.querySelector('[role="menu"]');
    if (!menu) rpcErr('OPTION_NOT_FOUND', 'model menu');
    var picked = Ops.pickMenuItem(menu, function (it) {
      var lid = Ops.normalizeId(it.label);
      return (
        lid === wantId ||
        lid.indexOf(wantId) >= 0 ||
        wantId.indexOf(lid) >= 0 ||
        it.label.toLowerCase().indexOf(want.toLowerCase()) >= 0
      );
    });
    Ops.closeMenu(document);
    if (!picked) rpcErr('OPTION_NOT_FOUND', 'model: ' + want);
    if (picked.locked || picked.disabled) rpcErr('OPTION_LOCKED', 'model: ' + want);
    clearCapCache();
  }

  async function applyWireFiles(files) {
    var list = Array.isArray(files) ? files : [];
    if (!list.length) return;
    var input = findFileInput();
    if (!input) {
      var attach = findAttachButton();
      if (attach) Ops.clickEl(attach);
      input = await Ops.waitFor(findFileInput, {
        timeoutMs: 10000,
        message: 'ATTACH_UNSUPPORTED'
      });
    }
    if (!input) rpcErr('ATTACH_UNSUPPORTED', 'file input not found');
    var n = Ops.setFileInputFiles(input, list);
    var names = list.map(function (f) { return f && f.name; }).filter(Boolean);
    if (Ops.waitAttachChips) {
      await Ops.waitAttachChips(document, n, {
        timeoutMs: 20000,
        names: names,
        fileInput: input,
        allowSpinner: true,
        message: 'ATTACH_TIMEOUT'
      });
    } else {
      await Ops.sleep(800);
      var text = String(document.body && document.body.textContent || '').toLowerCase();
      var ok = names.length && names.every(function (name) {
        return text.indexOf(String(name).toLowerCase()) >= 0;
      });
      if (!ok && !(input.files && input.files.length >= n)) {
        rpcErr('ATTACH_TIMEOUT', 'attach verify failed');
      }
    }
    clearCapCache();
  }

  async function applyOptions(args) {
    args = args || {};
    var applied = {};
    if (args.model) {
      await applyModelChoice(args.model);
      applied.model = Ops.normalizeId ? Ops.normalizeId(args.model) : String(args.model);
    }
    if (args.files && args.files.length) {
      await applyWireFiles(args.files);
      applied.files = args.files.length;
    }
    return applied;
  }

  async function ensureNewChat() {
    if (!currentChatId() && pmVisible(findProseMirror())) return;
    if (Ops.softNavigate) Ops.softNavigate('/new');
    else {
      history.pushState({}, '', '/new');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    await Ops.waitFor(
      function () {
        return !currentChatId() && pmVisible(findProseMirror());
      },
      { timeoutMs: 25000, message: 'Claude new chat timeout' }
    );
  }

  function clickSend() {
    var send = findSendButton();
    if (!send || send.disabled || send.getAttribute('aria-disabled') === 'true') {
      rpcErr('HOST_ERROR', 'send disabled');
    }
    Ops.clickEl(send);
  }

  function composerDraftText(pm) {
    return String((pm && (pm.innerText || pm.textContent)) || '').trim();
  }

  function fillClaudeComposer(pm, text) {
    var value = String(text == null ? '' : text);
    if (Ops.fillRichComposer) {
      Ops.fillRichComposer(pm, value);
      return;
    }
    try {
      pm.focus();
    } catch (e) {}
    var inserted = false;
    try {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(pm);
      sel.removeAllRanges();
      sel.addRange(range);
      inserted = document.execCommand('insertText', false, value);
    } catch (e2) {
      inserted = false;
    }
    if (!inserted || !(pm.innerText || '').trim()) {
      Ops.fillEditable(pm, value);
    }
  }

  async function submitComposer(text) {
    var pm = await Ops.waitFor(
      function () {
        var el = findProseMirror();
        return pmVisible(el) ? el : null;
      },
      { timeoutMs: 15000, message: 'Claude composer timeout' }
    );
    fillClaudeComposer(pm, text);
    await Ops.sleep(200);
    var send = null;
    try {
      send = await Ops.waitFor(
        function () {
          var b = findSendButton();
          if (!b) return null;
          if (b.disabled || b.getAttribute('aria-disabled') === 'true') return null;
          return b;
        },
        { timeoutMs: 4000, message: 'Claude send enable timeout' }
      );
    } catch (eEnable) {
      // Retry fill once — TipTap sometimes ignores the first isolated-world insert.
      pm = findProseMirror() || pm;
      fillClaudeComposer(pm, text);
      await Ops.sleep(250);
      send = await Ops.waitFor(
        function () {
          var b = findSendButton();
          if (!b) return null;
          if (b.disabled || b.getAttribute('aria-disabled') === 'true') return null;
          return b;
        },
        { timeoutMs: 10000, message: 'Claude send enable timeout' }
      );
    }
    if (Ops.ensureComposerSubmitted) {
      await Ops.ensureComposerSubmitted({
        send: send,
        input: pm,
        message: 'Claude submit failed',
        isDone: function () {
          if (isGenerating()) return true;
          var cur = findProseMirror();
          return composerDraftText(cur) ? null : true;
        }
      });
      return;
    }
    clickSend();
  }

  async function fetchConversationApi(chatId, branchMode) {
    var branch = branchMode === 'all' ? 'all' : 'active';
    var path =
      '/chat_conversations/' +
      encodeURIComponent(chatId) +
      '?tree=True&rendering_mode=messages&render_all_tools=true';
    var res = await apiFetch(path);
    if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'get ' + res.status);
    if (!res.ok) {
      var t = await res.text();
      rpcErr('HOST_ERROR', 'get ' + res.status + ' ' + t.slice(0, 160));
    }
    var data = await res.json();
    var user = await sessionUser();
    var msgs =
      branch === 'all'
        ? mapApiMessagesAll(data.chat_messages || [], data.current_leaf_message_uuid, data.model)
        : mapApiMessages(data.chat_messages || [], data.current_leaf_message_uuid, data.model);
    return {
      title: data.name || currentTitle(),
      chatId: chatId,
      model: data.model || readModelFromDom() || '',
      userName: user.userName || '',
      userHandle: user.userHandle || '',
      userEmail: user.userEmail || '',
      branch: branch,
      messages: msgs
    };
  }

  async function exportDataFromApi() {
    var chatId = currentChatId();
    if (!chatId) return null;
    try {
      var payload = await fetchConversationApi(chatId, 'active');
      if (!payload.messages || !payload.messages.length) return null;
      return payload;
    } catch (e) {
      if (e && e.code && e.code !== 'HOST_ERROR') throw e;
      return null;
    }
  }

  async function maybeRename(chatId, title) {
    var name = String(title || '').trim();
    if (!name || !Ops.testTitle || !Ops.testTitle(name)) return;
    try {
      var res = await apiFetch('/chat_conversations/' + encodeURIComponent(chatId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
      });
      if (!res.ok) return;
    } catch (e) {
      /* optional */
    }
  }

  function roleOfTurn(el) {
    var tid = el.getAttribute('data-testid') || '';
    if (tid === 'user-message') return 'user';
    if (tid === 'assistant-message') return 'assistant';
    if (el.querySelector('.cds-user-message-body')) return 'user';
    return 'assistant';
  }

  function claudeComposerExport() {
    var model = findModelButton();
    if (!model) return null;
    var slot = findComposerBarSlot(model);
    if (!slot) return null;
    var iconFrom = findAttachButton() || model;
    return {
      el: slot,
      insertAfter: model,
      nativeFrom: model,
      nativeIconFrom: iconFrom,
      downloadSvg: function () {
        return (
          '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="chat-export-dl-icon shrink-0">' +
          '<path d="M10 2.75a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.5A.75.75 0 0 1 10 2.75z"/>' +
          '<path d="M3.75 14.5a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75z"/>' +
          '</svg>'
        );
      }
    };
  }

  CE.definePlatform({
    id: 'claude',
    modifier: 'claude',
    fenceTag: 'claude',
    exportData: exportDataFromApi,
    active: function () {
      return pmVisible(findProseMirror());
    },
    composer: claudeComposerExport,
    chatId: currentChatId,
    title: currentTitle,
    model: readModelFromDom,
    user: sessionUser,
    scroller: function () {
      var col = document.querySelector('[data-testid="chat-column-body"]');
      if (col && col.clientHeight > 100) return col;
      return CE.findOverflowScroller(document.querySelector('[data-testid="assistant-message"]'));
    },
    turns: function (root) {
      root = root || document;
      var nodes = root.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]');
      if (nodes.length) return Array.prototype.slice.call(nodes);
      return Array.prototype.slice.call(root.querySelectorAll('.group\\/message-row'));
    },
    capture: function (turn, assistantTag) {
      var role = roleOfTurn(turn);
      var body =
        role === 'user'
          ? turn.querySelector('.cds-user-message-body') || turn
          : turn.querySelector('[data-testid="assistant-message"]') || turn;
      var clone = body;
      if (role === 'assistant' && body && body.cloneNode) {
        clone = body.cloneNode(true);
        var drop = clone.querySelectorAll(
          '[data-testid*="thinking" i], [class*="thinking" i], button[aria-label*="thinking" i], button[aria-label*="размыш" i]'
        );
        for (var d = 0; d < drop.length; d++) {
          if (drop[d] && drop[d].parentNode) drop[d].parentNode.removeChild(drop[d]);
        }
      }
      var text = '';
      try {
        text = role === 'assistant' ? CE.htmlToMarkdown(clone) : (clone.innerText || clone.textContent || '').trim();
      } catch (e) {
        text = (clone.innerText || clone.textContent || '').trim();
      }
      if (!text) return null;
      return {
        role: role,
        roleTag: role === 'user' ? 'user' : assistantTag,
        text: text,
        links: CE.collectLinks(body)
      };
    },
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          var offset = 0;
          if (args && args.cursor != null && String(args.cursor) !== '') {
            offset = Math.max(0, parseInt(String(args.cursor), 10) || 0);
          }
          var pageSize = Math.max(limit, 20);
          var q =
            'limit=' +
            encodeURIComponent(String(pageSize)) +
            '&offset=' +
            encodeURIComponent(String(offset));
          var res = await apiFetch('/chat_conversations?' + q);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
          if (!res.ok) {
            var body = await res.text();
            rpcErr('HOST_ERROR', 'list ' + res.status + ' ' + body.slice(0, 160));
          }
          var raw = await res.json();
          if (!Array.isArray(raw)) raw = (raw && raw.items) || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            if (!raw[i] || !raw[i].uuid) continue;
            var chat = toChat(raw[i]);
            if (args && args.containerId) {
              var pid = raw[i].project_uuid || raw[i].project_id || (raw[i].project && raw[i].project.uuid) || '';
              if (String(pid) !== String(args.containerId)) continue;
              chat.containerType = 'project';
              chat.containerId = String(pid);
              chat.containerTitle = (raw[i].project && raw[i].project.name) || '';
            } else if (raw[i].project_uuid || (raw[i].project && raw[i].project.uuid)) {
              chat.containerType = 'project';
              chat.containerId = String(raw[i].project_uuid || raw[i].project.uuid);
              chat.containerTitle = (raw[i].project && raw[i].project.name) || '';
            }
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          var nextCursor = raw.length >= pageSize ? String(offset + pageSize) : null;
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
          var branchMode = args && args.branch === 'all' ? 'all' : 'active';
          if (!chatId) {
            chatId = currentChatId();
            if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          }
          try {
            var payload = await fetchConversationApi(chatId, branchMode);
            return {
              platform: 'claude',
              url: chatId === currentChatId() ? location.href : chatUrl(chatId),
              title: payload.title || '',
              chatId: chatId,
              model: payload.model || '',
              userName: payload.userName || '',
              userHandle: payload.userHandle || '',
              userEmail: payload.userEmail || '',
              branch: payload.branch || branchMode,
              messages: payload.messages || []
            };
          } catch (apiErr) {
            if (apiErr && (apiErr.code === 'NOT_FOUND' || apiErr.code === 'UNAUTHORIZED')) throw apiErr;
            if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
              var live = await ctx.getData();
              return Object.assign(
                { platform: 'claude', url: location.href, branch: branchMode, chatId: chatId },
                live || {}
              );
            }
            throw apiErr;
          }
        } catch (err) {
          hostErr(err);
        }
      },
      containers: async function (args) {
        try {
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          var res = await apiFetch('/projects?limit=' + encodeURIComponent(String(Math.max(limit, 50))));
          if (res.status === 404) return { items: [], nextCursor: null };
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'projects ' + res.status);
          if (!res.ok) {
            var body = await res.text();
            rpcErr('HOST_ERROR', 'projects ' + res.status + ' ' + body.slice(0, 160));
          }
          var raw = await res.json();
          if (!Array.isArray(raw)) raw = (raw && raw.items) || (raw && raw.data) || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            var p = raw[i];
            if (!p) continue;
            var id = p.uuid || p.id || p.project_uuid || '';
            if (!id) continue;
            var title = p.name || p.title || id;
            if (Ops.matchQuery && !Ops.matchQuery(title, args && args.query)) continue;
            items.push({
              platform: 'claude',
              containerId: String(id),
              containerType: 'project',
              title: title,
              url: location.origin + '/project/' + encodeURIComponent(String(id)),
              chatCount: typeof p.chat_count === 'number' ? p.chat_count : undefined
            });
          }
          return { items: items, nextCursor: null };
        } catch (err) {
          if (err && err.code) throw err;
          return { items: [], nextCursor: null };
        }
      },
      containerChats: async function (args) {
        try {
          var containerId = args && args.containerId ? String(args.containerId) : '';
          if (!containerId) rpcErr('BAD_REQUEST', 'containerId required');
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          var items = [];
          var seen = {};
          var res = await apiFetch(
            '/projects/' +
              encodeURIComponent(containerId) +
              '/conversations?limit=' +
              encodeURIComponent(String(Math.max(limit, 50)))
          );
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'project chats ' + res.status);
          if (res.ok) {
            var raw = await res.json();
            if (!Array.isArray(raw)) raw = (raw && raw.items) || (raw && raw.data) || [];
            var i;
            for (i = 0; i < raw.length && items.length < limit; i++) {
              if (!raw[i] || !raw[i].uuid) continue;
              var chat = toChat(raw[i]);
              chat.containerType = 'project';
              chat.containerId = containerId;
              chat.containerTitle = (raw[i].project && raw[i].project.name) || '';
              if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
              seen[chat.chatId] = 1;
              items.push(chat);
            }
          } else if (res.status !== 404) {
            var errBody = await res.text();
            rpcErr('HOST_ERROR', 'project chats ' + res.status + ' ' + errBody.slice(0, 160));
          }
          if (items.length < limit) {
            var listed = await CE.platforms.claude.ops.list({
              containerId: containerId,
              limit: limit,
              query: args && args.query
            });
            var extra = (listed && listed.items) || [];
            var j;
            for (j = 0; j < extra.length && items.length < limit; j++) {
              if (!extra[j] || !extra[j].chatId || seen[extra[j].chatId]) continue;
              seen[extra[j].chatId] = 1;
              items.push(extra[j]);
            }
          }
          return { items: items, nextCursor: null };
        } catch (err) {
          hostErr(err);
        }
      },
      containerCreate: async function (args) {
        try {
          var name = String((args && args.name) || '').trim();
          if (!name) rpcErr('BAD_REQUEST', 'name required');
          var description = String((args && args.description) || '').trim();
          var res = await apiFetch('/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, description: description || '', is_private: true })
          });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'project create ' + res.status);
          if (!res.ok) {
            var body = await res.text();
            rpcErr('HOST_ERROR', 'project create ' + res.status + ' ' + body.slice(0, 160));
          }
          var data = await res.json();
          var id = (data && (data.uuid || data.id || data.project_uuid)) || '';
          if (!id) rpcErr('HOST_ERROR', 'project uuid missing after create');
          return {
            platform: 'claude',
            containerId: String(id),
            containerType: 'project',
            title: (data && (data.name || data.title)) || name,
            url: location.origin + '/project/' + encodeURIComponent(String(id))
          };
        } catch (err) {
          hostErr(err);
        }
      },
      containerMoveChat: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          var containerId =
            args && args.containerId != null && String(args.containerId) !== ''
              ? String(args.containerId)
              : null;
          var res = await apiFetch('/chat_conversations/' + encodeURIComponent(chatId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_uuid: containerId })
          });
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'move chat ' + res.status);
          if (!res.ok) {
            var t = await res.text();
            rpcErr('HOST_ERROR', 'move chat ' + res.status + ' ' + t.slice(0, 160));
          }
          return {
            platform: 'claude',
            chatId: chatId,
            containerId: containerId,
            containerType: containerId ? 'project' : null
          };
        } catch (err) {
          hostErr(err);
        }
      },
      containerDelete: async function (args) {
        try {
          var containerId = args && args.containerId ? String(args.containerId) : '';
          if (!containerId) rpcErr('BAD_REQUEST', 'containerId required');
          var res = await apiFetch('/projects/' + encodeURIComponent(containerId), { method: 'DELETE' });
          if (res.status === 404) rpcErr('NOT_FOUND', 'project not found: ' + containerId);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'project delete ' + res.status);
          if (!(res.status >= 200 && res.status < 300)) {
            var body = await res.text();
            rpcErr('HOST_ERROR', 'project delete ' + res.status + ' ' + body.slice(0, 160));
          }
          return { deleted: true, containerId: containerId };
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
        var pm = findProseMirror();
        return {
          generating: isGenerating(),
          composerReady: pmVisible(pm) && Ops.composerReady(pm)
        };
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var text = String((args && args.text) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          if (currentChatId() !== chatId) {
            if (Ops.softNavigate) Ops.softNavigate('/chat/' + chatId);
            else {
              history.pushState({}, '', '/chat/' + chatId);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            await Ops.waitFor(
              function () {
                return currentChatId() === chatId && pmVisible(findProseMirror());
              },
              { timeoutMs: 25000, message: 'Claude navigate timeout' }
            );
          }
          await waitForIdle();
          var applied = await applyOptions(args);
          await submitComposer(text);
          await Ops.waitFor(
            function () {
              return isGenerating() ? null : true;
            },
            { timeoutMs: 180000, message: 'Claude reply timeout' }
          );
          var out = {
            platform: 'claude',
            chatId: chatId,
            title: currentTitle(),
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
          if (applied && Object.keys(applied).length) out.applied = applied;
          return out;
        } catch (err) {
          hostErr(err);
        }
      },
      askSelection: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var selection = String((args && args.selection) || '').trim();
          var prompt = String((args && args.prompt) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!selection) rpcErr('BAD_REQUEST', 'selection required');
          if (!prompt) rpcErr('BAD_REQUEST', 'prompt required');
          var before = await CE.platforms.claude.ops.get({ chatId: chatId, branch: 'active' }, ctx);
          var beforeLen = ((before && before.messages) || []).length;
          var text = Ops.quoteSelectionPrompt
            ? Ops.quoteSelectionPrompt(selection, prompt)
            : '> ' + selection + '\n\n' + prompt;
          await CE.platforms.claude.ops.send({ chatId: chatId, text: text });
          var got = null;
          var deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            var cur = await CE.platforms.claude.ops.get({ chatId: chatId, branch: 'active' }, ctx);
            var msgs = (cur && cur.messages) || [];
            if (msgs.length > beforeLen) {
              var lastMsg = msgs[msgs.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && String(lastMsg.text || '').trim()) {
                got = cur;
                break;
              }
            }
            await Ops.sleep(400);
          }
          if (!got) rpcErr('TIMEOUT', 'Claude ask_selection reply timeout');
          var messages = (got && got.messages) || [];
          var reply = null;
          var after = null;
          var i;
          for (i = messages.length - 1; i >= 0; i--) {
            if (messages[i] && messages[i].role === 'assistant' && messages[i].text) {
              reply = messages[i];
              after = i;
              break;
            }
          }
          return {
            status: 'done',
            platform: 'claude',
            chatId: chatId,
            selection: selection,
            reply: reply,
            after: after,
            total: messages.length
          };
        } catch (err) {
          hostErr(err);
        }
      },
      create: async function (args) {
        try {
          var text = String((args && args.text) || '').trim();
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          var title = Ops.testTitle ? Ops.testTitle(args && args.title) : '[ce-test] chat';
          await ensureNewChat();
          var applied = await applyOptions(args);
          await submitComposer(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              return id || null;
            },
            { timeoutMs: 90000, message: 'Claude chatId timeout' }
          );
          await maybeRename(chatId, title);
          var result = {
            platform: 'claude',
            chatId: chatId,
            title: title,
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
          if (applied && Object.keys(applied).length) result.applied = applied;
          return result;
        } catch (err) {
          hostErr(err);
        }
      },
      delete: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          var res = await apiFetch('/chat_conversations/' + encodeURIComponent(chatId), { method: 'DELETE' });
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          if (!(res.status >= 200 && res.status < 300)) {
            var body = await res.text();
            rpcErr('HOST_ERROR', 'delete ' + res.status + ' ' + body.slice(0, 160));
          }
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
