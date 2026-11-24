(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var PLATFORM = 'janitorai';
  var capsCache = { key: '', data: null };
  var AUTH_COOKIE_BASE = 'sb-auth-auth-token';

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

  function currentLocale() {
    var m = location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
    return m ? m[1].toLowerCase() : 'en';
  }

  function currentChatId() {
    // English UI has no locale prefix: /chats/{id}; others use /ru/chats/{id}.
    var m = location.pathname.match(/^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/chats\/(\d+)/i);
    return m ? m[1] : '';
  }

  function chatUrl(id) {
    return location.origin + '/' + currentLocale() + '/chats/' + encodeURIComponent(id);
  }

  function chatPath(id) {
    return '/' + currentLocale() + '/chats/' + encodeURIComponent(id);
  }

  function cookiePairs() {
    var out = [];
    var raw = document.cookie || '';
    if (!raw) return out;
    var parts = raw.split(';');
    var i;
    for (i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      var eq = part.indexOf('=');
      if (eq <= 0) continue;
      out.push({ name: part.slice(0, eq), value: part.slice(eq + 1) });
    }
    return out;
  }

  function decodeCookieChunk(value) {
    var v = String(value || '');
    try {
      v = decodeURIComponent(v);
    } catch (e) {}
    return v;
  }

  function gatherAuthCookieRaw() {
    var pairs = cookiePairs();
    var bases = {};
    var i;
    for (i = 0; i < pairs.length; i++) {
      var name = pairs[i].name;
      var m = name.match(/^(sb-[^=]+-auth-token)(?:\.(\d+))?$/i);
      if (!m) continue;
      var base = m[1];
      var idx = m[2] != null ? parseInt(m[2], 10) : 0;
      if (!bases[base]) bases[base] = {};
      bases[base][idx] = decodeCookieChunk(pairs[i].value);
    }
    var preferred = bases[AUTH_COOKIE_BASE];
    var pick = preferred;
    if (!pick) {
      var keys = Object.keys(bases);
      if (keys.length) pick = bases[keys[0]];
    }
    if (!pick) return '';
    var indexes = Object.keys(pick)
      .map(function (k) {
        return parseInt(k, 10);
      })
      .filter(function (n) {
        return !isNaN(n);
      })
      .sort(function (a, b) {
        return a - b;
      });
    var joined = '';
    for (i = 0; i < indexes.length; i++) joined += pick[indexes[i]] || '';
    return joined;
  }

  function parseAccessToken(raw) {
    if (!raw) return '';
    var text = String(raw).trim();
    if (text.indexOf('base64-') === 0) text = text.slice(7);
    if (text.charAt(0) === '"') {
      try {
        text = JSON.parse(text);
      } catch (e) {}
    }
    function fromJson(obj) {
      if (!obj || typeof obj !== 'object') return '';
      return String(obj.access_token || obj.accessToken || obj.token || '').trim();
    }
    if (text.charAt(0) === '{') {
      try {
        return fromJson(JSON.parse(text));
      } catch (e) {}
    }
    try {
      var b64 = text.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var decoded = atob(b64);
      if (decoded.charAt(0) === '{') return fromJson(JSON.parse(decoded));
    } catch (e2) {}
    if (/^eyJ/.test(text)) return text;
    return '';
  }

  function accessToken() {
    return parseAccessToken(gatherAuthCookieRaw());
  }

  function requireToken() {
    var tok = accessToken();
    if (!tok) rpcErr('UNAUTHORIZED', 'JanitorAI auth cookie missing — sign in');
    return tok;
  }

  function apiHeaders(extra) {
    var h = {
      Accept: 'application/json, text/plain, */*',
      Authorization: 'Bearer ' + requireToken()
    };
    return Object.assign(h, extra || {});
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: apiHeaders(opts.headers || {}),
      body: opts.body
    });
  }

  async function failFromResponse(res, what) {
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', what + ' ' + res.status);
    if (res.status === 404) rpcErr('NOT_FOUND', what + ' not found');
    if (res.status === 429) rpcErr('RATE_LIMIT', what + ' rate limited', { retryable: true, kind: 'http' });
    var body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch (e) {}
    rpcErr('HOST_ERROR', what + ' ' + res.status + ' ' + body);
  }

  async function readJson(res, what) {
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', what + ' ' + res.status);
    if (!res.ok) await failFromResponse(res, what);
    try {
      return await res.json();
    } catch (e) {
      rpcErr('HOST_ERROR', what + ' invalid json');
    }
  }

  function asArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.chats)) return payload.chats;
    if (Array.isArray(payload.characters)) return payload.characters;
    if (Array.isArray(payload.results)) return payload.results;
    if (payload.data && typeof payload.data === 'object') {
      if (Array.isArray(payload.data.chats)) return payload.data.chats;
      if (Array.isArray(payload.data.items)) return payload.data.items;
      if (Array.isArray(payload.data.characters)) return payload.data.characters;
    }
    return [];
  }

  function characterIdOf(row) {
    if (!row || typeof row !== 'object') return '';
    var id =
      row.character_id ||
      row.characterId ||
      (row.character && (row.character.id || row.character.character_id)) ||
      row.id;
    return id != null && id !== '' ? String(id) : '';
  }

  function characterNameOf(row) {
    if (!row || typeof row !== 'object') return '';
    return String(
      row.character_name ||
        row.name ||
        row.title ||
        (row.character && (row.character.name || row.character.char_name || row.character.title)) ||
        ''
    ).trim();
  }

  function chatIdOf(row) {
    if (!row || typeof row !== 'object') return '';
    var id = row.chat_id || row.chatId || row.id || (row.chat && (row.chat.id || row.chat.chat_id));
    return id != null && id !== '' ? String(id) : '';
  }

  function chatTitleOf(row, fallbackChar) {
    if (!row || typeof row !== 'object') return fallbackChar || 'chat';
    var title = String(
      row.title ||
        row.name ||
        row.chat_name ||
        (row.chat && (row.chat.title || row.chat.name)) ||
        ''
    ).trim();
    if (title) return title;
    var charName = characterNameOf(row) || fallbackChar || '';
    return charName || 'chat';
  }

  function toChat(row, fallbackChar) {
    var id = chatIdOf(row);
    if (!id) return null;
    var title = chatTitleOf(row, fallbackChar);
    return {
      platform: PLATFORM,
      chatId: id,
      title: title,
      url: chatUrl(id),
      updatedAt: Ops.toIso
        ? Ops.toIso(row.updated_at || row.updatedAt || row.last_message_at)
        : row.updated_at || row.updatedAt || null,
      createdAt: Ops.toIso ? Ops.toIso(row.created_at || row.createdAt) : row.created_at || row.createdAt || null
    };
  }

  function findComposerInput() {
    var nodes = document.querySelectorAll('textarea[class*="_chatTextarea_"], textarea[class*="chatTextarea"], textarea');
    var i;
    var best = null;
    for (i = 0; i < nodes.length; i++) {
      if (!visible(nodes[i])) continue;
      var cls = String(nodes[i].className || '');
      if (/_chatTextarea_|chatTextarea/i.test(cls)) return nodes[i];
      if (!best) best = nodes[i];
    }
    return best;
  }

  function composerShell(input) {
    if (!input) return null;
    return (
      input.closest('[class*="_chatInputInner_"]') ||
      input.closest('[class*="chatInputInner"]') ||
      input.closest('[class*="_chatInput_"]') ||
      input.closest('[class*="chatInput"]') ||
      input.parentElement
    );
  }

  function findSendButton() {
    var input = findComposerInput();
    var scope = composerShell(input) || document;
    var byClass = scope.querySelector('[class*="_sendButton_"]');
    if (byClass && visible(byClass)) return byClass;
    var btns = scope.querySelectorAll('button, [role="button"]');
    var i;
    var best = null;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      if (btns[i].closest('[data-chat-export], .chat-export-fmt, .chat-export-dl, .chat-export-menu')) continue;
      var blob = labelOf(btns[i]);
      var cls = String(btns[i].className || '');
      if (/отправ|send|submit/i.test(blob)) return btns[i];
      if (/_sendButton_|sendButton/i.test(cls)) return btns[i];
      if (!best && btns[i].querySelector('svg') && /send|arrow|paper/i.test(btns[i].innerHTML || '')) best = btns[i];
    }
    return best;
  }

  function findPersonaSwitcher() {
    var input = findComposerInput();
    var scope = composerShell(input) || document;
    var byClass = scope.querySelector('[class*="_switcher_"]');
    if (byClass && visible(byClass)) return byClass;
    var left = scope.querySelector('[class*="_controlsLeft_"]');
    if (left) {
      var btn = left.querySelector('button, [role="button"]');
      if (btn && visible(btn)) return btn;
    }
    return null;
  }

  function findThinkingTrigger() {
    var input = findComposerInput();
    var scope = composerShell(input) || document;
    var byClass = scope.querySelector('[class*="_thinkingTrigger_"]');
    if (byClass && visible(byClass)) return byClass;
    return null;
  }

  // KI-008: while a reply streams, JanitorAI turns the send button into
  // "Отмена" / "Cancel". "Cancel" alone is only trusted inside the composer:
  // the inline message editor has its own "Сохранить / Отмена" pair.
  function findStopButton() {
    var shell = composerShell(findComposerInput());
    var btns = document.querySelectorAll('button, [role="button"]');
    var i;
    for (i = 0; i < btns.length; i++) {
      if (!visible(btns[i])) continue;
      if (btns[i].closest('[data-chat-export], .chat-export-menu')) continue;
      var blob = labelOf(btns[i]);
      if (/stop|останов|прерв|abort/i.test(blob)) return btns[i];
      if (shell && shell.contains(btns[i]) && /cancel|отмен/i.test(blob)) return btns[i];
    }
    return null;
  }

  function isGenerating() {
    var stop = findStopButton();
    if (stop && visible(stop) && !stop.disabled) return true;
    var send = findSendButton();
    if (send && (send.disabled || /loading|busy|spin/i.test(String(send.className || '')))) return true;
    return false;
  }

  // Export-side check (KI-008): only an explicit stop/cancel control or a
  // busy send button counts. A *disabled* send button is not used here: it is
  // also disabled when the composer is simply empty, which would make every
  // export wait for nothing.
  function isStreaming() {
    var stop = findStopButton();
    if (stop && !stop.disabled) return true;
    var send = findSendButton();
    return !!(send && /loading|busy|spin/i.test(String(send.className || '')));
  }

  async function waitForStreamEnd(timeoutMs) {
    await Ops.waitFor(
      function () {
        return isStreaming() ? null : true;
      },
      { timeoutMs: timeoutMs, message: 'JanitorAI generation still running' }
    );
  }

  async function waitForIdle(opts) {
    opts = opts || {};
    await Ops.waitFor(
      function () {
        return isGenerating() ? null : true;
      },
      { timeoutMs: opts.timeoutMs || 180000, message: 'JanitorAI idle timeout' }
    );
  }

  function findComposerToolbar() {
    var input = findComposerInput();
    if (!input || !visible(input)) return null;
    var shell = composerShell(input);
    var send = findSendButton();
    var switcher = findPersonaSwitcher();
    var thinking = findThinkingTrigger();
    var controlsRight =
      (send && send.closest('[class*="_controlsRight_"]')) ||
      (thinking && thinking.closest('[class*="_controlsRight_"]')) ||
      (shell && shell.querySelector('[class*="_controlsRight_"]')) ||
      null;
    var controlsRow =
      (controlsRight && controlsRight.closest('[class*="_controlsRow_"]')) ||
      (shell && shell.querySelector('[class*="_controlsRow_"]')) ||
      null;
    var nativeFrom = switcher || thinking || send || input;
    if (controlsRight && send && controlsRight.contains(send)) {
      return {
        el: controlsRight,
        beforeChild: send,
        nativeFrom: nativeFrom,
        nativeIconFrom: send
      };
    }
    if (controlsRight) {
      return {
        el: controlsRight,
        insertAfter: thinking || controlsRight.lastElementChild,
        nativeFrom: nativeFrom,
        nativeIconFrom: send || thinking || null
      };
    }
    if (controlsRow) {
      return {
        el: controlsRow,
        beforeChild: controlsRight || send || null,
        insertAfter: controlsRight || send ? null : controlsRow.lastElementChild,
        nativeFrom: nativeFrom,
        nativeIconFrom: send || null
      };
    }
    if (!shell) return null;
    return {
      el: shell,
      beforeChild: send && shell.contains(send) ? send : null,
      insertAfter: send && shell.contains(send) ? null : input,
      nativeFrom: nativeFrom,
      nativeIconFrom: send || null
    };
  }

  function active() {
    if (/login|signin|sign-in|auth/i.test(location.pathname)) return false;
    return !!findComposerInput() || !!currentChatId();
  }

  function findTitle() {
    var id = currentChatId();
    if (id) {
      var links = document.querySelectorAll('a[href*="/chats/"]');
      var i;
      for (i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href') || '';
        if (href.indexOf('/chats/' + id) >= 0) {
          var t = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
          if (t && t.length < 200) return t;
        }
      }
    }
    var h = document.querySelector('h1, h2, [class*="characterName"], [class*="CharacterName"]');
    if (h) {
      var ht = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (ht && ht.length < 200) return ht;
    }
    var title = (document.title || '').replace(/\s*[|\u2013\u2014-]\s*JanitorAI.*$/i, '').trim();
    return title || 'chat';
  }

  function findModel() {
    return '';
  }

  function findUserMeta() {
    return { userName: '', userHandle: '', userEmail: '' };
  }

  function liveScroller() {
    var turn = document.querySelector('[class*="chatMessage"], [class*="ChatMessage"], [class*="message"]');
    if (turn && CE.findOverflowScroller) return CE.findOverflowScroller(turn);
    return document.querySelector('main') || document.body;
  }

  function turnNodes(root) {
    root = root || liveScroller() || document;
    var nodes = root.querySelectorAll(
      '[class*="chatMessage"], [class*="ChatMessage"], [data-message-id], [class*="_message_"]'
    );
    if (nodes.length) return Array.prototype.slice.call(nodes);
    return [];
  }

  function turnKey(el, i) {
    if (!el) return 'n' + i;
    var id = el.getAttribute('data-message-id') || el.id || '';
    var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return (id || text || 'n' + i);
  }

  function captureTurn(turn, assistantTag) {
    if (!turn) return null;
    var blob = ((turn.className || '') + ' ' + (turn.getAttribute('data-role') || '')).toLowerCase();
    var user = /user|human|is_user|from-user/.test(blob) && !/bot|assistant|is_bot/.test(blob);
    if (!user && /bot|assistant|is_bot|character/.test(blob)) user = false;
    else if (!user) {
      user = !/bot|assistant|character/.test(blob);
    }
    var body =
      turn.querySelector('[class*="markdown"], [class*="messageText"], [class*="MessageText"], p') || turn;
    var text = '';
    try {
      text = user ? (body.innerText || body.textContent || '').trim() : CE.htmlToMarkdown(body);
    } catch (e) {
      text = (body.innerText || body.textContent || '').trim();
    }
    if (!text) return null;
    return {
      role: user ? 'user' : 'assistant',
      roleTag: user ? 'user' : assistantTag || 'janitorai',
      text: text,
      links: CE.collectLinks ? CE.collectLinks(body) : []
    };
  }

  function present(v) {
    return v != null && v !== '' && !(Array.isArray(v) && !v.length);
  }

  function pickFields(src, keys) {
    var out = {};
    if (!src || typeof src !== 'object') return out;
    for (var i = 0; i < keys.length; i++) {
      if (present(src[keys[i]])) out[keys[i]] = src[keys[i]];
    }
    return out;
  }

  function hasKeys(o) {
    return !!o && typeof o === 'object' && Object.keys(o).length > 0;
  }

  // KI-006: keep the REST row metadata (ids, timestamps, commit flag, rating,
  // persona / generation request ids). Exported as messages[].meta in JSON.
  function messageMeta(m) {
    var meta = pickFields(m, ['id', 'created_at', 'rating']);
    if (typeof m.is_main === 'boolean') meta.is_main = m.is_main;
    var md = m.metadata && typeof m.metadata === 'object' ? m.metadata : {};
    if (present(md.persona_id)) meta.persona_id = md.persona_id;
    if (Array.isArray(md.generation_request_ids) && md.generation_request_ids.length) {
      meta.generation_request_ids = md.generation_request_ids.slice();
    }
    return meta;
  }

  function mapApiMessages(messages) {
    var out = [];
    var i;
    for (i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (!m) continue;
      var text = String(m.message || m.content || m.text || '').trim();
      if (!text) continue;
      var isBot = m.is_bot === true || m.isBot === true || String(m.role || '').toLowerCase() === 'assistant';
      var row = isBot
        ? {
            role: 'assistant',
            roleTag: CE.modelFenceTag ? CE.modelFenceTag('', 'janitorai') : 'janitorai',
            text: text,
            links: []
          }
        : {
            role: 'user',
            roleTag: 'user',
            text: text,
            links: []
          };
      var meta = messageMeta(m);
      if (m.__ceNoReply) meta.no_reply = true;
      if (hasKeys(meta)) row.meta = meta;
      out.push(row);
    }
    return out;
  }

  function messageTimestamp(m) {
    if (!m) return 0;
    var raw = m.created_at || m.createdAt || m.updated_at || m.updatedAt || m.timestamp || '';
    var parsed = Date.parse(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    var idn = Number(m.id || m.message_id || m.messageId || 0);
    return Number.isFinite(idn) ? idn : 0;
  }

  function chronologicalMessages(messages) {
    var list = Array.isArray(messages) ? messages.slice() : [];
    if (list.length < 2) return list;
    var hasTs = false;
    var i;
    for (i = 0; i < list.length; i++) {
      if (messageTimestamp(list[i])) {
        hasTs = true;
        break;
      }
    }
    if (hasTs) {
      list.sort(function (a, b) {
        return messageTimestamp(a) - messageTimestamp(b);
      });
      return list;
    }
    return list.reverse();
  }

  function isBotRow(m) {
    return !!m && (m.is_bot === true || m.isBot === true || String(m.role || '').toLowerCase() === 'assistant');
  }

  // KI-005: swipes are sibling bot rows after the same user turn (flat list,
  // no parent pointer). The chosen one is committed as is_main:true on the
  // next user send; before that every variant is is_main:false. Keep the
  // committed rows, else the newest variant (the one just generated/selected).
  function dropSwipeVariants(messages) {
    var out = [];
    var group = [];
    function flush() {
      if (!group.length) return;
      var hasFlag = group.some(function (m) {
        return m && Object.prototype.hasOwnProperty.call(m, 'is_main');
      });
      if (group.length === 1 || !hasFlag) {
        out.push.apply(out, group);
      } else {
        var main = group.filter(function (m) {
          return m.is_main === true;
        });
        if (main.length) out.push.apply(out, main);
        else out.push(group[group.length - 1]);
      }
      group = [];
    }
    for (var i = 0; i < messages.length; i++) {
      if (isBotRow(messages[i])) {
        group.push(messages[i]);
        continue;
      }
      flush();
      out.push(messages[i]);
    }
    flush();
    return out;
  }

  // KI-006: persona/profile the chat runs under. GET carries personas[] (and
  // chat.persona_id / user-row metadata.persona_id); a profile entry is the
  // account's default persona when no explicit persona is selected.
  function personaFrom(data, chat, messages) {
    var list = Array.isArray(data && data.personas) ? data.personas : [];
    if (data && data.profile && typeof data.profile === 'object') list = list.concat([data.profile]);
    var want = chat.persona_id;
    for (var i = messages.length - 1; !present(want) && i >= 0; i--) {
      var md = messages[i] && !isBotRow(messages[i]) && messages[i].metadata;
      if (md && present(md.persona_id)) want = md.persona_id;
    }
    var hit = null;
    if (present(want)) {
      hit = list.filter(function (p) {
        return p && String(p.id) === String(want);
      })[0];
    }
    if (!hit) {
      hit = list.filter(function (p) {
        return p && p.type === 'profile';
      })[0];
    }
    if (!hit && list.length === 1) hit = list[0];
    var out = pickFields(hit, ['id', 'name', 'user_name', 'type']);
    if (!out.id && present(want)) out.id = want;
    return out;
  }

  // KI-006: chat/character/persona context that the export used to drop.
  // Model and context usage are NOT here: JanitorAI only sends them over the
  // generateAlpha WebSocket stream and never persists them (provider limit).
  function contextFrom(data, chat, character, persona) {
    var ctx = pickFields(chat, ['conversation_locale', 'summary', 'persona_id', 'created_at', 'is_public']);
    if (ctx.created_at) {
      ctx.chat_created_at = ctx.created_at;
      delete ctx.created_at;
    }
    var fork = (data && data.fork_source_chat_id) || chat.fork_source_chat_id;
    if (present(fork)) ctx.fork_source_chat_id = fork;
    var ch = pickFields(character, [
      'id',
      'name',
      'display_name',
      'chat_name',
      'avatar',
      'description',
      'first_message',
      'is_nsfw'
    ]);
    if (hasKeys(ch)) ctx.character = ch;
    if (hasKeys(persona)) ctx.persona = persona;
    return ctx;
  }

  // KI-009: "Отмена" aborts the stream after the user row was already saved,
  // so that turn never gets a reply (provider behavior, nothing to recover).
  // Mark such user rows: followed by another user row, or last in the chat
  // while no generation is running. Returns the number of marked rows.
  function markDanglingTurns(messages, generating) {
    var n = 0;
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (!m || isBotRow(m)) continue;
      if (!String(m.message || m.content || m.text || '').trim()) continue;
      var next = null;
      for (var j = i + 1; j < messages.length; j++) {
        if (messages[j] && String(messages[j].message || messages[j].content || messages[j].text || '').trim()) {
          next = messages[j];
          break;
        }
      }
      var dangling = next ? !isBotRow(next) : !generating;
      if (dangling) {
        messages[i] = Object.assign({}, m, { __ceNoReply: true });
        n++;
      }
    }
    return n;
  }

  function lastIsUserTurn(messages) {
    for (var i = messages.length - 1; i >= 0; i--) {
      var m = messages[i];
      if (!m || !String(m.message || m.content || m.text || '').trim()) continue;
      return !isBotRow(m);
    }
    return false;
  }

  function payloadFromGet(data, chatId, opts) {
    opts = opts || {};
    var chat = (data && data.chat) || {};
    var character = (data && data.character) || {};
    var messages = dropSwipeVariants(
      chronologicalMessages((data && data.chatMessages) || (data && data.chat_messages) || chat.messages || [])
    );
    var title =
      String(chat.title || chat.name || character.name || character.char_name || findTitle() || 'chat').trim() ||
      'chat';
    var user = findUserMeta();
    var persona = personaFrom(data, chat, messages);
    var warnings = [];
    var notes = [];
    // KI-008: the in-flight reply is only in the DOM/WebSocket until the page
    // POSTs it after "done"; REST has just the persisted rows.
    if (opts.generating && lastIsUserTurn(messages)) warnings.push('generation-active');
    var dangling = markDanglingTurns(messages, !!opts.generating);
    if (dangling) notes.push('dangling-turns:' + dangling);
    return {
      platform: PLATFORM,
      url: chatUrl(chatId),
      title: title,
      chatId: String(chatId),
      // KI-007: the chat id goes into the file name so two chats with the
      // same character on the same day do not collide.
      fileKey: String(chatId),
      model: findModel(),
      userName: user.userName || persona.name || '',
      userHandle: user.userHandle || persona.user_name || '',
      userEmail: user.userEmail || '',
      context: contextFrom(data, chat, character, persona),
      warnings: warnings,
      notes: notes,
      messages: mapApiMessages(messages)
    };
  }

  async function fetchChat(chatId) {
    var res = await apiFetch('/hampter/chats/' + encodeURIComponent(chatId));
    if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
    return readJson(res, 'get');
  }

  async function loadChatFromApi(chatId, opts) {
    return payloadFromGet(await fetchChat(chatId), chatId, opts);
  }

  var GENERATION_WAIT_MS = 20000;
  var PERSIST_SETTLE_MS = 1200;

  function pause(ms) {
    return Ops.sleep ? Ops.sleep(ms) : new Promise(function (r) { setTimeout(r, ms); });
  }

  // KI-008: export of the open chat while a reply streams. Wait (bounded) for
  // the stream to finish and for the page to POST the reply, then read REST.
  // Still generating after the wait -> export what is saved, flagged
  // 'generation-active' so the bar warns instead of failing silently.
  async function loadOpenChat(chatId) {
    var waited = false;
    if (isStreaming()) {
      waited = true;
      try {
        if (Ops.waitFor) await waitForStreamEnd(GENERATION_WAIT_MS);
      } catch (e) {}
      if (!isStreaming()) await pause(PERSIST_SETTLE_MS);
    }
    var generating = isStreaming();
    var data = await fetchChat(chatId);
    var payload = payloadFromGet(data, chatId, { generating: generating });
    // The reply POST can land just after the button flips back to "send".
    if (waited && !generating && payload.notes.length) {
      var rows = chronologicalMessages((data && data.chatMessages) || []);
      if (lastIsUserTurn(dropSwipeVariants(rows))) {
        await pause(PERSIST_SETTLE_MS);
        payload = await loadChatFromApi(chatId, { generating: isStreaming() });
      }
    }
    return payload;
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href*="/chats/"]');
    var seen = {};
    var items = [];
    var i;
    for (i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/chats\/(\d+)/);
      if (!m) continue;
      var id = m[1];
      if (seen[id]) continue;
      seen[id] = 1;
      var title = (links[i].textContent || '').replace(/\s+/g, ' ').trim() || 'chat';
      var chat = {
        platform: PLATFORM,
        chatId: id,
        title: title,
        url: chatUrl(id),
        updatedAt: null,
        createdAt: null
      };
      if (Ops.matchQuery && !Ops.matchQuery(chat.title, query)) continue;
      items.push(chat);
    }
    return items;
  }

  async function listCharacterPage(page) {
    var res = await apiFetch('/hampter/chats/character-chats?page=' + encodeURIComponent(String(page)));
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list ' + res.status);
    if (!res.ok) await failFromResponse(res, 'list');
    return asArray(await res.json());
  }

  async function listChatsForCharacter(characterId) {
    var res = await apiFetch('/hampter/chats/character/' + encodeURIComponent(characterId));
    if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'list character ' + res.status);
    if (res.status === 404) return [];
    if (!res.ok) await failFromResponse(res, 'list character');
    return asArray(await res.json());
  }

  async function listChats(args) {
    var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
    var page = 1;
    if (args && args.cursor != null && String(args.cursor) !== '') {
      page = Math.max(1, parseInt(String(args.cursor), 10) || 1);
    }
    requireToken();
    var characters = await listCharacterPage(page);
    var items = [];
    var i;
    for (i = 0; i < characters.length && items.length < limit; i++) {
      var charRow = characters[i];
      var cid = characterIdOf(charRow);
      var cname = characterNameOf(charRow);
      if (!cid) {
        var direct = toChat(charRow, cname);
        if (direct) {
          if (!(Ops.matchQuery && !Ops.matchQuery(direct.title, args && args.query))) items.push(direct);
        }
        continue;
      }
      var chats = await listChatsForCharacter(cid);
      var j;
      for (j = 0; j < chats.length && items.length < limit; j++) {
        var chat = toChat(chats[j], cname);
        if (!chat) continue;
        if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
        items.push(chat);
      }
    }
    var nextCursor = characters.length > 0 ? String(page + 1) : null;
    if (!characters.length) nextCursor = null;
    return { items: items, nextCursor: nextCursor };
  }

  async function navigateToChat(chatId) {
    if (currentChatId() === chatId && visible(findComposerInput())) return;
    var path = chatPath(chatId);
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
        { timeoutMs: 5000, message: 'JanitorAI soft navigate timeout' }
      );
      softOk = true;
    } catch (e) {}
    if (!softOk) {
      location.assign(chatUrl(chatId));
      await Ops.waitFor(
        function () {
          return currentChatId() === chatId && visible(findComposerInput()) ? true : null;
        },
        { timeoutMs: 30000, message: 'JanitorAI navigate timeout' }
      );
    }
  }

  function findNewChatControl() {
    var nodes = document.querySelectorAll('button, [role="button"], a');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!visible(nodes[i])) continue;
      var blob = labelOf(nodes[i]);
      if (/^(new chat|новый чат|create chat|start chat|новый)$/i.test(blob)) return nodes[i];
      if (/new chat|новый чат|create a new chat|start new chat/i.test(blob) && blob.length < 40) return nodes[i];
    }
    return null;
  }

  async function ensureComposerForCreate() {
    if (visible(findComposerInput())) {
      var neu = findNewChatControl();
      if (neu && currentChatId()) {
        try {
          Ops.clickEl ? Ops.clickEl(neu) : neu.click();
          await Ops.waitFor(
            function () {
              return visible(findComposerInput()) ? true : null;
            },
            { timeoutMs: 8000, message: 'JanitorAI new chat timeout' }
          );
        } catch (e) {}
      }
      return;
    }
    rpcErr(
      'HOST_ERROR',
      'composer not found — open a character chat on JanitorAI before create'
    );
  }

  async function submitComposer(text) {
    var input = findComposerInput();
    if (!input) rpcErr('HOST_ERROR', 'composer not found');
    await waitForIdle({ timeoutMs: 60000 });
    if (Ops.fillTextarea) await Ops.fillTextarea(input, text);
    else if (Ops.fillEditable) Ops.fillEditable(input, text);
    else {
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
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
      { timeoutMs: opts.timeoutMs || 180000, message: 'JanitorAI reply timeout' }
    );
  }

  // API-only export (exportDomFallback:false): the DOM is virtualized, so a
  // failure must surface as an error, never as a partial page scrape.
  async function exportDataFromApi() {
    var chatId = currentChatId();
    if (!chatId) rpcErr('NOT_FOUND', 'JanitorAI chat id not found in URL', { apiOnly: true });
    try {
      return await loadOpenChat(chatId);
    } catch (e) {
      var details = Object.assign({}, (e && e.details) || {}, { apiOnly: true, code: (e && e.code) || 'HOST_ERROR' });
      throw new CE.RpcError((e && e.code) || 'HOST_ERROR', (e && e.message) || 'JanitorAI export failed', details);
    }
  }

  function capabilitiesCacheKey() {
    return currentChatId() + '|' + (accessToken() ? '1' : '0') + '|' + location.pathname;
  }

  async function detectCapabilities() {
    requireToken();
    return {
      platform: PLATFORM,
      projectsSupported: false,
      models: [],
      modes: [],
      toggles: [],
      tools: [],
      attach: { supported: false, multiple: false, accept: [] },
      current: { model: '', toggles: [] },
      detectedAt: new Date().toISOString()
    };
  }

  CE.definePlatform({
    id: PLATFORM,
    modifier: 'janitorai',
    fenceTag: 'janitorai',
    exportData: exportDataFromApi,
    exportDomFallback: false,
    active: active,
    composer: findComposerToolbar,
    chatId: currentChatId,
    title: findTitle,
    model: findModel,
    user: findUserMeta,
    scroller: liveScroller,
    turns: turnNodes,
    turnKey: turnKey,
    capture: captureTurn,
    downloadSvg: function () {
      return (
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="chat-export-dl-icon">' +
        '<path d="M10 2.75a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.5A.75.75 0 0 1 10 2.75z"/>' +
        '<path d="M3.75 14.5a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75z"/>' +
        '</svg>'
      );
    },
    ops: {
      list: async function (args) {
        try {
          return await listChats(args);
        } catch (err) {
          if (err && err.code && err.code !== 'HOST_ERROR') throw err;
          var domItems = listFromDom(args && args.query).slice(
            0,
            Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20
          );
          return { items: domItems, nextCursor: null };
        }
      },
      get: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            chatId = currentChatId();
            if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          }
          var isOpen = chatId === currentChatId();
          var payload = await loadChatFromApi(chatId, { generating: isOpen && isStreaming() });
          if (isOpen) payload.url = location.href;
          return payload;
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
            platform: PLATFORM,
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
          await ensureComposerForCreate();
          var before = turnCount();
          await submitComposer(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              return id || null;
            },
            { timeoutMs: 120000, message: 'JanitorAI chatId timeout' }
          );
          try {
            await waitForReply(before);
          } catch (e) {}
          return {
            platform: PLATFORM,
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
          requireToken();
          var res = await apiFetch('/hampter/chats/' + encodeURIComponent(chatId), { method: 'DELETE' });
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 405 || res.status === 501) {
            rpcErr('HOST_ERROR', 'JanitorAI delete API unavailable (' + res.status + ')');
          }
          if (!(res.status >= 200 && res.status < 300)) await failFromResponse(res, 'delete');
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      }
    }
  });
})();
