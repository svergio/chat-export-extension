(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE) return;

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

  function parseMessages(modelName, root) {
    var assistantTag = CE.modelFenceTag(modelName, 'grok');
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

  function mount() {
    var found = findComposerToolbar();
    if (!found || !found.el) return;

    var existing = document.querySelector('[data-chat-export-bar="grok"]');
    if (existing && existing.isConnected && found.el.contains(existing)) return;
    if (existing) existing.remove();

    CE.injectBar(found.el, {
      platform: 'grok',
      modifier: 'grok',
      insertAfter: found.insertAfter,
      nativeFrom: found.nativeFrom,
      nativeIconFrom: found.nativeIconFrom,
      getData: function () {
        var u = findUserMeta();
        var model = findModel();
        var scroller = liveScroller();
        var assistantTag = CE.modelFenceTag(model, 'grok');
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
