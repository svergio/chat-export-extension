(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  function chatIdFromUrl() {
    var m = location.pathname.match(/\/c\/([0-9a-fA-F-]{8,})/);
    return m ? m[1] : '';
  }

  function findTitle() {
    var el =
      document.querySelector('h1') ||
      document.querySelector('[data-testid="conversation-title"]') ||
      document.querySelector('nav [aria-current="page"]');
    if (el && el.textContent.trim()) return el.textContent.trim();
    var t = document.title || '';
    t = t.replace(/\s*[|\u2013\u2014-]\s*ChatGPT\s*$/i, '').trim();
    return t || 'chat';
  }

  function isThinkingLabel(s) {
    return /размышл|thinking/i.test(String(s || ''));
  }

  function findModel() {
    var btn = document.querySelector(
      'button[aria-haspopup="menu"][data-testid*="model" i], button[aria-label*="model" i], [data-testid="model-switcher-dropdown-button"]'
    );
    if (btn) {
      var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && !isThinkingLabel(t) && t.length < 48) return t;
      var aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      var labeled = aria.match(/(?:model|модель)\s*[:：]\s*(.+)$/i);
      if (labeled && labeled[1].trim() && !isThinkingLabel(labeled[1])) return labeled[1].trim();
    }
    return '';
  }

  function findUserMeta() {
    var out = { userName: '', userHandle: '', userEmail: '' };
    var profile =
      document.querySelector('[data-testid="accounts-profile-button"]') ||
      document.querySelector('button[data-testid*="profile" i]') ||
      document.querySelector('nav img[alt]') ||
      document.querySelector('button img[alt]');
    if (profile) {
      var alt = profile.getAttribute('alt') || profile.getAttribute('aria-label') || '';
      alt = alt.replace(/\s+/g, ' ').trim();
      if (alt && !/^chat/i.test(alt)) out.userName = alt;
      var btn = profile.closest('button');
      if (btn) {
        var label = (btn.getAttribute('aria-label') || btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (label && label.length < 100) {
          if (/@/.test(label) && !out.userEmail) out.userEmail = label;
          else if (!out.userName) out.userName = label;
        }
      }
    }
    var emailEl = document.querySelector('[data-testid*="email" i]');
    if (emailEl) {
      var em = (emailEl.textContent || '').trim();
      if (/@/.test(em)) out.userEmail = em;
    }
    return out;
  }

  function classOf(el) {
    return el && el.className ? String(el.className) : '';
  }

  function outermost(nodeList) {
    var arr = Array.prototype.slice.call(nodeList);
    return arr.filter(function (el) {
      var p = el.parentElement;
      while (p) {
        if (arr.indexOf(p) >= 0) return false;
        p = p.parentElement;
      }
      return true;
    });
  }

  function liveThread() {
    var all = document.querySelectorAll('.thread-scroll-container');
    var best = null;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.clientHeight <= 100) continue;
      if (!best || el.scrollHeight > best.scrollHeight) best = el;
    }
    if (best) return best;
    var sample =
      document.querySelector('[class*="bg-user-message"]') ||
      document.querySelector('[class*="MarkdownRoot"]') ||
      document.querySelector('[data-testid^="conversation-turn-"]');
    return CE.findOverflowScroller(sample);
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    return (
      el.id ||
      el.getAttribute('data-message-id') ||
      el.getAttribute('data-testid') ||
      el.getAttribute('data-turn-id') ||
      (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96) ||
      'n' + i
    );
  }

  function turnNodes(root) {
    root = root || liveThread() || document;
    var list = root.querySelectorAll(
      'section[data-testid^="conversation-turn-"], article[data-testid^="conversation-turn-"], [data-testid^="conversation-turn-"]'
    );
    if (list.length) return Array.prototype.slice.call(list);

    var byRole = root.querySelectorAll('[data-message-author-role], [data-turn]');
    if (byRole.length) return Array.prototype.slice.call(byRole);

    var users = outermost(root.querySelectorAll('[class*="bg-user-message"]'));
    var asst = outermost(root.querySelectorAll('[data-markdown-text-style], [class*="MarkdownRoot"]'));
    var raw = [];
    var u;
    for (u = 0; u < users.length; u++) {
      raw.push({ el: users[u], role: 'user' });
    }
    for (u = 0; u < asst.length; u++) {
      if (asst[u].closest('[class*="bg-user-message"]')) continue;
      raw.push({ el: asst[u], role: 'assistant' });
    }
    raw.sort(function (a, b) {
      var pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    var out = [];
    for (u = 0; u < raw.length; u++) {
      raw[u].el.setAttribute('data-ce-role', raw[u].role);
      out.push(raw[u].el);
    }
    return out;
  }

  function roleOf(node) {
    var marked = node.getAttribute('data-ce-role');
    if (marked === 'user' || marked === 'assistant' || marked === 'system') return marked;
    var role =
      node.getAttribute('data-message-author-role') ||
      node.getAttribute('data-turn') ||
      '';
    if (!role) {
      var inner = node.querySelector('[data-message-author-role], [data-turn]');
      if (inner) {
        role = inner.getAttribute('data-message-author-role') || inner.getAttribute('data-turn') || '';
      }
    }
    role = String(role).toLowerCase();
    if (role === 'user' || role === 'human') return 'user';
    if (role === 'assistant' || role === 'chatgpt' || role === 'system') return role === 'system' ? 'system' : 'assistant';

    var cls = classOf(node);
    if (/bg-user-message|group\/user-message/.test(cls)) return 'user';
    if (node.hasAttribute('data-markdown-text-style') || /MarkdownRoot/.test(cls)) return 'assistant';
    if (node.querySelector('.whitespace-pre-wrap') && !node.querySelector('div.markdown.prose, .markdown.prose, [class*="MarkdownRoot"]')) {
      return 'user';
    }
    if (node.querySelector('div.markdown.prose, .markdown.prose, [class*="MarkdownRoot"], [data-markdown-text-style]')) return 'assistant';
    return '';
  }

  function userBody(node) {
    return (
      node.querySelector('[class*="bg-user-message"]') ||
      node.querySelector('.whitespace-pre-wrap') ||
      node.querySelector('[data-message-author-role="user"] .whitespace-pre-wrap') ||
      node
    );
  }

  function assistantBody(node) {
    return (
      node.querySelector('[data-markdown-text-style]') ||
      node.querySelector('[class*="MarkdownRoot"]') ||
      node.querySelector('div.markdown.prose') ||
      node.querySelector('.markdown.prose') ||
      node.querySelector('.markdown') ||
      node
    );
  }

  function dropChatHost(items) {
    return (items || []).filter(function (s) {
      var url = (s && (s.url || s.href)) || '';
      return url && !/chatgpt\.com|openai\.com|chat\.openai\.com/i.test(url);
    });
  }

  function extractSourcesSync(turn, body) {
    var raw = [];
    var fav = CE.collectFaviconSources(turn);
    for (var fi0 = 0; fi0 < fav.length; fi0++) raw.push(fav[fi0]);
    if (body && body !== turn) {
      var favB = CE.collectFaviconSources(body);
      for (var fi1 = 0; fi1 < favB.length; fi1++) raw.push(favB[fi1]);
    }

    turn.dispatchEvent(
      new CustomEvent('chat-export-harvest', { bubbles: true, detail: {} })
    );
    var harvested = turn.getAttribute('data-ce-sources');
    if (harvested) {
      turn.removeAttribute('data-ce-sources');
      try {
        var parsed = JSON.parse(harvested);
        for (var p = 0; p < parsed.length; p++) raw.push(parsed[p]);
      } catch (e) {}
    }

    var groups = turn.querySelectorAll('[class*="citation" i], button[aria-label*="citation" i], button[aria-label*="source" i], [data-testid*="citation" i]');
    for (var g = 0; g < groups.length; g++) {
      var links = CE.collectLinks(groups[g]);
      for (var L = 0; L < links.length; L++) {
        raw.push({ title: links[L].text, url: links[L].href });
      }
      var attrs = groups[g].attributes;
      for (var ai = 0; ai < attrs.length; ai++) {
        var val = attrs[ai].value || '';
        if (/^https?:\/\//i.test(val)) {
          raw.push({ title: val, url: val });
        }
      }
    }

    var asideLinks = CE.collectLinks(turn);
    for (var x = 0; x < asideLinks.length; x++) {
      raw.push({ title: asideLinks[x].text, url: asideLinks[x].href });
    }

    var fiberRoots = [turn, body, CE.findSourcesTrigger(turn)];
    for (var f = 0; f < fiberRoots.length; f++) {
      if (!fiberRoots[f]) continue;
      var fromFiber = CE.collectSourcesFromFiber(fiberRoots[f]);
      for (var fi = 0; fi < fromFiber.length; fi++) raw.push(fromFiber[fi]);
    }

    return CE.dedupeSources(dropChatHost(raw));
  }

  function messageFromTurn(turn, assistantTag) {
    try {
      var role = roleOf(turn);
      if (role === 'system') return null;
      if (role === 'user') {
        var ub = userBody(turn);
        var ut = (ub.innerText || ub.textContent || '').trim();
        if (!ut) return null;
        return {
          role: 'user',
          roleTag: 'user',
          text: ut,
          links: CE.collectLinks(ub)
        };
      }
      if (role !== 'assistant') return null;
      var ab = assistantBody(turn);
      var at = '';
      try {
        at = CE.htmlToMarkdown(ab);
      } catch (mdErr) {}
      if (!at) at = (ab.innerText || ab.textContent || '').trim();
      if (!at) return null;
      var links = dropChatHost(CE.collectLinks(ab));
      var sources = extractSourcesSync(turn, ab);
      return {
        role: 'assistant',
        roleTag: assistantTag,
        text: at,
        links: links,
        sources: CE.dedupeSources(dropChatHost(sources || []))
      };
    } catch (err) {
      console.error('[chat-export]', err);
      return null;
    }
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

  function footerVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 20;
  }

  function findComposerFooter() {
    var sel =
      '[data-composer-footer-responsive], [class*="ComposerLayoutFooter"], footer[data-ds-composer]';
    var list = document.querySelectorAll(sel);
    var i;
    // ChatGPT keeps a zero-size LegacyExpandableFooter twin; mount only the visible one.
    for (i = 0; i < list.length; i++) {
      if (footerVisible(list[i])) return list[i];
    }
    if (list[0]) return list[0];
    var pm = document.querySelector('.ProseMirror');
    if (!pm) return null;
    var root = pm.closest('[class*="ComposerLayoutRoot"]');
    if (root) {
      var nested = root.querySelectorAll(sel);
      for (i = 0; i < nested.length; i++) {
        if (footerVisible(nested[i])) return nested[i];
      }
      return root.querySelector(sel) || root;
    }
    return pm.closest('form') || pm.parentElement;
  }

  function wrapChildOf(parent, el) {
    if (!parent || !el) return null;
    var n = el;
    while (n && n.parentElement !== parent) n = n.parentElement;
    return n && n.parentElement === parent ? n : null;
  }

  function commonAncestor(a, b, limit) {
    if (!a || !b) return null;
    var seen = [];
    var n = a;
    while (n && n !== limit && n !== document.body) {
      seen.push(n);
      n = n.parentElement;
    }
    n = b;
    while (n && n !== limit && n !== document.body) {
      if (seen.indexOf(n) >= 0) return n;
      n = n.parentElement;
    }
    return null;
  }

  function findComposerToolbar() {
    var footer = findComposerFooter();
    if (!footer) return null;

    var thinking = null;
    var dictate = null;
    var attach = null;
    var voice = null;
    var send =
      footer.querySelector('button[data-testid="send-button"]') ||
      footer.querySelector('button[aria-label*="Send" i]') ||
      footer.querySelector('button[aria-label*="Отправ" i]');
    var btns = footer.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var blob = btnBlob(btns[i]);
      if (!thinking && isThinkingLabel(blob) && !/диктов|dictat/i.test(blob)) thinking = btns[i];
      if (!dictate && /диктов|dictat/i.test(blob)) dictate = btns[i];
      if (!attach && /файл|file|attach|прикреп|добавить/i.test(blob)) attach = btns[i];
      if (!voice && /голос|voice|разговор/i.test(blob) && !/диктов|dictat/i.test(blob)) voice = btns[i];
    }

    var endBtn = send || dictate || voice;
    var row = commonAncestor(thinking || attach, endBtn, footer) || footer;
    var thinkWrap = wrapChildOf(row, thinking);
    var endWrap = wrapChildOf(row, endBtn);
    return {
      el: row,
      insertAfter: thinkWrap,
      beforeChild: endWrap,
      nativeFrom: thinking || attach,
      nativeIconFrom: attach || null
    };
  }

  var Ops = CE.Ops || {};
  var SIDEBAR_PAGE_GUARD = 20;
  var PROJECT_ID_RE = /\/g\/(g-p-[A-Za-z0-9]+)/;
  var tokenCache = '';

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

  async function accessToken(force) {
    if (tokenCache && !force) return tokenCache;
    var res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) rpcErr('UNAUTHORIZED', 'session ' + res.status);
    var data = await res.json();
    if (!data || !data.accessToken) rpcErr('UNAUTHORIZED', 'not signed in');
    tokenCache = data.accessToken;
    return tokenCache;
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var refreshed = false;
    for (;;) {
      var token = await accessToken(refreshed);
      var res = await fetch('/backend-api' + path, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: Object.assign({ Accept: 'application/json', Authorization: 'Bearer ' + token }, opts.headers || {}),
        body: opts.body
      });
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        continue;
      }
      return res;
    }
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

  function chatUrl(chatId, containerId) {
    return location.origin + (containerId ? '/g/' + containerId : '') + '/c/' + chatId;
  }

  function projectUrl(id) {
    return location.origin + '/g/' + id + '/project';
  }

  function toContainer(g) {
    var id = g && g.id;
    if (!id) return null;
    var display = g.display || {};
    return {
      platform: 'chatgpt',
      containerId: String(id),
      containerType: 'project',
      title: display.name || String(id),
      url: projectUrl(id),
      updatedAt: Ops.toIso(g.updated_at || g.last_interacted_at)
    };
  }

  function toChat(row, container) {
    var cid = (container && container.containerId) || row.gizmo_id || row.conversation_template_id || '';
    var chat = {
      platform: 'chatgpt',
      chatId: String(row.id),
      title: row.title || '',
      url: chatUrl(row.id, cid),
      updatedAt: Ops.toIso(row.update_time),
      createdAt: Ops.toIso(row.create_time)
    };
    if (cid) {
      chat.containerType = 'project';
      chat.containerId = String(cid);
      if (container && container.title) chat.containerTitle = container.title;
    }
    return chat;
  }

  async function apiProjects() {
    var items = [];
    var cursor = null;
    for (var page = 0; page < SIDEBAR_PAGE_GUARD; page++) {
      var path =
        '/gizmos/snorlax/sidebar?conversations_per_gizmo=1&owned_only=true' +
        (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
      var res = await apiFetch(path);
      if (!res.ok) await failFromResponse(res, 'projects');
      var data = await res.json();
      var rows = (data && data.items) || [];
      for (var i = 0; i < rows.length; i++) {
        var g = rows[i] && rows[i].gizmo && rows[i].gizmo.gizmo;
        var c = toContainer(g);
        if (c) items.push(c);
      }
      cursor = data && data.cursor ? String(data.cursor) : null;
      if (!cursor) break;
    }
    return items;
  }

  function domProjects() {
    var byId = {};
    var order = [];
    var anchors = document.querySelectorAll('a[href*="/g/g-p-"]');
    for (var i = 0; i < anchors.length; i++) {
      var href = anchors[i].getAttribute('href') || '';
      var m = href.match(PROJECT_ID_RE);
      if (!m) continue;
      var id = m[1];
      if (!byId[id]) {
        byId[id] = { containerId: id, title: '' };
        order.push(id);
      }
      if (/\/g\/g-p-[A-Za-z0-9]+\/project/.test(href)) {
        byId[id].title = (anchors[i].getAttribute('aria-label') || anchors[i].textContent || '').replace(/\s+/g, ' ').trim();
      }
    }
    return order.map(function (id) {
      var row = byId[id];
      return {
        platform: 'chatgpt',
        containerId: id,
        containerType: 'project',
        title: row.title || id,
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

  function domProjectChats(container) {
    var out = [];
    var seen = {};
    var anchors = document.querySelectorAll('a[href*="/g/' + container.containerId + '/c/"]');
    for (var i = 0; i < anchors.length; i++) {
      var m = (anchors[i].getAttribute('href') || '').match(/\/c\/([0-9a-fA-F-]{8,})/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = true;
      out.push(
        toChat(
          { id: m[1], title: (anchors[i].getAttribute('aria-label') || anchors[i].textContent || '').trim() },
          container
        )
      );
    }
    return out;
  }

  async function projectChats(container, args) {
    var limit = Ops.clampLimit(args && args.limit);
    var cursor = args && args.cursor != null && String(args.cursor) !== '' ? String(args.cursor) : '0';
    var items = [];
    var next = null;
    for (var page = 0; page < SIDEBAR_PAGE_GUARD; page++) {
      var res = await apiFetch(
        '/gizmos/' + encodeURIComponent(container.containerId) + '/conversations?cursor=' + encodeURIComponent(cursor)
      );
      if (!res.ok) await failFromResponse(res, 'project chats');
      var data = await res.json();
      var rows = (data && data.items) || [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].id) items.push(toChat(rows[i], container));
      }
      next = data && data.cursor != null && data.cursor !== '' ? String(data.cursor) : null;
      if (!next || items.length >= limit) break;
      cursor = next;
    }
    return { items: items, nextCursor: next };
  }

  function projectIdFromUrl() {
    var m = location.pathname.match(PROJECT_ID_RE);
    return m ? m[1] : '';
  }

  async function createViaDom(name) {
    var before = {};
    (await listProjects()).forEach(function (c) {
      before[c.containerId] = true;
    });
    var addBtn = findByLabel(
      'button, a, [role="button"]',
      /добавить новый проект|новый проект|создать проект|new project|create project|add new project/i
    );
    if (!addBtn) rpcErr('HOST_ERROR', 'new project button not found');
    Ops.clickEl(addBtn);
    var dialog = await Ops.waitFor(
      function () {
        var list = document.querySelectorAll('[role="dialog"]');
        for (var i = 0; i < list.length; i++) {
          if (visible(list[i]) && list[i].querySelector('input:not([type="hidden"]), textarea')) return list[i];
        }
        return null;
      },
      { timeoutMs: 10000, message: 'new project dialog did not open' }
    );
    Ops.setNativeValue(dialog.querySelector('input:not([type="hidden"]), textarea'), name);
    var confirm = await Ops.waitFor(
      function () {
        var btns = dialog.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].disabled || btns[i].getAttribute('aria-disabled') === 'true') continue;
          var t = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (/^(создать( проект)?|create( project)?)$/i.test(t)) return btns[i];
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
    var name = container.title;
    var trigger = null;
    var buttons = document.querySelectorAll('button[aria-label]');
    for (var i = 0; i < buttons.length; i++) {
      var aria = buttons[i].getAttribute('aria-label') || '';
      if (/^(действия проекта|project actions|project options)\s/i.test(aria) && aria.slice(-name.length) === name) {
        trigger = buttons[i];
        break;
      }
    }
    if (!trigger) rpcErr('NOT_FOUND', 'project row not found in sidebar: ' + name);
    await menuAction(trigger, /удалить проект|delete project|^удалить$|^delete$/i, 'delete project menu item not found');
    await confirmDialog(/^(удалить|delete)$/i, 'delete confirmation not found');
    await Ops.waitFor(
      function () {
        return !document.querySelector('a[href*="/g/' + container.containerId + '/"]') ? true : null;
      },
      { timeoutMs: 10000, message: 'project row still present after delete' }
    );
  }

  async function moveViaDom(chatId, target) {
    var link = document.querySelector('a[href*="/c/' + chatId + '"]');
    if (!link) rpcErr('NOT_FOUND', 'chat not visible in sidebar: ' + chatId);
    var row = link.closest('[data-testid], li, div[class*="group"]') || link.parentElement;
    var trigger = null;
    for (var depth = 0; row && depth < 5 && !trigger; depth++) {
      trigger =
        row.querySelector('button[data-testid$="options"]') ||
        row.querySelector('button[aria-label*="меню разговора" i], button[aria-label*="Действия" i], button[aria-label*="options" i]');
      row = row.parentElement;
    }
    if (!trigger) rpcErr('HOST_ERROR', 'chat options button not found');
    var item = await menuAction(
      trigger,
      target ? /переместить в проект|move to project/i : /удалить из проекта|remove from project/i,
      'move menu item not found'
    );
    if (!target) return;
    var re = new RegExp('^\\s*' + target.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
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
    return chatIdFromUrl();
  }

  function isPlaceholderAssistantText(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return true;
    if (/^(thinking|размышл|\.{3,}|…)/i.test(t)) return true;
    return t.length < 2;
  }

  function toListChat(item) {
    var chat = {
      platform: 'chatgpt',
      chatId: String(item.id),
      title: item.title || '',
      url: location.origin + '/c/' + item.id,
      updatedAt: Ops.toIso(item.update_time),
      createdAt: Ops.toIso(item.create_time)
    };
    var gizmo = item.gizmo_id || item.conversation_template_id;
    if (gizmo) {
      chat.containerType = 'project';
      chat.containerId = String(gizmo);
    }
    return chat;
  }

  function partsToText(parts) {
    var out = [];
    var i;
    for (i = 0; i < (parts || []).length; i++) {
      var p = parts[i];
      if (typeof p === 'string') {
        if (p.trim()) out.push(p);
      } else if (p && typeof p.text === 'string' && p.text.trim()) {
        out.push(p.text);
      } else if (p && (p.content_type === 'image_asset_pointer' || p.asset_pointer)) {
        out.push('[image]');
      }
    }
    return out.join('\n\n').trim();
  }

  function collectApiSources(meta) {
    var seen = {};
    var out = [];
    function add(title, url) {
      if (!url || !/^https?:\/\//i.test(url)) return;
      if (/chatgpt\.com|openai\.com|oaistatic|gstatic/i.test(url)) return;
      if (seen[url]) return;
      seen[url] = true;
      out.push({
        title: String(title || url).replace(/\s+/g, ' ').trim() || url,
        url: url
      });
    }
    var groups = (meta && meta.search_result_groups) || [];
    var g;
    for (g = 0; g < groups.length; g++) {
      var entries = groups[g].entries || groups[g].results || groups[g].items || [];
      var e;
      for (e = 0; e < entries.length; e++) {
        add(entries[e].title || entries[e].attribution || groups[g].domain, entries[e].url);
      }
    }
    var refs = (meta && meta.content_references) || [];
    var r;
    for (r = 0; r < refs.length; r++) {
      var ref = refs[r];
      if (ref.url) add(ref.title, ref.url);
      var sources = ref.sources || ref.safe_urls || [];
      var s;
      for (s = 0; s < sources.length; s++) {
        if (typeof sources[s] === 'string') add(sources[s], sources[s]);
        else if (sources[s] && sources[s].url) add(sources[s].title || sources[s].url, sources[s].url);
      }
    }
    return out;
  }

  function roleTagFor(role, model) {
    if (role === 'user') return 'user';
    if (CE.modelFenceTag) return CE.modelFenceTag(model, 'chatgpt');
    return 'chatgpt';
  }

  function nodeToMessage(node) {
    var m = node && node.message;
    if (!m || !m.author) return null;
    var role = m.author.role;
    if (role !== 'user' && role !== 'assistant') return null;
    var text = partsToText((m.content && m.content.parts) || []);
    if (!text) return null;
    var meta = m.metadata || {};
    var model = meta.model_slug || meta.resolved_model_slug || meta.default_model_slug || '';
    var msg = {
      role: role,
      roleTag: roleTagFor(role, model),
      text: text,
      links: []
    };
    if (role === 'assistant') {
      var sources = collectApiSources(meta);
      if (sources.length) msg.sources = sources;
    }
    return msg;
  }

  function mappingToMessages(conv) {
    var mapping = (conv && conv.mapping) || {};
    var cur = conv && conv.current_node;
    var chain = [];
    while (cur && mapping[cur]) {
      chain.push(cur);
      cur = mapping[cur].parent;
      if (chain.length > 5000) break;
    }
    chain.reverse();
    var out = [];
    var i;
    for (i = 0; i < chain.length; i++) {
      var msg = nodeToMessage(mapping[chain[i]]);
      if (msg) out.push(msg);
    }
    return out;
  }

  async function sessionUser() {
    try {
      var res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) return { name: '', email: '' };
      var data = await res.json();
      var u = (data && data.user) || {};
      return {
        name: u.name || '',
        email: u.email || ''
      };
    } catch (e) {
      return { name: '', email: '' };
    }
  }

  async function fetchConversation(chatId) {
    var res = await apiFetch('/conversation/' + encodeURIComponent(chatId));
    if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'get ' + res.status);
    if (!res.ok) await failFromResponse(res, 'conversation');
    return res.json();
  }

  function findComposerInput() {
    var form =
      document.querySelector('form[data-type="unified-composer"]') ||
      document.querySelector('form[data-chatgpt-composer]') ||
      document.querySelector('[data-composer-placement] form');
    if (form) {
      var el =
        form.querySelector('.ProseMirror[contenteditable="true"]') ||
        form.querySelector('[contenteditable="true"][role="textbox"]');
      if (el) return el;
    }
    return (
      document.querySelector('.ProseMirror[contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"][role="textbox"]')
    );
  }

  function findSendButton() {
    return (
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('form button[aria-label*="Send" i]') ||
      document.querySelector('form button[aria-label*="Отправ" i]')
    );
  }

  function stopButtonVisible() {
    return !!(Ops.findStopControl && Ops.findStopControl(document));
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
      { timeoutMs: 25000, message: 'ChatGPT new chat timeout' }
    );
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
      { timeoutMs: 25000, message: 'ChatGPT navigate timeout' }
    );
  }

  async function waitComposerIdle() {
    await Ops.waitFor(
      function () {
        if (stopButtonVisible()) return null;
        var send = findSendButton();
        if (!send || send.disabled || send.getAttribute('aria-disabled') === 'true') return null;
        return true;
      },
      { timeoutMs: 120000, message: 'ChatGPT composer busy' }
    ).catch(function () {});
  }

  async function submitComposerText(text) {
    var body = String(text || '').trim();
    if (!body) rpcErr('BAD_REQUEST', 'text is required');
    await waitComposerIdle();
    var input = await Ops.waitFor(findComposerInput, {
      timeoutMs: 15000,
      message: 'ChatGPT composer timeout'
    });
    var fill = Ops.fillRichComposer || Ops.fillEditable;
    fill(input, body);
    await Ops.sleep(200);
    var send = await Ops.waitFor(
      function () {
        var b = findSendButton();
        if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return null;
        return b;
      },
      { timeoutMs: 60000, message: 'ChatGPT send button not found' }
    );
    var turnsBefore = turnNodes().length;
    if (Ops.ensureComposerSubmitted) {
      await Ops.ensureComposerSubmitted({
        send: send,
        input: input,
        message: 'ChatGPT submit failed',
        isDone: function () {
          return stopButtonVisible() || turnNodes().length > turnsBefore ? true : null;
        }
      });
    } else {
      Ops.clickEl(send);
    }
    return turnsBefore;
  }

  async function waitAssistantTurn(turnsBefore, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 180000;
    await Ops.waitFor(
      function () {
        if (turnNodes().length > turnsBefore && !stopButtonVisible()) return true;
        if (stopButtonVisible()) return null;
        return turnNodes().length > turnsBefore ? true : null;
      },
      { timeoutMs: timeoutMs, message: 'ChatGPT reply timeout' }
    );
  }

  async function patchTitle(chatId, title) {
    if (!title) return;
    await apiFetch('/conversation/' + encodeURIComponent(chatId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title })
    });
  }

  async function detectChatCapabilities() {
    var model = findModel();
    var models = [];
    if (model) models.push({ id: Ops.normalizeId(model), label: model, kind: 'model' });
    var toggles = [];
    var thinking = findByLabel('button', /размышл|thinking/i);
    if (thinking) toggles.push({ id: 'thinking', label: labelOf(thinking), kind: 'toggle' });
    return {
      platform: 'chatgpt',
      projectsSupported: true,
      models: models,
      modes: [],
      toggles: toggles,
      tools: [],
      attach: { supported: true, multiple: true, accept: [] },
      current: { model: model ? Ops.normalizeId(model) : undefined, toggles: [] },
      detectedAt: new Date().toISOString()
    };
  }

  async function chatSummary(chatId, container) {
    var res = await apiFetch('/conversation/' + encodeURIComponent(chatId));
    if (res.ok) {
      var row = await res.json();
      row.id = chatId;
      return toChat(row, container);
    }
    return toChat({ id: chatId, title: '' }, container);
  }

  CE.definePlatform({
    id: 'chatgpt',
    modifier: 'chatgpt',
    fenceTag: 'chatgpt',
    composer: findComposerToolbar,
    chatId: chatIdFromUrl,
    title: findTitle,
    model: findModel,
    user: findUserMeta,
    scroller: liveThread,
    turns: turnNodes,
    turnKey: turnKey,
    capture: messageFromTurn,
    downloadSvg: function () {
      // Match ChatGPT sprite codex-icon-arrow-down-line-horizontal-light-16
      return (
        '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" class="text-default" fill="currentColor">' +
        '<path d="M13.166 12.808a.526.526 0 0 1 0 1.05H2.833a.526.526 0 0 1 0-1.05zM8 2.141c.29 0 .526.236.526.526V8.73l2.436-2.436a.525.525 0 0 1 .742.743l-2.98 2.98c-.4.4-1.05.4-1.45 0l-2.979-2.98a.525.525 0 0 1 .742-.743l2.438 2.438V2.667c0-.29.235-.526.525-.526"/>' +
        '</svg>'
      );
    },
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit(args && args.limit);
          var offset = 0;
          if (args && args.cursor != null && String(args.cursor) !== '') {
            offset = Math.max(0, parseInt(String(args.cursor), 10) || 0);
          }
          var path =
            '/conversations?offset=' + encodeURIComponent(String(offset)) + '&limit=' + encodeURIComponent(String(limit)) + '&order=updated';
          var res = await apiFetch(path);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'ChatGPT list ' + res.status);
          if (!res.ok) await failFromResponse(res, 'list');
          var data = await res.json();
          var raw = data.items || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length; i++) {
            if (!raw[i] || !raw[i].id) continue;
            var chat = toListChat(raw[i]);
            if (args && args.containerId && String(chat.containerId || '') !== String(args.containerId)) continue;
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          var nextCursor = raw.length >= limit ? String(offset + raw.length) : null;
          return { items: items, nextCursor: nextCursor };
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
              return Object.assign({ platform: 'chatgpt', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
            var same = await ctx.getData();
            var u = findUserMeta();
            return Object.assign(
              {
                platform: 'chatgpt',
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
          var conv = await fetchConversation(chatId);
          var user = await sessionUser();
          var meta = findUserMeta();
          return {
            platform: 'chatgpt',
            url: location.origin + '/c/' + chatId,
            title: conv.title || '',
            chatId: chatId,
            model: conv.default_model_slug || '',
            userName: meta.userName || user.name || '',
            userHandle: meta.userHandle || '',
            userEmail: meta.userEmail || user.email || '',
            messages: mappingToMessages(conv)
          };
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function () {
        try {
          return await detectChatCapabilities();
        } catch (err) {
          hostErr(err);
        }
      },
      hostState: function () {
        var input = findComposerInput();
        return {
          generating: stopButtonVisible(),
          composerReady: !!input && (Ops.composerReady ? Ops.composerReady(input) : true)
        };
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!String((args && args.text) || '').trim()) rpcErr('BAD_REQUEST', 'text is required');
          await navigateToChat(chatId);
          var turnsBefore = await submitComposerText(args.text);
          await waitAssistantTurn(turnsBefore, { timeoutMs: 180000 });
          return {
            platform: 'chatgpt',
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
          var title = Ops.testTitle ? Ops.testTitle(args && args.title) : '[ce-test] chat';
          await ensureNewChat();
          await submitComposerText(text);
          var chatId = await Ops.waitFor(
            function () {
              return currentChatId() || null;
            },
            { timeoutMs: 90000, message: 'ChatGPT chatId timeout' }
          );
          await patchTitle(chatId, title);
          return {
            platform: 'chatgpt',
            chatId: chatId,
            title: title,
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
          var res = await apiFetch('/conversation/' + encodeURIComponent(chatId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_visible: false })
          });
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
          var before = await CE.platforms.chatgpt.ops.get({ chatId: chatId, branch: 'active' }, ctx);
          var beforeLen = ((before && before.messages) || []).length;
          var text = Ops.quoteSelectionPrompt
            ? Ops.quoteSelectionPrompt(selection, prompt)
            : '> ' + selection + '\n\n' + prompt;
          await CE.platforms.chatgpt.ops.send({ chatId: chatId, text: text });
          var got = null;
          var deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            var cur = await CE.platforms.chatgpt.ops.get({ chatId: chatId, branch: 'active' }, ctx);
            var msgs = (cur && cur.messages) || [];
            if (msgs.length > beforeLen) {
              var last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant' && !isPlaceholderAssistantText(last.text)) {
                got = cur;
                break;
              }
            }
            await Ops.sleep(400);
          }
          if (!got) rpcErr('TIMEOUT', 'ChatGPT ask_selection reply timeout');
          var messages = (got && got.messages) || [];
          var reply = null;
          var after = null;
          var i;
          for (i = messages.length - 1; i >= 0; i--) {
            if (messages[i] && messages[i].role === 'assistant' && !isPlaceholderAssistantText(messages[i].text)) {
              reply = messages[i];
              after = i;
              break;
            }
          }
          return {
            status: 'done',
            platform: 'chatgpt',
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
          var container = (await findProject(containerId)) || {
            platform: 'chatgpt',
            containerId: containerId,
            containerType: 'project',
            title: ''
          };
          try {
            return await projectChats(container, args);
          } catch (err) {
            if (err && (err.code === 'UNAUTHORIZED' || err.code === 'RATE_LIMIT' || err.code === 'NOT_FOUND')) throw err;
            return { items: domProjectChats(container), nextCursor: null };
          }
        } catch (err) {
          hostErr(err);
        }
      },
      containerCreate: async function (args) {
        try {
          var name = String((args && args.name) || '').trim();
          if (!name) rpcErr('BAD_REQUEST', 'name required');
          var id = await createViaDom(name);
          var found = await findProject(id);
          return (
            found || {
              platform: 'chatgpt',
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
          var res = await apiFetch('/gizmos/' + encodeURIComponent(containerId), { method: 'DELETE' });
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
          var res = await apiFetch('/conversation/' + encodeURIComponent(chatId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gizmo_id: containerId || null })
          });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'move chat ' + res.status);
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 429) rpcErr('RATE_LIMIT', 'move chat rate limited');
          if (!res.ok) await moveViaDom(chatId, target);
          return await chatSummary(chatId, target);
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
