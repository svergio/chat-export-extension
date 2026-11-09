(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE) return;

  var PLATFORM = 'grok-x';
  var COPY_SEL = 'button[aria-label="Копировать текст"], button[aria-label="Copy text"]';
  var CHROME_RE =
    /^(История|History|Приватный|Private|Новый чат|New chat|Связать|Сфокусированный|Focused|Закладка|Bookmark|Смотреть новые|Show new|Быстрый|Fast|Think|Мысли|Thinking)$/i;

  function isGrokPath() {
    return /^\/i\/grok(?:\/|$)/i.test(location.pathname || '');
  }

  function chatIdFromUrl() {
    try {
      var id = new URLSearchParams(location.search).get('conversation');
      if (id) return String(id);
    } catch (e) {}
    return '';
  }

  function findDrawer() {
    return (
      document.querySelector('[data-testid="GrokDrawer"]') ||
      document.querySelector('[data-testid="grokDrawer"]') ||
      null
    );
  }

  function findFullRoot() {
    if (!isGrokPath()) return null;
    return (
      document.querySelector('[data-testid="primaryColumn"]') ||
      document.querySelector('main[role="main"]') ||
      document.querySelector('main') ||
      null
    );
  }

  function activeRoot() {
    var drawer = findDrawer();
    if (drawer && drawer.querySelector('textarea')) return drawer;
    var full = findFullRoot();
    if (full && full.querySelector('textarea')) return full;
    return drawer || full;
  }

  function findComposerTextarea(root) {
    if (!root) return null;
    var list = root.querySelectorAll('textarea');
    for (var i = 0; i < list.length; i++) {
      var ta = list[i];
      var ph = (ta.getAttribute('placeholder') || '').toLowerCase();
      if (/задай|ask|question|вопрос|anything/i.test(ph) || ph) return ta;
    }
    return list[0] || null;
  }

  function findModeChip(root) {
    if (!root) return null;
    var btns = root.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var aria = (b.getAttribute('aria-label') || '').trim();
      var text = (b.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^(Быстрый|Fast|Think|Expert|Heavy|Мыслим)/i.test(aria) || /^(Быстрый|Fast|Think|Expert|Heavy)$/i.test(text)) {
        return b;
      }
    }
    return null;
  }

  function findModel(root) {
    var chip = findModeChip(root);
    if (!chip) return '';
    var aria = (chip.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (aria && aria.length < 48) return aria;
    return (chip.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findUserMeta() {
    var out = { userName: '', userHandle: '', userEmail: '' };
    var menu =
      document.querySelector('button[aria-label*="учетной записи" i]') ||
      document.querySelector('button[aria-label*="Account menu" i]') ||
      document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (menu) {
      var blob = (menu.innerText || menu.textContent || '').replace(/\s+/g, ' ').trim();
      var m = blob.match(/@[\w]+/);
      if (m) out.userHandle = m[0];
      var name = blob.replace(/@[\w]+/g, '').replace(/^\.+/, '').trim();
      if (name && name.length < 80) out.userName = name;
    }
    if (!out.userHandle) {
      var prof = document.querySelector('a[data-testid="AppTabBar_Profile_Link"], a[href^="/"][aria-label*="Profile" i]');
      if (prof) {
        var href = prof.getAttribute('href') || '';
        var hm = href.match(/^\/([^\/\?]+)/);
        if (hm && hm[1] && !/^(i|home|explore|notifications|messages)$/i.test(hm[1])) {
          out.userHandle = '@' + hm[1];
        }
      }
    }
    return out;
  }

  function findTitle(root) {
    var drawer = findDrawer();
    if (drawer && root === drawer) {
      var head =
        drawer.querySelector('[data-testid="GrokDrawerHeader"] h1, [data-testid="GrokDrawerHeader"] h2, [data-testid="GrokDrawerHeader"] [role="heading"]') ||
        drawer.querySelector('h1, h2, [role="heading"]');
      if (head) {
        var ht = (head.textContent || '').replace(/\s+/g, ' ').trim();
        if (ht && ht.length < 120) return ht.replace(/\.\.\.$/, '').trim() || ht;
      }
      var quote = drawer.querySelector('a[href*="/status/"]');
      if (quote) {
        var qt = (quote.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (qt) return qt;
      }
      return 'Анализ поста';
    }
    var h1 = document.querySelector('[data-testid="primaryColumn"] h1, main h1');
    if (h1 && (h1.textContent || '').trim()) {
      var t = (h1.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && !/^Grok$/i.test(t)) return t;
    }
    var doc = (document.title || '').replace(/\s*[|\/]\s*X\s*$/i, '').replace(/\s*Grok\s*/i, '').trim();
    return doc || 'grok-x';
  }

  function hasCopy(el) {
    return !!(el && el.querySelector && el.querySelector(COPY_SEL));
  }

  function isChromeText(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return true;
    if (t.length < 2) return true;
    if (CHROME_RE.test(t)) return true;
    if (/^(Смотреть новые посты|Show new posts)/i.test(t)) return true;
    return false;
  }

  function isQuoteCard(el) {
    if (!el) return false;
    var t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (/^(Цитата|Quote)\b/i.test(t)) return true;
    if (el.querySelector && el.querySelector('a[href*="/status/"]') && !hasCopy(el)) {
      if (t.length < 800) return true;
    }
    return false;
  }

  function findTurnList(root) {
    if (!root) return null;
    var copies = root.querySelectorAll(COPY_SEL);
    if (!copies.length) {
      // empty / landing chat: no turns yet
      return null;
    }
    var first = copies[0];
    var turn = first.parentElement;
    var best = null;
    for (var i = 0; i < 16 && turn; i++) {
      var n = turn.querySelectorAll(COPY_SEL).length;
      if (n === 1) best = turn;
      if (n > 1) break;
      turn = turn.parentElement;
    }
    if (!best) return null;
    var list = best.parentElement;
    for (var j = 0; j < 10 && list; j++) {
      var kids = list.children;
      var withCopy = 0;
      for (var k = 0; k < kids.length; k++) {
        if (hasCopy(kids[k])) withCopy++;
      }
      if (withCopy >= 1 && kids.length >= 2) return list;
      list = list.parentElement;
    }
    return best.parentElement;
  }

  function findQuoteNodes(root) {
    if (!root) return [];
    var out = [];
    var nodes = root.querySelectorAll('div, article, section');
    for (var i = 0; i < nodes.length && out.length < 3; i++) {
      var el = nodes[i];
      if (!isQuoteCard(el)) continue;
      // keep outermost quote-ish block only
      var nested = false;
      for (var j = 0; j < out.length; j++) {
        if (out[j].contains(el)) {
          nested = true;
          break;
        }
        if (el.contains(out[j])) {
          out[j] = el;
          nested = true;
          break;
        }
      }
      if (!nested) out.push(el);
    }
    return out;
  }

  function turnNodes(root) {
    var list = findTurnList(root);
    var turns = [];
    if (list) {
      turns = Array.prototype.slice.call(list.children).filter(function (el) {
        var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return false;
        if (hasCopy(el)) return true;
        if (isQuoteCard(el)) return true;
        if (isChromeText(text)) return false;
        var btns = el.querySelectorAll ? el.querySelectorAll('button').length : 0;
        if (btns > 3 && text.length < 40) return false;
        return true;
      });
    }
    var hasQuoteTurn = false;
    for (var ti = 0; ti < turns.length; ti++) {
      if (isQuoteCard(turns[ti])) {
        hasQuoteTurn = true;
        break;
      }
    }
    // Post drawer: quote card often sits above the turn list
    if (!hasQuoteTurn && (root === findDrawer() || root.querySelector('[data-testid="GrokDrawerHeader"]'))) {
      var quotes = findQuoteNodes(root);
      for (var q = quotes.length - 1; q >= 0; q--) {
        var already = false;
        for (var t = 0; t < turns.length; t++) {
          if (turns[t] === quotes[q] || turns[t].contains(quotes[q]) || quotes[q].contains(turns[t])) {
            already = true;
            break;
          }
        }
        if (!already) turns.unshift(quotes[q]);
      }
    }
    return turns;
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    var id = el.id;
    if (id) return id;
    var t = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 96);
    return (hasCopy(el) ? 'a:' : isQuoteCard(el) ? 'q:' : 'u:') + (t || 'n' + i);
  }

  function dropXChrome(items) {
    return (items || []).filter(function (s) {
      var url = (s && (s.url || s.href)) || '';
      if (!url) return false;
      try {
        var u = new URL(url, location.href);
        var host = u.hostname.replace(/^www\./, '');
        if (/^(x\.com|twitter\.com)$/i.test(host)) {
          return /\/status\/\d+/.test(u.pathname);
        }
        if (/twimg\.com|abs\.twimg\.com/i.test(host)) return false;
      } catch (e) {
        return true;
      }
      return true;
    });
  }

  function stripAssistantChrome(text) {
    var t = String(text || '');
    t = t.replace(/^\s*Мысли\s*/i, '');
    t = t.replace(/^\s*Think(?:ing)?\s*/i, '');
    t = t.replace(/\n?\s*\d+\s*веб-страниц?\s*$/i, '');
    t = t.replace(/\n?\s*\d+\s*web pages?\s*$/i, '');
    t = t.replace(/\n?\s*Копировать текст[\s\S]*$/i, '');
    t = t.replace(/\n?\s*Copy text[\s\S]*$/i, '');
    return t.replace(/\s+$/g, '').trim();
  }

  function bodyRoot(turn) {
    if (!turn) return turn;
    // Prefer markdown-ish inner node without action row
    var cloneSource = turn;
    var actions = turn.querySelector(COPY_SEL);
    if (actions) {
      var actionRow = actions.parentElement;
      for (var i = 0; i < 4 && actionRow; i++) {
        if (actionRow.parentElement === turn || (actionRow.parentElement && actionRow.parentElement.parentElement === turn)) {
          break;
        }
        actionRow = actionRow.parentElement;
      }
    }
    return cloneSource;
  }

  function messageFromTurn(turn, assistantTag) {
    if (!turn) return null;
    var text = (turn.innerText || turn.textContent || '').replace(/\s+\n/g, '\n').trim();
    if (!text) return null;

    if (isQuoteCard(turn)) {
      var links = dropXChrome(CE.collectLinks(turn));
      var body = text.replace(/^(Цитата|Quote)\s*/i, '').trim();
      if (!body) return null;
      return {
        role: 'system',
        roleTag: 'sys',
        text: body,
        links: links,
        sources: CE.dedupeSources(links.map(function (l) {
          return { title: l.text, url: l.href };
        }))
      };
    }

    if (hasCopy(turn)) {
      var bodyEl = bodyRoot(turn);
      var md = '';
      try {
        md = CE.htmlToMarkdown(bodyEl);
      } catch (e) {
        md = text;
      }
      md = stripAssistantChrome(md || text);
      if (!md) return null;
      var alinks = dropXChrome(CE.collectLinks(turn));
      var sources = CE.dedupeSources(dropXChrome(alinks.map(function (l) {
        return { title: l.text, url: l.href };
      })));
      return {
        role: 'assistant',
        roleTag: assistantTag,
        text: md,
        links: alinks,
        sources: sources
      };
    }

    if (isChromeText(text)) return null;
    return {
      role: 'user',
      roleTag: 'user',
      text: text,
      links: dropXChrome(CE.collectLinks(turn))
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

  function liveScroller(root) {
    var list = findTurnList(root);
    var from = list || findComposerTextarea(root) || root;
    return CE.findOverflowScroller(from) || root;
  }

  function findComposerToolbar(root) {
    var ta = findComposerTextarea(root);
    if (!ta) return null;
    var modeBtn = findModeChip(root);
    var voiceBtn =
      root.querySelector('button[aria-label*="голос" i]') ||
      root.querySelector('button[aria-label*="Voice" i]') ||
      root.querySelector('button[aria-label*="Voice mode" i]') ||
      root.querySelector('button[aria-label*="dictat" i]') ||
      root.querySelector('button[aria-label*="голосовой" i]');
    var attachBtn =
      root.querySelector('button[aria-label*="файл" i]') ||
      root.querySelector('button[aria-label*="Attach" i]') ||
      root.querySelector('button[aria-label*="file" i]');

    // Horizontal actions row: [mode wrap] [voice]. Never nest inside mode wrap
    // (that stacks MD under Fast and overlaps the mic).
    var modeWrap = modeBtn && modeBtn.parentElement;
    var actionsRow = modeWrap && modeWrap.parentElement;
    if (
      modeWrap &&
      actionsRow &&
      voiceBtn &&
      actionsRow.contains(voiceBtn) &&
      modeWrap !== actionsRow
    ) {
      return {
        el: actionsRow,
        insertAfter: modeWrap,
        beforeChild: voiceBtn,
        nativeFrom: modeBtn,
        // Outline attach/mic — not the filled white voice-mode chip
        nativeIconFrom: attachBtn || null
      };
    }

    var slot = null;
    var insertAfter = null;
    var beforeChild = null;
    if (modeBtn && modeWrap && actionsRow && modeWrap !== actionsRow) {
      slot = actionsRow;
      insertAfter = modeWrap;
      beforeChild = voiceBtn;
    } else {
      var row = ta.parentElement;
      for (var i = 0; i < 8 && row; i++) {
        if (row.querySelectorAll('button').length >= 1 && row.querySelector('textarea')) {
          slot = row;
          break;
        }
        row = row.parentElement;
      }
      slot = slot || ta.parentElement;
      insertAfter = modeBtn || attachBtn;
      beforeChild = voiceBtn;
    }

    return {
      el: slot,
      insertAfter: insertAfter,
      beforeChild: beforeChild,
      nativeFrom: modeBtn || attachBtn || voiceBtn,
      nativeIconFrom: attachBtn || null
    };
  }

  function mount() {
    var root = activeRoot();
    if (!root) return;
    // Avoid injecting on plain X feed without Grok UI
    if (!findComposerTextarea(root)) return;

    var found = findComposerToolbar(root);
    if (!found || !found.el) return;

    var existing = document.querySelector('[data-chat-export-bar="' + PLATFORM + '"]');
    var sameVer = existing && existing.getAttribute('data-chat-export-v') === CE.EXT_VERSION;
    if (
      existing &&
      existing.isConnected &&
      sameVer &&
      existing.parentElement === found.el &&
      found.el.contains(existing)
    ) {
      return;
    }
    if (existing) existing.remove();

    var modeChip = findModeChip(root);
    CE.injectBar(found.el, {
      platform: PLATFORM,
      modifier: 'grok-x',
      insertAfter: found.insertAfter,
      beforeChild: found.beforeChild,
      nativeFrom: modeChip || found.nativeFrom,
      nativeClass: modeChip ? String(modeChip.className || '').trim() : '',
      nativeIconFrom: found.nativeIconFrom,
      getData: function () {
        var cur = activeRoot() || root;
        var u = findUserMeta();
        var model = findModel(cur);
        var scroller = liveScroller(cur);
        var assistantTag = CE.modelFenceTag(model, 'grok');
        return CE.hydrateTranscript({
          scroller: scroller,
          fromEl: scroller,
          maxSteps: 40,
          nodes: function () {
            return turnNodes(cur);
          },
          keyOf: turnKey,
          capture: function (el) {
            return messageFromTurn(el, assistantTag);
          }
        }).then(function (res) {
          return {
            title: findTitle(cur),
            chatId: chatIdFromUrl(),
            model: model,
            userName: u.userName,
            userHandle: u.userHandle,
            userEmail: u.userEmail,
            messages: messagesFromHydrate(res, model, cur)
          };
        });
      }
    });
  }

  CE.observe(mount);
})();
