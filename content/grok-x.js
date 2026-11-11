(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

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

  var Ops = CE.Ops || {};
  var GROK_PATH = '/i/grok';
  var DELETE_RE = /удалить|delete/i;
  var HISTORY_RE = /^(История|History)/i;
  var SEND_RE = /send|отправ|submit|grok something|спросить/i;
  var MORE_SELECTOR =
    'button[aria-haspopup="menu"], button[aria-label*="more" i], button[aria-label*="ещ" i], button[aria-label*="действ" i], button[aria-label*="actions" i]';

  function rpcErr(code, message, details) {
    throw new CE.RpcError(code, message, details);
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function projectsGuard() {
    rpcErr('OPTION_NOT_FOUND', 'Projects are not supported on ' + PLATFORM, { supported: false });
  }

  function chatUrl(id) {
    return location.origin + GROK_PATH + '?conversation=' + encodeURIComponent(id);
  }

  function loginRequired() {
    return /^\/(i\/flow\/login|login)(\/|$)/i.test(location.pathname || '');
  }

  function failNav(message) {
    if (loginRequired()) rpcErr('UNAUTHORIZED', 'X requires login to use Grok');
    rpcErr('TIMEOUT', message);
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function labelOf(el) {
    return ((el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')).replace(/\s+/g, ' ').trim();
  }

  function turnCount() {
    var root = activeRoot();
    return root ? turnNodes(root).length : 0;
  }

  function composerInput() {
    var root = activeRoot();
    return root ? findComposerTextarea(root) : null;
  }

  function isGenerating() {
    return !!(Ops.findStopControl && Ops.findStopControl(activeRoot() || document));
  }

  function findSendButton(input) {
    var node = input && input.parentElement;
    for (var depth = 0; node && depth < 6; depth++) {
      var btns = node.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        if (b.closest('[data-chat-export-bar]') || !visible(b)) continue;
        var blob = (b.getAttribute('data-testid') || '') + ' ' + labelOf(b);
        if (/voice|голос|attach|файл|file|mode|режим/i.test(blob)) continue;
        if (SEND_RE.test(blob) || b.getAttribute('type') === 'submit') return b;
      }
      node = node.parentElement;
    }
    return null;
  }

  function historyRows() {
    var seen = {};
    var out = [];
    var links = document.querySelectorAll('a[href*="conversation="]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (link.closest('[data-chat-export-bar]')) continue;
      var id = '';
      try {
        id = new URL(link.getAttribute('href'), location.href).searchParams.get('conversation') || '';
      } catch (e) {}
      if (!id || seen[id]) continue;
      seen[id] = true;
      var title = (link.innerText || link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      out.push({ id: id, title: title, el: link });
    }
    return out;
  }

  async function ensureGrokPage() {
    if (isGrokPath()) return;
    Ops.softNavigate(GROK_PATH);
    await Ops.waitFor(
      function () {
        return isGrokPath() && activeRoot() ? true : null;
      },
      { timeoutMs: 15000, message: 'Grok page timeout' }
    ).catch(function () {
      failNav('X Grok page timeout');
    });
  }

  async function openHistory() {
    if (historyRows().length) return false;
    var btns = document.querySelectorAll('button, [role="button"]');
    for (var i = 0; i < btns.length; i++) {
      if (!visible(btns[i]) || btns[i].closest('[data-chat-export-bar]')) continue;
      var aria = (btns[i].getAttribute('aria-label') || '').trim();
      var text = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (HISTORY_RE.test(aria) || HISTORY_RE.test(text)) {
        Ops.clickEl(btns[i]);
        return true;
      }
    }
    return false;
  }

  async function readHistory() {
    await ensureGrokPage();
    var opened = await openHistory();
    var rows = await Ops.waitFor(
      function () {
        var found = historyRows();
        return found.length ? found : null;
      },
      { timeoutMs: 5000, message: 'history empty' }
    ).catch(function () {
      return [];
    });
    return { rows: rows, opened: opened };
  }

  function toChat(id, title) {
    return {
      platform: PLATFORM,
      chatId: id,
      title: title || '',
      url: chatUrl(id),
      updatedAt: null,
      createdAt: null
    };
  }

  async function navigateToChat(chatId) {
    if (isGrokPath() && chatIdFromUrl() === chatId && activeRoot()) return;
    Ops.softNavigate(GROK_PATH + '?conversation=' + encodeURIComponent(chatId));
    await Ops.waitFor(
      function () {
        return isGrokPath() && chatIdFromUrl() === chatId && composerInput() ? true : null;
      },
      { timeoutMs: 25000, message: 'Grok X navigate timeout' }
    ).catch(function () {
      failNav('Grok X navigate timeout: ' + chatId);
    });
    await Ops.waitFor(
      function () {
        return turnCount() > 0 ? true : null;
      },
      { timeoutMs: 15000, message: 'conversation empty' }
    ).catch(function () {
      rpcErr('NOT_FOUND', 'conversation not found or empty: ' + chatId);
    });
  }

  async function ensureNewChat() {
    if (isGrokPath() && !chatIdFromUrl() && composerInput()) return;
    Ops.softNavigate(GROK_PATH);
    await Ops.waitFor(
      function () {
        return isGrokPath() && !chatIdFromUrl() && composerInput() ? true : null;
      },
      { timeoutMs: 25000, message: 'Grok X new chat timeout' }
    ).catch(function () {
      failNav('Grok X new chat timeout');
    });
  }

  async function submitComposerText(text) {
    var body = String(text || '').trim();
    if (!body) rpcErr('BAD_REQUEST', 'text is required');
    var input = await Ops.waitFor(composerInput, { timeoutMs: 15000, message: 'Grok X composer timeout' }).catch(
      function () {
        failNav('Grok X composer timeout');
      }
    );
    var turnsBefore = turnCount();
    Ops.fillEditable(input, body);
    await Ops.sleep(200);
    await Ops.ensureComposerSubmitted({
      send: findSendButton(input),
      input: input,
      message: 'Grok X submit failed',
      isDone: function () {
        return isGenerating() || turnCount() > turnsBefore ? true : null;
      }
    });
    return turnsBefore;
  }

  async function waitAssistantReply(turnsBefore, timeoutMs) {
    var lastSig = '';
    var stableSince = 0;
    await Ops.waitFor(
      function () {
        if (isGenerating()) {
          stableSince = 0;
          return null;
        }
        var root = activeRoot();
        if (!root) return null;
        var turns = turnNodes(root);
        if (turns.length <= turnsBefore) return null;
        var last = turns[turns.length - 1];
        if (!hasCopy(last)) return null;
        var sig = turns.length + ':' + (last.innerText || '').length;
        if (sig !== lastSig) {
          lastSig = sig;
          stableSince = Date.now();
          return null;
        }
        return Date.now() - stableSince >= 1500 ? true : null;
      },
      { timeoutMs: timeoutMs || 180000, intervalMs: 300, message: 'Grok X reply timeout' }
    ).catch(function () {
      rpcErr('TIMEOUT', 'Grok X reply timeout');
    });
  }

  async function sendInChat(chatId, text) {
    await navigateToChat(chatId);
    var turnsBefore = await submitComposerText(text);
    await waitAssistantReply(turnsBefore, 180000);
  }

  function composeAsk(args, requireSelection) {
    var selection = String((args && args.selection) || '').trim();
    var prompt = String((args && args.prompt) || '').trim();
    if (!prompt) rpcErr('BAD_REQUEST', 'prompt required');
    if (requireSelection && !selection) rpcErr('BAD_REQUEST', 'selection required');
    if (!selection) return { selection: '', text: prompt };
    var text = Ops.quoteSelectionPrompt ? Ops.quoteSelectionPrompt(selection, prompt) : '> ' + selection + '\n\n' + prompt;
    return { selection: selection, text: text };
  }

  function requireChatId(args) {
    var chatId = args && args.chatId ? String(args.chatId) : '';
    if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
    return chatId;
  }

  async function deleteViaHistory(chatId) {
    var read = await readHistory();
    var row = null;
    for (var i = 0; i < read.rows.length; i++) {
      if (read.rows[i].id === chatId) row = read.rows[i];
    }
    if (!row) rpcErr('NOT_FOUND', 'conversation not found in history: ' + chatId);
    var trigger = null;
    var node = row.el;
    for (var depth = 0; node && depth < 5 && !trigger; depth++) {
      trigger = node.querySelector(MORE_SELECTOR);
      node = node.parentElement;
    }
    if (!trigger) rpcErr('HOST_ERROR', 'history row actions button not found');
    var menu = await Ops.openMenu(trigger, { message: 'history row menu did not open' });
    if (!Ops.pickMenuItem(menu, DELETE_RE)) {
      Ops.closeMenu(document);
      rpcErr('OPTION_NOT_FOUND', 'delete menu item not found');
    }
    var confirm = await Ops.waitFor(
      function () {
        var dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], [data-testid="confirmationSheetDialog"]');
        for (var d = 0; d < dialogs.length; d++) {
          var btns = dialogs[d].querySelectorAll('button, [role="button"]');
          for (var b = 0; b < btns.length; b++) {
            var t = (btns[b].textContent || '').replace(/\s+/g, ' ').trim();
            if (/^(удалить|delete)$/i.test(t) && !btns[b].disabled) return btns[b];
          }
        }
        return null;
      },
      { timeoutMs: 4000, message: 'delete confirmation not found' }
    ).catch(function () {
      return null;
    });
    if (confirm) Ops.clickEl(confirm);
    await Ops.waitFor(
      function () {
        for (var r = 0; r < historyRows().length; r++) {
          if (historyRows()[r].id === chatId) return null;
        }
        return true;
      },
      { timeoutMs: 10000, message: 'conversation still present after delete' }
    ).catch(function () {
      rpcErr('HOST_ERROR', 'conversation still present after delete: ' + chatId);
    });
    if (read.opened) Ops.closeMenu(document);
  }

  function composer() {
    var root = activeRoot();
    if (!root || !findComposerTextarea(root)) return null;
    var found = findComposerToolbar(root);
    if (!found || !found.el) return null;
    var chip = findModeChip(root);
    if (chip) found.nativeFrom = chip;
    return found;
  }

  CE.definePlatform({
    id: PLATFORM,
    modifier: 'grok-x',
    fenceTag: 'grok',
    maxSteps: 40,
    composer: composer,
    chatId: chatIdFromUrl,
    title: function () {
      return findTitle(activeRoot());
    },
    model: function () {
      var root = activeRoot();
      return root ? findModel(root) : '';
    },
    user: findUserMeta,
    scroller: function () {
      var root = activeRoot();
      return root ? liveScroller(root) : null;
    },
    turns: function () {
      var root = activeRoot();
      return root ? turnNodes(root) : [];
    },
    turnKey: turnKey,
    capture: messageFromTurn,
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit(args && args.limit);
          var offset = parseInt(args && args.cursor, 10) || 0;
          var read = await readHistory();
          if (read.opened) Ops.closeMenu(document);
          var rows = read.rows.slice();
          var current = chatIdFromUrl();
          if (current && !rows.some(function (r) { return r.id === current; })) {
            rows.unshift({ id: current, title: findTitle(activeRoot()) });
          }
          var matched = rows.filter(function (r) {
            return !Ops.matchQuery || Ops.matchQuery(r.title, args && args.query);
          });
          var page = matched.slice(offset, offset + limit).map(function (r) {
            return toChat(r.id, r.title);
          });
          return {
            items: page,
            nextCursor: offset + limit < matched.length ? String(offset + limit) : null
          };
        } catch (err) {
          hostErr(err);
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (chatId && chatId !== chatIdFromUrl()) await navigateToChat(chatId);
          var data = (await ctx.getData()) || {};
          return Object.assign({ platform: PLATFORM, url: location.href }, data, chatId ? { chatId: chatId } : {});
        } catch (err) {
          hostErr(err);
        }
      },
      create: async function (args) {
        try {
          var text = String((args && args.text) || '').trim();
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          await ensureNewChat();
          await submitComposerText(text);
          var chatId = await Ops.waitFor(chatIdFromUrl, { timeoutMs: 90000, message: 'Grok X chatId timeout' }).catch(
            function () {
              rpcErr('TIMEOUT', 'Grok X chatId timeout');
            }
          );
          return {
            platform: PLATFORM,
            chatId: chatId,
            title: findTitle(activeRoot()),
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      send: async function (args) {
        try {
          var chatId = requireChatId(args);
          if (!String((args && args.text) || '').trim()) rpcErr('BAD_REQUEST', 'text is required');
          await sendInChat(chatId, args.text);
          return {
            platform: PLATFORM,
            chatId: chatId,
            title: findTitle(activeRoot()),
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      delete: async function (args) {
        try {
          var chatId = requireChatId(args);
          await deleteViaHistory(chatId);
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      },
      hostState: function () {
        var input = composerInput();
        return {
          generating: isGenerating(),
          composerReady: !!input && (Ops.composerReady ? Ops.composerReady(input) : true)
        };
      },
      askSelection: async function (args, ctx) {
        try {
          var chatId = requireChatId(args);
          var ask = composeAsk(args, true);
          await sendInChat(chatId, ask.text);
          var data = (await ctx.getData()) || {};
          var messages = data.messages || [];
          return {
            status: 'done',
            platform: PLATFORM,
            chatId: chatId,
            selection: ask.selection,
            reply: messages[messages.length - 1] || null,
            after: Math.max(messages.length - 1, 0),
            total: messages.length
          };
        } catch (err) {
          hostErr(err);
        }
      },
      sideAsk: async function (args) {
        try {
          var chatId = requireChatId(args);
          var ask = composeAsk(args, false);
          await sendInChat(chatId, ask.text);
          return { status: 'done', platform: PLATFORM, chatId: chatId, mode: 'main_fallback' };
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function () {
        try {
          var root = activeRoot();
          var model = root ? findModel(root) : '';
          var id = model && Ops.normalizeId ? Ops.normalizeId(model) : model;
          var models = model ? [{ id: id, label: model, kind: 'model' }] : [];
          return {
            platform: PLATFORM,
            projectsSupported: false,
            models: models,
            modes: models.slice(),
            toggles: [],
            tools: [],
            current: model ? { model: id, mode: id, toggles: [] } : {},
            detectedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      containers: async function () {
        return { items: [], nextCursor: null };
      },
      containerChats: async function () {
        projectsGuard();
      },
      containerCreate: async function () {
        projectsGuard();
      },
      containerDelete: async function () {
        projectsGuard();
      },
      containerMoveChat: async function () {
        projectsGuard();
      }
    }
  });
})();
