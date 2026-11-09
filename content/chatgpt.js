(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE) return;

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

  function parseMessages(modelName, root) {
    var assistantTag = CE.modelFenceTag(modelName, 'chatgpt');
    var turns = turnNodes(root);
    var messages = [];
    for (var i = 0; i < turns.length; i++) {
      var msg = messageFromTurn(turns[i], assistantTag);
      if (msg) messages.push(msg);
    }
    return messages;
  }

  function messagesFromHydrate(res, modelName, root) {
    var live = parseMessages(modelName, root);
    if (!res || !res.items) return live;
    var captured = [];
    var order = res.order || [];
    for (var i = 0; i < order.length; i++) {
      var row = res.items[order[i]];
      if (row && row.payload && row.payload.role) captured.push(row.payload);
    }
    return captured.length > live.length ? captured : live;
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

  function mount() {
    var found = findComposerToolbar();
    if (!found || !found.el) return;

    var existing = document.querySelector('[data-chat-export-bar="chatgpt"]');
    var sameVer = existing && existing.getAttribute('data-chat-export-v') === CE.EXT_VERSION;
    var existingOk =
      existing &&
      existing.isConnected &&
      sameVer &&
      found.el.contains(existing) &&
      existing.getBoundingClientRect().width > 0;
    if (existingOk) return;
    if (existing) existing.remove();

    CE.injectBar(found.el, {
      platform: 'chatgpt',
      modifier: 'chatgpt',
      insertAfter: found.insertAfter,
      beforeChild: found.beforeChild,
      nativeFrom: found.nativeFrom,
      nativeClass: found.nativeFrom ? String(found.nativeFrom.className || '').trim() : '',
      nativeIconFrom: found.nativeIconFrom,
      nativeIconClass: found.nativeIconFrom ? String(found.nativeIconFrom.className || '').trim() : '',
      downloadSvg: function () {
        // Match ChatGPT sprite codex-icon-arrow-down-line-horizontal-light-16
        return (
          '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" class="text-default" fill="currentColor">' +
          '<path d="M13.166 12.808a.526.526 0 0 1 0 1.05H2.833a.526.526 0 0 1 0-1.05zM8 2.141c.29 0 .526.236.526.526V8.73l2.436-2.436a.525.525 0 0 1 .742.743l-2.98 2.98c-.4.4-1.05.4-1.45 0l-2.979-2.98a.525.525 0 0 1 .742-.743l2.438 2.438V2.667c0-.29.235-.526.525-.526"/>' +
          '</svg>'
        );
      },
      getData: function () {
        var u = findUserMeta();
        var model = findModel();
        var scroller = liveThread();
        var assistantTag = CE.modelFenceTag(model, 'chatgpt');
        return CE.hydrateTranscript({
          scroller: scroller,
          fromEl: scroller,
          nodes: function () {
            return turnNodes(scroller);
          },
          keyOf: turnKey,
          capture: function (el) {
            return messageFromTurn(el, assistantTag);
          }
        }).then(function (res) {
          return {
            title: findTitle(),
            chatId: chatIdFromUrl(),
            model: model,
            userName: u.userName,
            userHandle: u.userHandle,
            userEmail: u.userEmail,
            messages: messagesFromHydrate(res, model, (res && res.scroller) || scroller)
          };
        });
      }
    });
  }

  CE.observe(mount);
})();
