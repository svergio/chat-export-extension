(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  function chatIdFromUrl() {
    var m = location.pathname.match(/\/c\/([0-9a-fA-F-]{8,})/);
    return m ? m[1] : '';
  }

  function findTitle() {
    var h1 = document.querySelector('#grok-page-content h1, main h1, [data-testid="conversation-title"]');
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    var t = document.title || '';
    t = t.replace(/\s*[|\u2013\u2014-]\s*Grok\s*$/i, '').trim();
    return t || 'chat';
  }

  function findModel() {
    var btn =
      document.querySelector('form[data-composer="true"] button[aria-label^="Модель"]') ||
      document.querySelector('form[data-composer="true"] button[aria-label*="Model" i]') ||
      document.querySelector('button[aria-label^="Модель"]') ||
      document.querySelector('button[aria-label*="Model" i]');
    if (!btn) return '';
    var aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    var labeled = aria.match(/^(?:Модель|Model)\s*[:：]\s*(.+)$/i);
    if (labeled && labeled[1].trim()) return labeled[1].trim();
    var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    if (t && t.length < 48 && !/^модель$|^model$/i.test(t)) return t;
    return '';
  }

  function findUserMeta() {
    var out = { userName: '', userHandle: '', userEmail: '' };
    var selectors = [
      '[data-testid="user-menu"]',
      '[data-testid="account-menu"]',
      'button[aria-label*="account" i]',
      'button[aria-label*="profile" i]',
      'button[aria-label*="user" i]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (!el) continue;
      var label = el.getAttribute('aria-label') || el.textContent || '';
      label = label.replace(/\s+/g, ' ').trim();
      if (label && label.length < 80) out.userName = label;
      break;
    }
    var handle = document.querySelector('a[href^="/"] span, [data-testid*="username" i]');
    if (handle) {
      var h = (handle.textContent || '').trim();
      if (h.charAt(0) === '@') out.userHandle = h;
    }
    return out;
  }

  function isUserTurn(el) {
    if (el.classList && el.classList.contains('items-end')) return true;
    if (el.closest && el.closest('.items-end')) return true;
    var cls = el.className || '';
    if (typeof cls === 'string' && /\bitems-end\b/.test(cls)) return true;
    // Walk self + first few ancestors for flex alignment class
    var node = el;
    for (var d = 0; d < 4 && node; d++) {
      var c = node.className || '';
      if (typeof c === 'string') {
        if (/\bitems-end\b/.test(c)) return true;
        if (/\bitems-start\b/.test(c)) return false;
      }
      node = node.parentElement;
    }
    return false;
  }

  function bodyRoot(turn) {
    return (
      turn.querySelector('.response-content-markdown') ||
      turn.querySelector('[class*="response-content-markdown"]') ||
      turn
    );
  }

  function dropGrokHost(items) {
    return (items || []).filter(function (s) {
      var url = (s && (s.url || s.href)) || '';
      return url && !/grok\.com/i.test(url);
    });
  }

  function extractSourcesSync(turn, body) {
    var raw = [];
    var scope = turn;

    function pushFrom(root) {
      if (!root) return;
      var links = CE.collectLinks(root);
      for (var L = 0; L < links.length; L++) {
        raw.push({ title: links[L].text, url: links[L].href });
      }
    }

    pushFrom(scope);
    if (body) pushFrom(body);

    turn.dispatchEvent(
      new CustomEvent('chat-export-harvest', { bubbles: true, detail: { turnId: turn.id } })
    );
    var harvested = turn.getAttribute('data-ce-sources');
    if (harvested) {
      turn.removeAttribute('data-ce-sources');
      try {
        var parsed = JSON.parse(harvested);
        for (var p = 0; p < parsed.length; p++) raw.push(parsed[p]);
      } catch (e) {}
    }

    var fiberRoots = [
      scope,
      scope.querySelector('[data-testid="assistant-message"]'),
      CE.findSourcesTrigger(scope)
    ];
    for (var f = 0; f < fiberRoots.length; f++) {
      if (!fiberRoots[f]) continue;
      var fromFiber = CE.collectSourcesFromFiber(fiberRoots[f]);
      for (var fi = 0; fi < fromFiber.length; fi++) raw.push(fromFiber[fi]);
    }

    var sources = CE.dedupeSources(dropGrokHost(raw));
    if (!sources.length) {
      sources = CE.dedupeSources(dropGrokHost(CE.collectFaviconSources(scope)));
    }
    return sources;
  }

  function liveScroller() {
    var turn = document.querySelector('[id^="response-"]');
    return CE.findOverflowScroller(turn);
  }

  function turnNodes(root) {
    root = root || liveScroller() || document;
    return Array.prototype.slice.call(root.querySelectorAll('[id^="response-"]'));
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    return el.id || (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 96) || 'n' + i;
  }

  function messageFromTurn(turn, assistantTag) {
    var user = isUserTurn(turn);
    var body = bodyRoot(turn);
    var text = '';
    if (user) {
      text = (body.innerText || body.textContent || '').trim();
    } else {
      try {
        text = CE.htmlToMarkdown(body);
      } catch (e) {
        text = (body.innerText || body.textContent || '').trim();
      }
    }
    if (!text) return null;
    if (user) {
      return {
        role: 'user',
        roleTag: 'user',
        text: text,
        links: CE.collectLinks(body)
      };
    }
    var links = dropGrokHost(CE.collectLinks(body));
    var sources = extractSourcesSync(turn, body);
    if (!sources.length && links.length) {
      sources = CE.dedupeSources(links.map(function (l) {
        return { title: l.text, url: l.href };
      }));
    }
    return {
      role: 'assistant',
      roleTag: assistantTag,
      text: text,
      links: links,
      sources: CE.dedupeSources(dropGrokHost(sources || []))
    };
  }

  function isFlexish(el) {
    if (!el) return false;
    try {
      var d = window.getComputedStyle(el).display;
      return d === 'flex' || d === 'inline-flex';
    } catch (e) {
      return false;
    }
  }

  function findComposerToolbar() {
    var form =
      document.querySelector('form[data-composer="true"]') ||
      document.querySelector('form') ||
      document.querySelector('#grok-content-area form') ||
      document.querySelector('#grok-app-root form');
    if (!form) return null;

    var modelBtn =
      form.querySelector('button[aria-label^="Модель"]') ||
      form.querySelector('button[aria-label*="Model" i]');

    var attachBtn =
      form.querySelector('button[aria-label*="Добавить файлы" i]') ||
      form.querySelector('button[aria-label*="Attach" i]') ||
      form.querySelector('button[aria-label*="Прикрепить" i]');

    // Grok composer is CSS grid ("leading field actions") with a display:contents
    // toolbar. A new direct child becomes an extra grid item and overlaps the input.
    // Mount inside an existing flex slot instead.
    var slot = null;
    var insertAfter = null;
    if (modelBtn && isFlexish(modelBtn.parentElement)) {
      slot = modelBtn.parentElement;
      insertAfter = modelBtn;
    } else if (attachBtn && isFlexish(attachBtn.parentElement)) {
      slot = attachBtn.parentElement;
      insertAfter = attachBtn;
    } else {
      var bottom = form.querySelector('.flex.absolute.inset-x-0.bottom-0');
      var row = (bottom && bottom.querySelector('.grow')) || bottom;
      if (!row) {
        var input =
          form.querySelector('[data-testid="chat-input"]') ||
          form.querySelector('[contenteditable="true"]');
        row = (input && input.parentElement) || form;
      }
      slot = row;
      insertAfter = modelBtn;
    }

    var nativeFrom =
      modelBtn ||
      attachBtn ||
      (slot && slot.querySelector('button')) ||
      form.querySelector('button');

    var nativeIconFrom =
      form.querySelector('button[aria-label*="Диктовка" i]') ||
      form.querySelector('button[aria-label*="dictat" i]') ||
      form.querySelector('button[aria-label*="голос" i]') ||
      form.querySelector('button[aria-label*="Voice" i]') ||
      form.querySelector('button[aria-label*="голосовой" i]');

    return {
      el: slot,
      insertAfter: insertAfter,
      nativeFrom: nativeFrom,
      nativeIconFrom: nativeIconFrom
    };
  }

  var Ops = CE.Ops || {};
  var PAGE_GUARD = 20;

  function rpcErr(code, message, details) {
    throw new CE.RpcError(code, message, details);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function findByLabel(selector, re, root) {
    var list = (root || document).querySelectorAll(selector);
    for (var i = 0; i < list.length; i++) {
      if (!visible(list[i])) continue;
      if (re.test(labelOf(list[i]))) return list[i];
    }
    return null;
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: Object.assign({ Accept: 'application/json' }, opts.headers || {}),
      body: opts.body
    });
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

  function projectUrl(id) {
    return location.origin + '/project/' + id;
  }

  function toContainer(w) {
    var id = w && (w.workspaceId || w.id);
    if (!id) return null;
    return {
      platform: 'grok',
      containerId: String(id),
      containerType: 'project',
      title: w.name || String(id),
      url: projectUrl(id),
      updatedAt: Ops.toIso(w.lastUseTime || w.createTime)
    };
  }

  function toChat(row, container) {
    var id = row.conversationId || row.id;
    var chat = {
      platform: 'grok',
      chatId: String(id),
      title: row.title || '',
      url: location.origin + '/c/' + id,
      updatedAt: Ops.toIso(row.modifyTime || row.createTime),
      createdAt: Ops.toIso(row.createTime)
    };
    if (container) {
      chat.containerType = 'project';
      chat.containerId = container.containerId;
      if (container.title) chat.containerTitle = container.title;
    }
    return chat;
  }

  async function apiProjects() {
    var items = [];
    var token = '';
    for (var page = 0; page < PAGE_GUARD; page++) {
      var res = await apiFetch('/rest/workspaces?pageSize=50' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
      if (!res.ok) await failFromResponse(res, 'projects');
      var data = await res.json();
      var rows = (data && data.workspaces) || [];
      for (var i = 0; i < rows.length; i++) {
        var c = toContainer(rows[i]);
        if (c) items.push(c);
      }
      token = data && data.nextPageToken ? String(data.nextPageToken) : '';
      if (!token) break;
    }
    return items;
  }

  function projectRows() {
    return Array.prototype.slice.call(document.querySelectorAll('button[data-project-row]'));
  }

  function rowTitle(row) {
    var label = row.querySelector('[data-sidebar-item-label]');
    return ((label || row).textContent || '').replace(/\s+/g, ' ').trim();
  }

  function domProjects() {
    return projectRows().map(function (row) {
      var id = row.getAttribute('data-project-row');
      return {
        platform: 'grok',
        containerId: id,
        containerType: 'project',
        title: rowTitle(row) || id,
        url: projectUrl(id),
        updatedAt: null
      };
    });
  }

  async function listProjects() {
    var items = [];
    try {
      items = await apiProjects();
    } catch (err) {
      if (err && (err.code === 'UNAUTHORIZED' || err.code === 'RATE_LIMIT')) throw err;
    }
    var seen = {};
    items.forEach(function (c) {
      seen[c.containerId] = true;
    });
    domProjects().forEach(function (c) {
      if (!seen[c.containerId]) items.push(c);
    });
    return items;
  }

  async function findProject(containerId) {
    var all = await listProjects();
    for (var i = 0; i < all.length; i++) {
      if (all[i].containerId === containerId) return all[i];
    }
    return null;
  }

  function projectGroup(container) {
    var row = document.querySelector('button[data-project-row="' + container.containerId + '"]');
    if (!row) return { row: null, group: null };
    var scope = row.closest('[data-open], div');
    while (scope && !scope.querySelector('[role="group"]')) scope = scope.parentElement;
    var groups = scope ? scope.querySelectorAll('[role="group"]') : [];
    var group = null;
    for (var i = 0; i < groups.length; i++) {
      if ((groups[i].getAttribute('aria-label') || '') === container.title) {
        group = groups[i];
        break;
      }
    }
    return { row: row, group: group || groups[0] || null };
  }

  async function expandProject(container) {
    var found = projectGroup(container);
    if (!found.row) return found;
    if (found.row.getAttribute('aria-expanded') === 'false') {
      Ops.clickEl(found.row);
      await Ops.sleep(300);
      found = projectGroup(container);
    }
    return found;
  }

  async function domProjectChats(container) {
    var found = await expandProject(container);
    var out = [];
    if (!found.group) return out;
    var anchors = found.group.querySelectorAll('a[href*="/c/"]');
    var seen = {};
    for (var i = 0; i < anchors.length; i++) {
      var m = (anchors[i].getAttribute('href') || '').match(/\/c\/([0-9a-fA-F-]{8,})/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = true;
      out.push(
        toChat({ conversationId: m[1], title: (anchors[i].textContent || '').replace(/\s+/g, ' ').trim() }, container)
      );
    }
    return out;
  }

  async function apiProjectChats(container, args) {
    var limit = Ops.clampLimit(args && args.limit);
    var token = args && args.cursor != null && String(args.cursor) !== '' ? String(args.cursor) : '';
    var items = [];
    var next = null;
    for (var page = 0; page < PAGE_GUARD; page++) {
      var res = await apiFetch(
        '/rest/app-chat/conversations?pageSize=' +
          Math.max(limit, 20) +
          '&workspaceId=' +
          encodeURIComponent(container.containerId) +
          (token ? '&pageToken=' + encodeURIComponent(token) : '')
      );
      if (!res.ok) await failFromResponse(res, 'project chats');
      var data = await res.json();
      var rows = (data && data.conversations) || [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] && (rows[i].conversationId || rows[i].id)) items.push(toChat(rows[i], container));
      }
      next = data && data.nextPageToken ? String(data.nextPageToken) : null;
      if (!next || items.length >= limit) break;
      token = next;
    }
    return { items: items, nextCursor: next };
  }

  function projectIdFromUrl() {
    var m = location.pathname.match(/\/project\/([0-9a-fA-F-]{8,})/);
    return m ? m[1] : '';
  }

  async function createViaDom(name, args) {
    var before = {};
    (await listProjects()).forEach(function (c) {
      before[c.containerId] = true;
    });
    var addBtn = findByLabel('button, a, [role="button"]', /^(новый проект|new project|создать проект|create project)$/i);
    if (!addBtn) rpcErr('HOST_ERROR', 'new project button not found');
    Ops.clickEl(addBtn);
    var dialog = await Ops.waitFor(
      function () {
        var list = document.querySelectorAll('[role="dialog"], [role="alertdialog"], form');
        for (var i = 0; i < list.length; i++) {
          if (list[i].matches('form[data-composer="true"]') || list[i].closest('form[data-composer="true"]')) continue;
          if (visible(list[i]) && list[i].querySelector('input:not([type="hidden"]):not([type="file"]), textarea')) {
            return list[i];
          }
        }
        return null;
      },
      { timeoutMs: 10000, message: 'new project dialog did not open' }
    );
    var fields = dialog.querySelectorAll('input:not([type="hidden"]):not([type="file"]), textarea');
    Ops.setNativeValue(fields[0], name);
    var extra = String((args && (args.instructions || args.description)) || '').trim();
    if (extra && fields.length > 1) Ops.setNativeValue(fields[fields.length - 1], extra);
    var confirm = await Ops.waitFor(
      function () {
        var btns = dialog.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].disabled || btns[i].getAttribute('aria-disabled') === 'true') continue;
          var t = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (/^(создать( проект)?|create( project)?|сохранить|save)$/i.test(t)) return btns[i];
        }
        return null;
      },
      { timeoutMs: 8000, message: 'create project button not enabled' }
    );
    Ops.clickEl(confirm);
    var created = await Ops.waitFor(
      function () {
        var fromUrl = projectIdFromUrl();
        return fromUrl && !before[fromUrl] ? fromUrl : null;
      },
      { timeoutMs: 15000, message: 'project was not created' }
    ).catch(function () {
      return '';
    });
    if (created) return created;
    var after = await listProjects();
    for (var i = 0; i < after.length; i++) {
      if (!before[after[i].containerId] && after[i].title === name) return after[i].containerId;
    }
    rpcErr('HOST_ERROR', 'project created but id not found');
  }

  async function menuAction(trigger, itemRe, message) {
    var menu = await Ops.openMenu(trigger, { message: message });
    var picked = Ops.pickMenuItem(menu, itemRe);
    if (!picked) {
      Ops.closeMenu(document);
      rpcErr('OPTION_NOT_FOUND', message);
    }
    return picked;
  }

  async function confirmDialog(re, message) {
    var btn = await Ops.waitFor(
      function () {
        var list = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
        for (var i = 0; i < list.length; i++) {
          if (!visible(list[i])) continue;
          var btns = list[i].querySelectorAll('button');
          for (var j = 0; j < btns.length; j++) {
            var t = (btns[j].textContent || '').replace(/\s+/g, ' ').trim();
            if (re.test(t) && !btns[j].disabled) return btns[j];
          }
        }
        return null;
      },
      { timeoutMs: 8000, message: message }
    );
    Ops.clickEl(btn);
  }

  async function deleteViaDom(container) {
    var trigger = document.querySelector(
      'button[aria-label="Действия для ' + container.title.replace(/"/g, '\\"') + '"], button[aria-label="Actions for ' + container.title.replace(/"/g, '\\"') + '"]'
    );
    if (!trigger) rpcErr('NOT_FOUND', 'project row not found in sidebar: ' + container.title);
    await menuAction(trigger, /удалить|delete/i, 'delete project menu item not found');
    await confirmDialog(/^(удалить|delete)$/i, 'delete confirmation not found');
    await Ops.waitFor(
      function () {
        return !document.querySelector('button[data-project-row="' + container.containerId + '"]') ? true : null;
      },
      { timeoutMs: 10000, message: 'project row still present after delete' }
    );
  }

  async function moveViaDom(chatId, target) {
    var link = document.querySelector('a[href$="/c/' + chatId + '"], a[href*="/c/' + chatId + '"]');
    if (!link) rpcErr('NOT_FOUND', 'chat not visible in sidebar: ' + chatId);
    var row = link.parentElement;
    var trigger = null;
    for (var depth = 0; row && depth < 5 && !trigger; depth++) {
      trigger = row.querySelector('button[aria-haspopup="menu"][aria-label]');
      row = row.parentElement;
    }
    if (!trigger) rpcErr('HOST_ERROR', 'chat actions button not found');
    var item = await menuAction(
      trigger,
      target ? /в проект|to project|project/i : /из проекта|from project/i,
      'move menu item not found'
    );
    if (!target) return;
    var re = new RegExp('^\\s*' + escapeRe(target.title) + '\\s*$', 'i');
    var sub = await Ops.waitFor(
      function () {
        var items = Ops.readMenuItems(Ops.locateMenuRoot(document, item.el) || document.body);
        for (var i = 0; i < items.length; i++) {
          if (re.test(items[i].label)) return items[i];
        }
        return null;
      },
      { timeoutMs: 8000, message: 'target project not found in move menu' }
    );
    Ops.clickEl(sub.el);
  }

  function currentChatId() {
    var id = chatIdFromUrl();
    if (id) return id;
    var link = document.querySelector('a[href*="/c/"]');
    if (link) {
      var m = String(link.getAttribute('href') || '').match(/\/c\/([0-9a-fA-F-]{8,})/);
      if (m) return m[1];
    }
    return '';
  }

  function responseTurnCount() {
    return turnNodes().length;
  }

  function isPlaceholderAssistantText(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return true;
    if (/^(thinking|размышл|\.{3,}|…)/i.test(t)) return true;
    return t.length < 2;
  }

  function toListChat(row) {
    var chat = toChat(row, null);
    var proj = row.workspaceId || row.projectId || (row.project && (row.project.id || row.project.projectId));
    if (proj) {
      chat.containerType = 'project';
      chat.containerId = String(proj);
      chat.containerTitle = (row.project && (row.project.name || row.project.title)) || row.workspaceName || '';
    }
    return chat;
  }

  function roleTagForGrok(sender, model) {
    var role = String(sender || '').toLowerCase();
    if (role === 'human' || role === 'user') return 'user';
    if (CE.modelFenceTag) return CE.modelFenceTag(model, 'grok');
    return 'grok';
  }

  async function loadConversationMessages(chatId) {
    var nodeRes = await apiFetch('/rest/app-chat/conversations/' + encodeURIComponent(chatId) + '/response-node');
    if (nodeRes.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
    if (!nodeRes.ok) await failFromResponse(nodeRes, 'response-node');
    var node = await nodeRes.json();
    var ids = (node.responseNodes || []).map(function (n) {
      return n.responseId;
    }).filter(Boolean);
    var responses = [];
    var off;
    for (off = 0; off < ids.length; off += 40) {
      var chunk = ids.slice(off, off + 40);
      var lr = await apiFetch('/rest/app-chat/conversations/' + encodeURIComponent(chatId) + '/load-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseIds: chunk })
      });
      if (!lr.ok) await failFromResponse(lr, 'load-responses');
      var data = await lr.json();
      var rows = (data && data.responses) || [];
      var i;
      for (i = 0; i < rows.length; i++) responses.push(rows[i]);
    }
    var byId = {};
    var r;
    for (r = 0; r < responses.length; r++) {
      if (responses[r] && responses[r].responseId) byId[responses[r].responseId] = responses[r];
    }
    var ordered = [];
    var j;
    for (j = 0; j < ids.length; j++) {
      var resp = byId[ids[j]];
      if (!resp) continue;
      var sender = String(resp.sender || '').toLowerCase();
      if (sender !== 'human' && sender !== 'assistant' && sender !== 'user') continue;
      var text = String(resp.message || '').trim();
      if (!text) continue;
      var role = sender === 'human' || sender === 'user' ? 'user' : 'assistant';
      var sources = CE.dedupeSources(
        dropGrokHost(
          (resp.citedWebSearchResults || [])
            .concat(resp.webSearchResults || [])
            .map(function (s) {
              return { title: s.title || s.url, url: s.url || s.href };
            })
        )
      );
      ordered.push({
        role: role,
        roleTag: roleTagForGrok(sender, resp.model),
        text: text,
        links: [],
        sources: sources
      });
    }
    return ordered;
  }

  function findComposerInput() {
    var form = document.querySelector('form[data-composer="true"]') || document.querySelector('#grok-content-area form');
    if (!form) return null;
    return (
      form.querySelector('[data-testid="chat-input"] [contenteditable="true"]') ||
      form.querySelector('[contenteditable="true"][role="textbox"]') ||
      form.querySelector('textarea')
    );
  }

  function findSendButton() {
    var form = document.querySelector('form[data-composer="true"]') || document;
    var btns = form.querySelectorAll('button');
    var i;
    for (i = 0; i < btns.length; i++) {
      var b = btns[i];
      var label = btnBlob(b);
      if (/send|отправ|submit/i.test(label)) return b;
      if (b.getAttribute('type') === 'submit') return b;
    }
    return form.querySelector('button[type="submit"]');
  }

  function isGenerating() {
    if (Ops.findStopControl && Ops.findStopControl(document)) return true;
    var input = findComposerInput();
    if (!input) return false;
    var send = findSendButton();
    if (send && (send.disabled || send.getAttribute('aria-disabled') === 'true')) return true;
    return false;
  }

  async function ensureNewChat() {
    if (!currentChatId() && findComposerInput()) return;
    if (Ops.softNavigate) Ops.softNavigate('/');
    else {
      history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    await Ops.waitFor(
      function () {
        return !currentChatId() && findComposerInput();
      },
      { timeoutMs: 25000, message: 'Grok new chat timeout' }
    );
  }

  function findFileInput() {
    var form =
      document.querySelector('form[data-composer="true"]') ||
      document.querySelector('#grok-content-area form') ||
      document.querySelector('form');
    if (form) {
      var inp = form.querySelector('input[type="file"]');
      if (inp) return inp;
    }
    return document.querySelector('input[type="file"]');
  }

  function findAttachButton() {
    var form =
      document.querySelector('form[data-composer="true"]') || document.querySelector('#grok-content-area form');
    if (!form) return null;
    return (
      form.querySelector('button[aria-label*="Добавить файлы" i]') ||
      form.querySelector('button[aria-label*="Attach" i]') ||
      form.querySelector('button[aria-label*="Прикрепить" i]')
    );
  }

  async function applyWireFiles(files) {
    var list = Array.isArray(files) ? files : [];
    if (!list.length) return;
    var input = findFileInput();
    if (!input) {
      var attach = findAttachButton();
      if (attach) Ops.clickEl(attach);
      input = await Ops.waitFor(findFileInput, { timeoutMs: 10000, message: 'ATTACH_UNSUPPORTED' });
    }
    if (!input) rpcErr('ATTACH_UNSUPPORTED', 'file input not found');
    var n = Ops.setFileInputFiles(input, list);
    var names = list.map(function (f) {
      return f && f.name;
    }).filter(Boolean);
    var form =
      document.querySelector('form[data-composer="true"]') ||
      document.querySelector('#grok-content-area form') ||
      document;
    await Ops.waitAttachChips(form, n, {
      timeoutMs: 120000,
      names: names,
      fileInput: input,
      allowSpinner: true,
      message: 'ATTACH_TIMEOUT'
    });
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId) return;
    var path = '/c/' + chatId;
    if (Ops.softNavigate) Ops.softNavigate(path);
    else {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    await Ops.waitFor(
      function () {
        return currentChatId() === chatId;
      },
      { timeoutMs: 25000, message: 'Grok navigate timeout' }
    );
  }

  async function submitComposerText(text) {
    var body = String(text || '').trim();
    if (!body) rpcErr('BAD_REQUEST', 'text is required');
    var input = await Ops.waitFor(findComposerInput, {
      timeoutMs: 15000,
      message: 'Grok composer timeout'
    });
    var fill = Ops.fillRichComposer || Ops.fillEditable;
    fill(input, body);
    await Ops.sleep(200);
    var send = findSendButton();
    var turnsBefore = responseTurnCount();
    if (Ops.ensureComposerSubmitted) {
      await Ops.ensureComposerSubmitted({
        send: send,
        input: input,
        message: 'Grok submit failed',
        isDone: function () {
          return isGenerating() || responseTurnCount() > turnsBefore ? true : null;
        }
      });
    } else if (send) {
      Ops.clickEl(send);
    } else if (Ops.dispatchEnter) {
      Ops.dispatchEnter(input);
    }
    return turnsBefore;
  }

  async function waitAssistantReply(turnsBefore, timeoutMs) {
    await Ops.waitFor(
      function () {
        if (responseTurnCount() > turnsBefore && !isGenerating()) return true;
        if (isGenerating()) return null;
        return responseTurnCount() > turnsBefore ? true : null;
      },
      { timeoutMs: timeoutMs || 180000, message: 'Grok reply timeout' }
    );
  }

  async function detectGrokCapabilities() {
    var model = findModel();
    var models = [];
    if (model) models.push({ id: Ops.normalizeId(model), label: model, kind: 'model' });
    return {
      platform: 'grok',
      projectsSupported: true,
      models: models,
      modes: models.slice(),
      toggles: [],
      tools: [],
      attach: { supported: true, multiple: true, accept: [] },
      current: { model: model ? Ops.normalizeId(model) : undefined, mode: model ? Ops.normalizeId(model) : undefined, toggles: [] },
      detectedAt: new Date().toISOString()
    };
  }

  function btnBlob(btn) {
    return (
      (btn.getAttribute('aria-label') || '') +
      ' ' +
      (btn.getAttribute('title') || '') +
      ' ' +
      (btn.textContent || '')
    ).replace(/\s+/g, ' ').trim();
  }

  async function chatSummary(chatId, container) {
    var res = await apiFetch('/rest/app-chat/conversations/' + encodeURIComponent(chatId));
    if (res.ok) {
      var data = await res.json();
      var row = (data && (data.conversation || data)) || {};
      if (!row.conversationId && !row.id) row.conversationId = chatId;
      return toChat(row, container);
    }
    return toChat({ conversationId: chatId, title: '' }, container);
  }

  CE.definePlatform({
    id: 'grok',
    modifier: 'grok',
    fenceTag: 'grok',
    composer: findComposerToolbar,
    chatId: chatIdFromUrl,
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
          var token = args && args.cursor != null && String(args.cursor) !== '' ? String(args.cursor) : '';
          var includeProjects = !(args && args.includeProjects === false);
          var res = await apiFetch(
            '/rest/app-chat/conversations?pageSize=' +
              encodeURIComponent(String(Math.max(limit, 20))) +
              '&excludeProjects=' +
              (includeProjects ? 'false' : 'true') +
              (token ? '&pageToken=' + encodeURIComponent(token) : '')
          );
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'Grok list ' + res.status);
          if (!res.ok) await failFromResponse(res, 'list');
          var data = await res.json();
          var raw = (data && data.conversations) || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            if (!raw[i] || !(raw[i].conversationId || raw[i].id)) continue;
            var chat = toListChat(raw[i]);
            if (args && args.containerId && String(chat.containerId || '') !== String(args.containerId)) continue;
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          return {
            items: items,
            nextCursor: (data && data.nextPageToken) || null
          };
        } catch (err) {
          hostErr(err);
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            if (ctx && typeof ctx.getData === 'function') {
              var live = await ctx.getData();
              return Object.assign({ platform: 'grok', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
            var same = await ctx.getData();
            var u = findUserMeta();
            return Object.assign(
              {
                platform: 'grok',
                url: location.href,
                chatId: chatId,
                title: findTitle(),
                model: findModel(),
                userName: u.userName,
                userHandle: u.userHandle,
                userEmail: u.userEmail
              },
              same || {}
            );
          }
          var messages = await loadConversationMessages(chatId);
          var u2 = findUserMeta();
          return {
            platform: 'grok',
            url: location.origin + '/c/' + chatId,
            title: findTitle(),
            chatId: chatId,
            model: findModel(),
            userName: u2.userName,
            userHandle: u2.userHandle,
            userEmail: u2.userEmail,
            messages: messages
          };
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function () {
        try {
          return await detectGrokCapabilities();
        } catch (err) {
          hostErr(err);
        }
      },
      hostState: function () {
        var input = findComposerInput();
        return {
          generating: isGenerating(),
          composerReady: !!input && (Ops.composerReady ? Ops.composerReady(input) : true)
        };
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!String((args && args.text) || '').trim()) rpcErr('BAD_REQUEST', 'text is required');
          await navigateToChat(chatId);
          if (args.files && args.files.length) await applyWireFiles(args.files);
          var turnsBefore = await submitComposerText(args.text);
          await waitAssistantReply(turnsBefore, 180000);
          return {
            platform: 'grok',
            chatId: chatId,
            title: findTitle(),
            url: location.origin + '/c/' + chatId,
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
          if (args.files && args.files.length) await applyWireFiles(args.files);
          var turnsBefore = await submitComposerText(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              if (id) return id;
              if (responseTurnCount() > turnsBefore) {
                id = currentChatId();
                return id || null;
              }
              return null;
            },
            { timeoutMs: 90000, message: 'Grok chatId timeout' }
          );
          return {
            platform: 'grok',
            chatId: String(chatId),
            title: findTitle(),
            url: location.origin + '/c/' + chatId,
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
          var res = await apiFetch('/rest/app-chat/conversations/' + encodeURIComponent(chatId), { method: 'DELETE' });
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          if (!res.ok) await failFromResponse(res, 'delete');
          return { deleted: true, chatId: chatId };
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
          var text = Ops.quoteSelectionPrompt
            ? Ops.quoteSelectionPrompt(selection, prompt)
            : '> ' + selection + '\n\n' + prompt;
          await CE.platforms.grok.ops.send({ chatId: chatId, text: text });
          var got = null;
          var deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            var cur = await CE.platforms.grok.ops.get({ chatId: chatId }, ctx);
            var msgs = (cur && cur.messages) || [];
            if (msgs.length) {
              var last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant' && !isPlaceholderAssistantText(last.text)) {
                got = cur;
                break;
              }
            }
            await Ops.sleep(400);
          }
          if (!got) rpcErr('TIMEOUT', 'Grok ask_selection reply timeout');
          var messages = (got && got.messages) || [];
          var reply = messages[messages.length - 1];
          return {
            status: 'done',
            platform: 'grok',
            chatId: chatId,
            selection: selection,
            reply: reply,
            after: messages.length - 1,
            total: messages.length
          };
        } catch (err) {
          hostErr(err);
        }
      },
      sideAsk: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var prompt = String((args && args.prompt) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!prompt) rpcErr('BAD_REQUEST', 'prompt required');
          var selection = String((args && args.selection) || '').trim();
          var text = selection
            ? Ops.quoteSelectionPrompt
              ? Ops.quoteSelectionPrompt(selection, prompt)
              : '> ' + selection + '\n\n' + prompt
            : prompt;
          try {
            var panel = await Ops.waitFor(
              function () {
                var dialogs = document.querySelectorAll('[role="dialog"], aside, [class*="side" i]');
                var i;
                for (i = 0; i < dialogs.length; i++) {
                  var t = (dialogs[i].textContent || '').replace(/\s+/g, ' ').trim();
                  if (/боковой чат|side chat/i.test(t)) return dialogs[i];
                }
                return null;
              },
              { timeoutMs: 4000, message: 'side chat panel not found' }
            );
            var sideInput =
              panel.querySelector('[contenteditable="true"]') || panel.querySelector('textarea');
            if (sideInput) {
              (Ops.fillRichComposer || Ops.fillEditable)(sideInput, text);
              await Ops.sleep(150);
              var sideSend = panel.querySelector('button[type="submit"], button');
              if (sideSend) Ops.clickEl(sideSend);
              await waitAssistantReply(responseTurnCount(), 120000);
              return { status: 'done', platform: 'grok', chatId: chatId, mode: 'side_panel' };
            }
          } catch (sideErr) {}
          await CE.platforms.grok.ops.send({ chatId: chatId, text: text });
          return { status: 'done', platform: 'grok', chatId: chatId, mode: 'main_fallback' };
        } catch (err) {
          hostErr(err);
        }
      },
      containers: async function (args) {
        try {
          var limit = Ops.clampLimit(args && args.limit);
          var items = (await listProjects()).filter(function (c) {
            return Ops.matchQuery(c.title, args && args.query);
          });
          return { items: items.slice(0, limit), nextCursor: null };
        } catch (err) {
          hostErr(err);
        }
      },
      containerChats: async function (args) {
        try {
          var containerId = args && args.containerId ? String(args.containerId) : '';
          if (!containerId) rpcErr('BAD_REQUEST', 'containerId required');
          var container = await findProject(containerId);
          if (!container) rpcErr('NOT_FOUND', 'project not found: ' + containerId);
          var result = { items: [], nextCursor: null };
          try {
            result = await apiProjectChats(container, args);
          } catch (err) {
            if (err && (err.code === 'UNAUTHORIZED' || err.code === 'RATE_LIMIT')) throw err;
          }
          if (!args || args.cursor == null || String(args.cursor) === '') {
            var seen = {};
            result.items.forEach(function (c) {
              seen[c.chatId] = true;
            });
            (await domProjectChats(container)).forEach(function (c) {
              if (!seen[c.chatId]) result.items.push(c);
            });
          }
          return result;
        } catch (err) {
          hostErr(err);
        }
      },
      containerCreate: async function (args) {
        try {
          var name = String((args && args.name) || '').trim();
          if (!name) rpcErr('BAD_REQUEST', 'name required');
          var id = await createViaDom(name, args);
          var found = await findProject(id);
          return (
            found || {
              platform: 'grok',
              containerId: id,
              containerType: 'project',
              title: name,
              url: projectUrl(id),
              updatedAt: new Date().toISOString()
            }
          );
        } catch (err) {
          hostErr(err);
        }
      },
      containerDelete: async function (args) {
        try {
          var containerId = args && args.containerId ? String(args.containerId) : '';
          if (!containerId) rpcErr('BAD_REQUEST', 'containerId required');
          var container = await findProject(containerId);
          if (!container) rpcErr('NOT_FOUND', 'project not found: ' + containerId);
          if (args && args.name && String(args.name).trim() !== container.title) {
            rpcErr('BAD_REQUEST', 'name does not match project title');
          }
          var res = await apiFetch('/rest/workspaces/' + encodeURIComponent(containerId), { method: 'DELETE' });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete project ' + res.status);
          if (res.status === 429) rpcErr('RATE_LIMIT', 'delete project rate limited');
          if (res.ok) return { deleted: true, containerId: containerId };
          await deleteViaDom(container);
          return { deleted: true, containerId: containerId };
        } catch (err) {
          hostErr(err);
        }
      },
      containerMoveChat: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          var containerId = args && args.containerId ? String(args.containerId) : '';
          var target = null;
          if (containerId) {
            target = await findProject(containerId);
            if (!target) rpcErr('NOT_FOUND', 'project not found: ' + containerId);
          }
          await moveViaDom(chatId, target);
          return await chatSummary(chatId, target);
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
