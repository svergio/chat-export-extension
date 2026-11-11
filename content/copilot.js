(function () {
  'use strict';

  var CE = window.ChatExport;
  if (!CE || !CE.definePlatform) return;

  var Ops = CE.Ops || {};
  var COPILOT_API_HOSTS = [
    'https://api.individual.githubcopilot.com',
    'https://api.business.githubcopilot.com',
    'https://api.enterprise.githubcopilot.com'
  ];
  var CREATE_BUDGET_MS = 50000;

  function classOf(el) {
    return el && el.className ? String(el.className) : '';
  }

  var platform = 'copilot';

  function rpcErr(code, message, details) {
    throw new CE.RpcError(code, message, details);
  }

  function rejectProjects() {
    rpcErr('OPTION_NOT_FOUND', 'Projects are not supported on ' + platform, { supported: false });
  }

  function hostErr(err) {
    if (err && err.code && CE.RpcError && err instanceof CE.RpcError) throw err;
    rpcErr('HOST_ERROR', (err && err.message) || String(err || 'host error'));
  }

  function currentChatId() {
    var m = location.pathname.match(/\/copilot\/c\/([0-9a-fA-F-]{8,})/);
    return m ? m[1] : '';
  }

  function chatUrl(id) {
    return location.origin + '/copilot/c/' + id;
  }

  async function fetchChatToken() {
    var res = await fetch('/github-copilot/chat/token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'github-verified-fetch': 'true'
      },
      body: ''
    });
    if (res.status === 401 || res.status === 403) {
      rpcErr('UNAUTHORIZED', 'Copilot token ' + res.status);
    }
    if (!res.ok) {
      var t = await res.text();
      rpcErr('HOST_ERROR', 'Copilot token ' + res.status + ' ' + t.slice(0, 120));
    }
    var json = await res.json();
    if (!json || !json.token) rpcErr('UNAUTHORIZED', 'no Copilot chat token');
    return json.token;
  }

  function apiHeaders(token) {
    return {
      Authorization: 'GitHub-Bearer ' + token,
      'Copilot-Integration-Id': 'copilot-chat',
      'X-Github-Api-Version': '2025-05-01',
      Accept: 'application/json'
    };
  }

  async function apiFetch(path, opts) {
    opts = opts || {};
    var token = await fetchChatToken();
    var headers = Object.assign(apiHeaders(token), opts.headers || {});
    var lastErr = null;
    for (var i = 0; i < COPILOT_API_HOSTS.length; i++) {
      var url = COPILOT_API_HOSTS[i] + path;
      var res;
      try {
        res = await fetch(url, {
          method: opts.method || 'GET',
          headers: headers,
          credentials: 'omit'
        });
      } catch (e) {
        lastErr = e;
        continue;
      }
      if (res.status === 404 && i < COPILOT_API_HOSTS.length - 1 && opts.tryNextHostOn404) {
        continue;
      }
      return res;
    }
    if (lastErr) {
      rpcErr(
        'HOST_ERROR',
        'Copilot API unreachable (need host_permissions for api.*.githubcopilot.com?): ' +
          ((lastErr && lastErr.message) || lastErr)
      );
    }
    rpcErr('HOST_ERROR', 'Copilot API unreachable');
  }

  function toChat(thread) {
    return {
      platform: 'copilot',
      chatId: thread.id,
      title: thread.name || '',
      url: chatUrl(thread.id),
      updatedAt: Ops.toIso ? Ops.toIso(thread.updatedAt) : thread.updatedAt || null,
      createdAt: Ops.toIso ? Ops.toIso(thread.createdAt) : thread.createdAt || null
    };
  }

  function roleTagFor(role, model) {
    if (role === 'user') return 'user';
    if (CE.modelFenceTag) return CE.modelFenceTag(model, 'copilot');
    var raw = String(model || '')
      .trim()
      .toLowerCase();
    if (!raw) return 'copilot';
    return (
      'copilot-' +
      raw
        .replace(/[^a-z0-9+._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
    );
  }

  function mapApiMessages(messages) {
    var out = [];
    for (var i = 0; i < (messages || []).length; i++) {
      var m = messages[i];
      if (!m) continue;
      var role = String(m.role || '').toLowerCase();
      if (role !== 'user' && role !== 'assistant') continue;
      var text = typeof m.content === 'string' ? m.content.trim() : '';
      if (!text && Array.isArray(m.content)) {
        text = m.content
          .map(function (p) {
            if (typeof p === 'string') return p;
            if (p && typeof p.text === 'string') return p.text;
            return '';
          })
          .join('\n\n')
          .trim();
      }
      if (!text) continue;
      out.push({
        role: role,
        roleTag: roleTagFor(role, m.model || ''),
        text: text,
        links: []
      });
    }
    return out;
  }

  function listFromDom(query) {
    var links = document.querySelectorAll('a[href*="/copilot/c/"]');
    var seen = {};
    var items = [];
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var m = href.match(/\/copilot\/c\/([0-9a-fA-F-]{8,})/);
      if (!m || seen[m[1]]) continue;
      seen[m[1]] = 1;
      var title = (links[i].textContent || '').replace(/\s+/g, ' ').trim();
      var chat = {
        platform: 'copilot',
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

  function findNewChatControl() {
    return (
      document.querySelector('a[aria-label="New chat" i]') ||
      document.querySelector('a[href="/copilot"]') ||
      document.querySelector('a[href="/copilot/"]') ||
      Array.prototype.find.call(document.querySelectorAll('button, a'), function (el) {
        return /^(Start new chat|New chat)$/i.test(
          (el.textContent || '').replace(/\s+/g, ' ').trim()
        );
      })
    );
  }

  function newChatReady() {
    var ta = findChatTextarea();
    return !currentChatId() && ta && textareaVisible(ta);
  }

  // Soft navigation first: clicking the New chat anchor can trigger a full page load,
  // which drops the RPC port (bfcache) and loses the create response.
  async function ensureNewChat(timeoutMs) {
    if (newChatReady()) return;
    if (Ops.softNavigate) Ops.softNavigate('/copilot');
    else {
      history.pushState({}, '', '/copilot');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    var soft = await Ops.waitFor(newChatReady, { timeoutMs: 5000 }).catch(function () {
      return null;
    });
    if (soft) return;
    var btn = findNewChatControl();
    if (btn) Ops.clickEl(btn);
    await Ops.waitFor(newChatReady, {
      timeoutMs: timeoutMs || 15000,
      message: 'Copilot new chat composer timeout'
    });
  }

  async function threadIds() {
    var res = await apiFetch('/github/chat/threads?', { tryNextHostOn404: true });
    if (!res.ok) throw new Error('threads ' + res.status);
    var data = await res.json();
    var raw = (data && data.threads) || [];
    var ids = [];
    for (var i = 0; i < raw.length; i++) {
      if (raw[i] && raw[i].id) ids.push(String(raw[i].id));
    }
    return ids;
  }

  async function snapshotThreadIds() {
    try {
      return await threadIds();
    } catch (e) {
      return null;
    }
  }

  async function waitForNewChatId(known, deadline) {
    var nextApiAt = Date.now() + 2500;
    while (Date.now() < deadline) {
      var id = currentChatId();
      if (id) return id;
      if (known && Date.now() >= nextApiAt) {
        nextApiAt = Date.now() + 3500;
        try {
          var ids = await threadIds();
          for (var i = 0; i < ids.length; i++) {
            if (known.indexOf(ids[i]) < 0) return ids[i];
          }
        } catch (e) {}
      }
      await Ops.sleep(300);
    }
    rpcErr(
      'TIMEOUT',
      'Copilot create: message submitted but no new thread id (URL /copilot/c/:id or threads API) before deadline'
    );
  }

  function findSendButton(form) {
    form = form || (findChatTextarea() && findChatTextarea().closest('form'));
    if (!form) return null;
    var byIcon = form.querySelector('button svg.octicon-paper-airplane');
    if (byIcon) return byIcon.closest('button');
    var btns = form.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var aria = (b.getAttribute('aria-label') || '').toLowerCase();
      if (/^send\b|send message|отправ/i.test(aria)) return b;
      if (b.querySelector('svg[class*="paper-airplane"], svg.octicon-paper-airplane')) return b;
    }
    var actions = form.querySelector('[class*="actions"]');
    if (actions) {
      var kids = actions.querySelectorAll('button');
      if (kids.length) return kids[kids.length - 1];
    }
    return null;
  }

  function sendEnabled(btn) {
    return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true');
  }

  async function submitComposer(ta) {
    var form = ta && ta.closest('form');
    var send = await Ops.waitFor(
      function () {
        var b = findSendButton(form && form.isConnected ? form : null);
        return sendEnabled(b) ? b : null;
      },
      { timeoutMs: 5000, intervalMs: 150 }
    ).catch(function () {
      return findSendButton(form);
    });
    // React may swap the textarea after submit (route change to /copilot/c/:id); read the live one.
    function draftText() {
      var live = findChatTextarea();
      var el = live || (ta && ta.isConnected ? ta : null);
      return String((el && (el.value || el.innerText)) || '').trim();
    }
    if (Ops.ensureComposerSubmitted) {
      await Ops.ensureComposerSubmitted({
        send: sendEnabled(send) ? send : null,
        input: ta,
        message: 'Copilot submit failed (draft still in composer)',
        isDone: function () {
          return draftText() ? null : true;
        }
      });
      return;
    }
    if (sendEnabled(send)) {
      if (Ops.clickEl) Ops.clickEl(send);
      else send.click();
      return;
    }
    if (ta) {
      if (Ops.dispatchEnter) Ops.dispatchEnter(ta);
      else {
        ta.focus();
        ta.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          })
        );
      }
    }
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

  function wrapChildOf(parent, el) {
    if (!parent || !el) return null;
    var n = el;
    while (n && n.parentElement !== parent) n = n.parentElement;
    return n && n.parentElement === parent ? n : null;
  }

  function findChatTextarea() {
    return document.querySelector('#copilot-chat-textarea');
  }

  function textareaVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 16;
  }

  function findAskButton(form) {
    var btns = form.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (/^Ask$/i.test(t) || /modeSelectButton/i.test(classOf(btns[i]))) return btns[i];
    }
    return null;
  }

  var capsCache = { key: '', data: null };

  function capabilitiesCacheKey() {
    return location.pathname + '#' + (currentChatId() || 'landing');
  }

  function invalidateCapabilitiesCache() {
    capsCache.key = '';
    capsCache.data = null;
  }

  function findComposerForm() {
    var ta = findChatTextarea();
    return ta && ta.closest('form');
  }

  function findModelButton(form) {
    form = form || findComposerForm();
    if (!form) return null;
    var btns = form.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var text = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (/^Model:\s+/i.test(text)) return btns[i];
      if (/menuButton/i.test(classOf(btns[i])) && /model:/i.test(text)) return btns[i];
    }
    return null;
  }

  function findModeSelectButton(form) {
    form = form || findComposerForm();
    if (!form) return findAskButton(form);
    var direct = form.querySelector('button.modeSelectButton, button[class*="modeSelectButton" i]');
    if (direct) return direct;
    return findAskButton(form);
  }

  function findOptimizeButton(form) {
    form = form || findComposerForm();
    if (!form) return null;
    var btns = form.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var text = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
      var aria = (btns[i].getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (/^Optimized for:/i.test(text) || /^Optimized for:/i.test(aria)) return btns[i];
    }
    return null;
  }

  function findAttachmentButton(form) {
    form = form || findComposerForm();
    if (!form) return null;
    return form.querySelector('button[data-testid="attachment-menu-button"]');
  }

  function findReposToolButton(form) {
    form = form || findComposerForm();
    if (!form) return null;
    return form.querySelector('button[aria-label*="Select repositories" i]');
  }

  function stripModelBadges(raw) {
    var s = String(raw || '')
      .replace(/\s+/g, ' ')
      .trim();
    s = s.replace(/,.*$/, '').trim();
    s = s.replace(/\s*(Pro\+|Pro plus|Max)\s*$/i, '').trim();
    return s;
  }

  function modelLabelLocked(label, item) {
    if (item && (item.locked || item.disabled)) {
      var low = String(label || '').toLowerCase();
      if (/pro\+|max|upgrade|premium/i.test(low)) return true;
    }
    return /\b(Pro\+|Pro plus|Max)\b/i.test(String(label || ''));
  }

  function modeLabelToOption(label, item) {
    var raw = String(label || '').replace(/\s+/g, ' ').trim();
    var locked = !!(item && (item.locked || (item.disabled && /upgrade|agent/i.test(raw))));
    if (/agent/i.test(raw)) {
      return { id: 'agent', label: 'Agent', kind: 'mode', locked: locked || /upgrade/i.test(raw) };
    }
    if (/^ask$/i.test(raw)) return { id: 'ask', label: 'Ask', kind: 'mode', locked: locked };
    var id = Ops.normalizeId ? Ops.normalizeId(raw) : raw.toLowerCase();
    return { id: id, label: raw, kind: 'mode', locked: locked };
  }

  function modelItemToOption(item) {
    var label = stripModelBadges(item.label);
    var id = Ops.normalizeId ? Ops.normalizeId(label) : label.toLowerCase();
    if (!id && /auto/i.test(item.label)) id = 'auto';
    var opt = { id: id, label: label, kind: 'model' };
    if (modelLabelLocked(item.label, item)) opt.locked = true;
    return opt;
  }

  function toggleItemToOption(item) {
    var raw = String(item.label || '').replace(/\s+/g, ' ').trim();
    var low = raw.toLowerCase();
    var id;
    var label;
    if (/^efficiency\b/i.test(raw) || /\befficiency\b/.test(low)) {
      id = 'efficiency';
      label = 'Efficiency';
    } else if (/^balance\b/i.test(raw) || /\bbalance\b/.test(low)) {
      id = 'balance';
      label = 'Balance';
    } else if (/^intelligence\b/i.test(raw) || /\bintelligence\b/.test(low)) {
      id = 'intelligence';
      label = 'Intelligence';
    } else {
      var m = raw.match(/^(?:Optimized for:\s*)?(.+)$/i);
      label = m && m[1] ? m[1].trim() : raw;
      if (/^optimized for:/i.test(raw)) label = raw.replace(/^Optimized for:\s*/i, '').trim();
      id = Ops.normalizeId ? Ops.normalizeId(label) : label.toLowerCase();
      if (id === 'balance' || /^balance$/i.test(label)) {
        id = 'balance';
        label = 'Balance';
      }
    }
    var opt = { id: id, label: label, kind: 'toggle' };
    if (item.locked || item.disabled) opt.locked = true;
    if (item.checked) opt.checked = true;
    return opt;
  }

  function toolLabelToOption(label) {
    var raw = String(label || '').replace(/\s+/g, ' ').trim();
    var low = raw.toLowerCase();
    var id = 'tool';
    if (/repositor/i.test(low)) id = 'repositories';
    else if (/spaces/.test(low)) id = 'spaces';
    else if (/files and folders/.test(low)) id = 'files-and-folders';
    else id = Ops.normalizeId ? Ops.normalizeId(raw) : raw.toLowerCase();
    return { id: id, label: raw, kind: 'tool' };
  }

  function readChipValue(btn, prefixRe) {
    if (!btn) return '';
    var text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    var aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    var m = text.match(prefixRe) || aria.match(prefixRe);
    return m && m[1] ? m[1].trim() : '';
  }

  function readActiveModelId() {
    var btn = findModelButton();
    var name = readChipValue(btn, /^Model:\s*(.+)$/i);
    return Ops.normalizeId ? Ops.normalizeId(stripModelBadges(name)) : stripModelBadges(name).toLowerCase();
  }

  function readActiveModeId() {
    var btn = findModeSelectButton();
    if (!btn) return '';
    var t = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    if (/^ask$/i.test(t)) return 'ask';
    if (/agent/i.test(t)) return 'agent';
    return Ops.normalizeId ? Ops.normalizeId(t) : t.toLowerCase();
  }

  function readActiveToggleIds() {
    var btn = findOptimizeButton();
    if (!btn) return [];
    var val = readChipValue(btn, /^Optimized for:\s*(.+)$/i);
    if (!val) val = (btn.textContent || '').replace(/^Optimized for:\s*/i, '').trim();
    if (!val) return [];
    var id = Ops.normalizeId ? Ops.normalizeId(val) : val.toLowerCase();
    if (/balance/i.test(val)) id = 'balance';
    return id ? [id] : [];
  }

  function parseFileAccept(input) {
    if (!input) return [];
    var accept = String(input.getAttribute('accept') || '').trim();
    if (!accept) return [];
    return accept
      .split(',')
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean);
  }

  function findFileInput(form) {
    form = form || findComposerForm() || document;
    var scopes = [form, document];
    var portal = document.querySelector('#__primerPortalRoot__, [id*="primer-portal" i]');
    if (portal) scopes.push(portal);
    var i;
    var root;
    var found;
    for (i = 0; i < scopes.length; i++) {
      root = scopes[i];
      if (!root || !root.querySelector) continue;
      found =
        root.querySelector('#image-uploader') ||
        root.querySelector('input[type="file"][multiple]') ||
        root.querySelector('input[type="file"]');
      if (found) return found;
    }
    return null;
  }

  async function openMenuRoot(trigger) {
    if (!trigger) return null;
    try {
      var root = await Ops.openMenu(trigger, { timeoutMs: 10000, retries: 2 });
      if (!root && Ops.locateMenuRoot) {
        root = Ops.locateMenuRoot(trigger.ownerDocument, trigger);
      }
      return root;
    } catch (e) {
      if (Ops.locateMenuRoot) {
        var fallback = Ops.locateMenuRoot(trigger.ownerDocument, trigger);
        if (fallback) return fallback;
      }
      return null;
    }
  }

  async function peekMenuOptions(trigger, mapper) {
    if (!trigger) return [];
    var root = await openMenuRoot(trigger);
    if (!root) {
      Ops.closeMenu();
      return [];
    }
    var items = Ops.readMenuItems(root);
    Ops.closeMenu();
    await Ops.sleep(80);
    var out = [];
    var i;
    for (i = 0; i < items.length; i++) {
      var mapped = mapper(items[i]);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  async function listModelsFromDom(form) {
    var btn = findModelButton(form);
    if (!btn) return [];
    return peekMenuOptions(btn, modelItemToOption);
  }

  async function listModesFromDom(form) {
    var btn = findModeSelectButton(form);
    if (!btn) return [];
    return peekMenuOptions(btn, function (item) {
      return modeLabelToOption(item.label, item);
    });
  }

  async function listTogglesFromDom(form) {
    var btn = findOptimizeButton(form);
    if (!btn) return [];
    return peekMenuOptions(btn, toggleItemToOption);
  }

  async function listToolsFromDom(form) {
    var out = [];
    if (findReposToolButton(form)) {
      out.push({ id: 'repositories', label: 'Select repositories', kind: 'tool' });
    }
    var attach = findAttachmentButton(form);
    if (!attach) return out;
    var menuTools = await peekMenuOptions(attach, function (item) {
      var low = String(item.label || '').toLowerCase();
      if (/upload from computer/.test(low)) return null;
      if (/repositor|spaces|files and folders/.test(low)) return toolLabelToOption(item.label);
      return null;
    });
    var seen = {};
    var i;
    for (i = 0; i < out.length; i++) seen[out[i].id] = true;
    for (i = 0; i < menuTools.length; i++) {
      if (!seen[menuTools[i].id]) {
        seen[menuTools[i].id] = true;
        out.push(menuTools[i]);
      }
    }
    return out;
  }

  async function detectCapabilities() {
    var form = findComposerForm();
    if (!form) {
      await Ops.waitFor(findComposerForm, { timeoutMs: 12000, message: 'Copilot composer form timeout' });
      form = findComposerForm();
    }
    var models = await listModelsFromDom(form);
    var modes = await listModesFromDom(form);
    var toggles = await listTogglesFromDom(form);
    var tools = await listToolsFromDom(form);
    var fileInput = findFileInput(form);
    var attach = {
      supported: !!fileInput || !!findAttachmentButton(form),
      multiple: !!(fileInput && fileInput.hasAttribute('multiple')),
      accept: parseFileAccept(fileInput)
    };
    var agent = Ops.matchOption ? Ops.matchOption(modes, 'agent') : null;
    return {
      platform: 'copilot',
      projectsSupported: false,
      plan: agent && agent.locked ? 'free' : undefined,
      models: models,
      modes: modes,
      toggles: toggles,
      tools: tools,
      attach: attach,
      current: {
        model: readActiveModelId() || undefined,
        mode: readActiveModeId() || undefined,
        toggles: readActiveToggleIds()
      },
      detectedAt: new Date().toISOString()
    };
  }

  function idsMatch(a, b) {
    if (!a || !b) return false;
    var na = Ops.normalizeId ? Ops.normalizeId(a) : String(a).toLowerCase();
    var nb = Ops.normalizeId ? Ops.normalizeId(b) : String(b).toLowerCase();
    return na === nb;
  }

  async function applyModelChoice(wanted, form) {
    form = form || findComposerForm();
    var btn = findModelButton(form);
    if (!btn) {
      await Ops.waitFor(
        function () {
          return findModelButton(form || findComposerForm());
        },
        { timeoutMs: 12000, message: 'model menu missing' }
      );
      form = form || findComposerForm();
      btn = findModelButton(form);
    }
    if (!btn) rpcErr('OPTION_NOT_FOUND', 'model menu missing');
    var models = await listModelsFromDom(form);
    var opt = Ops.matchOption(models, wanted);
    if (opt && opt.locked) rpcErr('OPTION_LOCKED', 'model: ' + wanted);
    var wantId = opt ? opt.id : Ops.normalizeId(wanted) || String(wanted).trim();
    var wantLabel = opt ? opt.label : String(wanted);
    var activeNow = readActiveModelId();
    if (
      activeNow &&
      (idsMatch(activeNow, wantId) ||
        idsMatch(stripModelBadges(activeNow), wantId) ||
        idsMatch(activeNow, wantLabel))
    ) {
      return;
    }
    var root = await openMenuRoot(btn);
    if (!root) rpcErr('OPTION_NOT_FOUND', 'model menu did not open: ' + wanted);
    var picked = Ops.pickMenuItem(root, function (it) {
      var cleaned = stripModelBadges(it.label);
      return (
        idsMatch(cleaned, wantId) ||
        idsMatch(it.label, wantLabel) ||
        idsMatch(Ops.normalizeId(cleaned), wantId) ||
        (wantLabel && String(it.label || '').toLowerCase().indexOf(String(wantLabel).toLowerCase()) >= 0)
      );
    });
    Ops.closeMenu();
    if (!picked) rpcErr('OPTION_NOT_FOUND', 'model pick: ' + wanted);
    await Ops.sleep(200);
    var active = readActiveModelId();
    if (active && !idsMatch(active, wantId) && !idsMatch(stripModelBadges(active), wantId)) {
      await Ops.sleep(400);
    }
  }

  async function applyModeChoice(wanted, form) {
    var btn = findModeSelectButton(form);
    if (!btn) rpcErr('OPTION_NOT_FOUND', 'mode menu missing');
    var modes = await listModesFromDom(form);
    var opt = Ops.matchOption(modes, wanted);
    if (!opt) rpcErr('OPTION_NOT_FOUND', 'mode: ' + wanted);
    if (opt.locked) rpcErr('OPTION_LOCKED', 'mode: ' + wanted);
    var root = await openMenuRoot(btn);
    if (!root) rpcErr('OPTION_NOT_FOUND', 'mode menu did not open: ' + wanted);
    var picked = Ops.pickMenuItem(root, function (it) {
      return idsMatch(modeLabelToOption(it.label, it).id, opt.id);
    });
    if (!picked) picked = Ops.pickMenuItem(root, new RegExp('^' + opt.label + '$', 'i'));
    Ops.closeMenu();
    if (!picked) rpcErr('OPTION_NOT_FOUND', 'mode pick: ' + wanted);
    await Ops.sleep(150);
    if (!idsMatch(readActiveModeId(), opt.id)) rpcErr('HOST_ERROR', 'mode verify failed: ' + wanted);
  }

  async function applyToggleChoice(wanted, form) {
    var btn = findOptimizeButton(form);
    if (!btn) rpcErr('OPTION_NOT_FOUND', 'optimize menu missing');
    var toggles = await listTogglesFromDom(form);
    var opt = Ops.matchOption(toggles, wanted);
    var wantId = opt ? opt.id : Ops.normalizeId(wanted) || String(wanted).trim();
    var wantLabel = opt ? opt.label : String(wanted);
    if (opt && opt.locked) rpcErr('OPTION_LOCKED', 'toggle: ' + wanted);
    var root = await openMenuRoot(btn);
    if (!root) rpcErr('OPTION_NOT_FOUND', 'optimize menu did not open: ' + wanted);
    var picked = Ops.pickMenuItem(root, function (it) {
      var mapped = toggleItemToOption(it);
      return (
        idsMatch(mapped.id, wantId) ||
        idsMatch(mapped.label, wantLabel) ||
        (wantLabel && String(it.label || '').toLowerCase().indexOf(String(wantLabel).toLowerCase()) >= 0)
      );
    });
    if (!picked) picked = Ops.pickMenuItem(root, new RegExp(wantLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    Ops.closeMenu();
    if (!picked) rpcErr('OPTION_NOT_FOUND', 'toggle pick: ' + wanted);
    await Ops.sleep(200);
  }

  async function applyWireFiles(files, form) {
    var list = Array.isArray(files) ? files : [];
    if (!list.length) return;
    form = form || findComposerForm();
    var input = findFileInput(form);
    if (!input) {
      var attachBtn = findAttachmentButton(form);
      if (!attachBtn) rpcErr('ATTACH_UNSUPPORTED', 'attachment menu missing');
      var root = await openMenuRoot(attachBtn);
      if (!root) rpcErr('ATTACH_UNSUPPORTED', 'attachment menu did not open');
      var upload = Ops.pickMenuItem(root, /upload from computer|загруз/i);
      if (!upload) {
        Ops.closeMenu();
        rpcErr('ATTACH_UNSUPPORTED', 'upload from computer missing');
      }
      await Ops.sleep(250);
      input = findFileInput(form) || findFileInput(document);
      Ops.closeMenu();
    }
    if (!input) {
      input = document.querySelector('#image-uploader') || document.querySelector('input[type="file"]');
    }
    if (!input) rpcErr('ATTACH_UNSUPPORTED', 'file input not found');
    try {
      Ops.setFileInputFiles(input, list);
    } catch (setErr) {
      if (setErr && setErr.code) throw setErr;
      rpcErr('ATTACH_UNSUPPORTED', (setErr && setErr.message) || 'set files failed');
    }
    if (input.files && input.files.length >= list.length) {
      await Ops.sleep(500);
      return;
    }
    // Primer sometimes exposes a second hidden input after Upload click.
    var alt =
      document.querySelector('#image-uploader') ||
      document.querySelector('input[type="file"][multiple]') ||
      document.querySelector('input[type="file"]');
    if (alt && alt !== input) {
      try {
        Ops.setFileInputFiles(alt, list);
        input = alt;
      } catch (e2) {}
    }
    if (input.files && input.files.length >= list.length) {
      await Ops.sleep(500);
      return;
    }
    try {
      var names = list
        .map(function (f) {
          return f && f.name ? String(f.name) : '';
        })
        .filter(Boolean);
      // Attachment chips render outside <form> on github.com/copilot; scope to document.
      await Ops.waitAttachChips(document, list.length, {
        timeoutMs: 20000,
        allowSpinner: true,
        fileInput: input,
        names: names
      });
    } catch (e) {
      if (input.files && input.files.length >= list.length) return;
      // Soft-pass: files were accepted by the input even if chips never rendered.
      if (input.files && input.files.length > 0) return;
      var bodyText = String((document.body && document.body.textContent) || '').toLowerCase();
      var named =
        names &&
        names.length &&
        names.every(function (n) {
          return bodyText.indexOf(String(n).toLowerCase()) >= 0;
        });
      if (named) return;
      if (e && /ATTACH_TIMEOUT/i.test(String(e.message || e))) {
        rpcErr('ATTACH_TIMEOUT', 'attachment chips timeout');
      }
      if (e && e.code) throw e;
      hostErr(e);
    }
  }

  function appliedSnapshot(args) {
    args = args || {};
    var out = {};
    if (args.model != null && String(args.model).trim()) {
      out.model = Ops.normalizeId(args.model) || String(args.model).trim();
    }
    if (args.mode != null && String(args.mode).trim()) {
      out.mode = Ops.normalizeId(args.mode) || String(args.mode).trim();
    }
    if (Array.isArray(args.toggles) && args.toggles.length) {
      out.toggles = args.toggles.map(function (t) {
        return Ops.normalizeId(t) || String(t);
      });
    }
    if (Array.isArray(args.files) && args.files.length) {
      out.files = args.files
        .map(function (f) {
          return f && f.name ? String(f.name) : '';
        })
        .filter(Boolean);
    }
    return out;
  }

  async function applyOptions(args) {
    args = args || {};
    var form = findComposerForm();
    if (!form) {
      await Ops.waitFor(findComposerForm, { timeoutMs: 15000, message: 'Copilot composer form timeout' });
      form = findComposerForm();
    }
    if (!form) rpcErr('HOST_ERROR', 'composer form not found');
    invalidateCapabilitiesCache();
    if (args.model != null && String(args.model).trim() !== '') {
      await applyModelChoice(args.model, form);
    }
    if (args.mode != null && String(args.mode).trim() !== '') {
      await applyModeChoice(args.mode, form);
    }
    if (args.toggles && args.toggles.length) {
      for (var i = 0; i < args.toggles.length; i++) {
        await applyToggleChoice(args.toggles[i], form);
      }
    }
    if (args.tools && args.tools.length) {
      for (var t = 0; t < args.tools.length; t++) {
        rpcErr('OPTION_NOT_FOUND', 'copilot tool not selectable: ' + args.tools[t]);
      }
    }
    if (args.files && args.files.length) {
      await applyWireFiles(args.files, form);
    }
    return appliedSnapshot(args);
  }

  function countChatTurns() {
    var list = document.querySelectorAll('.message-container[class*="chatMessage"]');
    return outermost(list).length;
  }

  function isPlaceholderAssistantText(text) {
    var t = String(text || '').trim();
    if (!t) return true;
    return /^(thinking|размышление)[.…]{0,3}$/i.test(t);
  }

  async function waitForAssistantReply(beforeCount) {
    await Ops.waitFor(
      function () {
        var turns = outermost(document.querySelectorAll('.message-container[class*="chatMessage"]'));
        if (turns.length <= beforeCount) return null;
        if (Ops.findStopControl(findComposerForm() || document)) return null;
        var last = turns[turns.length - 1];
        if (roleOf(last) !== 'assistant') return null;
        var text = ((assistantBody(last) && assistantBody(last).innerText) || '').trim();
        if (isPlaceholderAssistantText(text)) return null;
        return turns.length;
      },
      { timeoutMs: 120000, message: 'Copilot assistant reply timeout' }
    );
  }

  function roleOf(turn) {
    var c = classOf(turn);
    if (/ai__/i.test(c)) return 'assistant';
    if (/user__/i.test(c)) return 'user';
    if (turn.querySelector('[class*="userMessage"]')) return 'user';
    if (turn.querySelector('[data-copilot-markdown="true"]')) return 'assistant';
    return '';
  }

  function userBody(turn) {
    return turn.querySelector('[class*="userMessage"]') || turn;
  }

  function assistantBody(turn) {
    return (
      turn.querySelector('[data-copilot-markdown="true"]') ||
      turn.querySelector('.markdown-body') ||
      turn
    );
  }

  function dropChatHost(items) {
    if (!items || !items.length) return items || [];
    return items.filter(function (it) {
      var url = (it && it.url) || '';
      return url && !/github\.com\/(?:copilot|login|settings)/i.test(url);
    });
  }

  CE.definePlatform({
    id: 'copilot',
    modifier: 'copilot',
    active: function () {
      return textareaVisible(findChatTextarea());
    },
    composer: function () {
      var ta = findChatTextarea();
      if (!textareaVisible(ta)) return null;
      var form = ta.closest('form');
      if (!form) return null;
      var attach = form.querySelector('button[data-testid="attachment-menu-button"]');
      var ask = findAskButton(form);
      var toolbar =
        form.querySelector('[class*="toolbar"]') ||
        (attach && attach.parentElement) ||
        (ask && ask.parentElement) ||
        form;
      var extra = toolbar.querySelector('[class*="extra"]');
      // Square Primer icon chips live in extra (repos / attach); our chips join the
      // same flex row and copy the attach chip class (32x32). Layout in styles.css.
      if (extra) {
        var iconChip = attach || extra.querySelector('button[class*="IconButton"]') || ask;
        var afterChip =
          wrapChildOf(extra, iconChip) ||
          (function () {
            var btns = extra.querySelectorAll('button');
            return btns.length ? wrapChildOf(extra, btns[btns.length - 1]) : null;
          })();
        return {
          el: extra,
          insertAfter: afterChip,
          beforeChild: null,
          nativeFrom: iconChip,
          nativeIconFrom: iconChip
        };
      }
      var actions = toolbar.querySelector('[class*="actions"]');
      return {
        el: toolbar,
        insertAfter: wrapChildOf(toolbar, ask),
        beforeChild: wrapChildOf(toolbar, actions),
        nativeFrom: ask || attach,
        nativeIconFrom: attach || ask
      };
    },
    chatId: currentChatId,
    title: function () {
      var t = document.title || '';
      t = t
        .replace(/\s*[|\u00b7\u2013\u2014-]\s*GitHub\s+Copilot\s*$/i, '')
        .replace(/\s*GitHub\s+Copilot\s*$/i, '')
        .trim();
      if (t && !/^new conversation$/i.test(t)) return t;
      var active =
        document.querySelector('a[aria-current="page"][href*="/copilot/c/"]') ||
        document.querySelector('[aria-current="page"]');
      if (active && active.textContent.trim()) return active.textContent.trim();
      return t || 'chat';
    },
    model: function () {
      var ta = findChatTextarea();
      var form = ta && ta.closest('form');
      var root = form || document;
      var btns = root.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var text = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
        var m = text.match(/^Model:\s*(.+)$/i);
        if (m && m[1].trim()) return m[1].trim().slice(0, 48);
      }
      return '';
    },
    user: function () {
      var out = { userName: '', userHandle: '', userEmail: '' };
      var meta = document.querySelector('meta[name="user-login"]');
      if (meta && meta.content) out.userHandle = meta.content.trim();
      var img =
        document.querySelector('img.avatar[alt]') ||
        document.querySelector('header img.avatar') ||
        document.querySelector('[data-testid="user-avatar"] img[alt]');
      if (img) {
        var alt = (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
        if (alt && !/^avatar/i.test(alt)) out.userName = alt;
      }
      if (!out.userName && out.userHandle) out.userName = out.userHandle;
      return out;
    },
    scroller: function () {
      var sample =
        document.querySelector('.message-container[class*="chatMessage"]') ||
        document.querySelector('[data-copilot-markdown="true"]') ||
        document.querySelector('[class*="userMessage"]');
      var scroller = CE.findOverflowScroller(sample);
      if (scroller && scroller.clientHeight > 100) return scroller;
      var layout = document.querySelector('[data-testid="chat-layout"]');
      if (layout) {
        var nested = CE.findOverflowScroller(layout.querySelector('[class*="container"]') || layout);
        if (nested) return nested;
      }
      return scroller || null;
    },
    turns: function (root) {
      root = root || document;
      var list = root.querySelectorAll('.message-container[class*="chatMessage"]');
      if (list.length) return outermost(list);
      return [];
    },
    turnKey: function (el, i) {
      if (!el) return 'n' + i;
      return (
        el.id ||
        el.getAttribute('data-message-id') ||
        el.getAttribute('data-testid') ||
        (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96) ||
        'n' + i
      );
    },
    capture: function (turn, assistantTag) {
      try {
        var role = roleOf(turn);
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
        return {
          role: 'assistant',
          roleTag: assistantTag,
          text: at,
          links: dropChatHost(CE.collectLinks(ab)),
          sources: []
        };
      } catch (err) {
        console.error('[chat-export]', err);
        return null;
      }
    },
    ops: {
      list: async function (args) {
        try {
          var limit = Ops.clampLimit ? Ops.clampLimit(args && args.limit) : 20;
          try {
            var res = await apiFetch('/github/chat/threads?', { tryNextHostOn404: true });
            if (res.status === 401 || res.status === 403) {
              rpcErr('UNAUTHORIZED', 'Copilot list ' + res.status);
            }
            if (!res.ok) {
              var body = await res.text();
              rpcErr('HOST_ERROR', 'list ' + res.status + ' ' + body.slice(0, 160));
            }
            var data = await res.json();
            var raw = (data && data.threads) || [];
            var items = [];
            for (var i = 0; i < raw.length && items.length < limit; i++) {
              if (!raw[i] || !raw[i].id) continue;
              var chat = toChat(raw[i]);
              if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
              items.push(chat);
            }
            return { items: items, nextCursor: null };
          } catch (apiErr) {
            if (apiErr && apiErr.code && apiErr.code !== 'HOST_ERROR') throw apiErr;
            var domItems = listFromDom(args && args.query).slice(0, limit);
            return { items: domItems, nextCursor: null };
          }
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
              return Object.assign({ platform: 'copilot', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
            var same = await ctx.getData();
            return Object.assign({ platform: 'copilot', url: location.href }, same || {}, {
              chatId: chatId
            });
          }
          try {
            var res = await apiFetch(
              '/github/chat/threads/' + encodeURIComponent(chatId) + '/messages',
              { tryNextHostOn404: true }
            );
            if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
            if (res.status === 401 || res.status === 403) {
              rpcErr('UNAUTHORIZED', 'Copilot get ' + res.status);
            }
            if (!res.ok) {
              var t = await res.text();
              rpcErr('HOST_ERROR', 'messages ' + res.status + ' ' + t.slice(0, 160));
            }
            var data = await res.json();
            var thread = (data && data.thread) || {};
            var userMeta = document.querySelector('meta[name="user-login"]');
            return {
              platform: 'copilot',
              url: chatUrl(chatId),
              title: thread.name || '',
              chatId: chatId,
              model: thread.autoPickedModel || '',
              userName: (userMeta && userMeta.content) || '',
              userHandle: (userMeta && userMeta.content) || '',
              userEmail: '',
              messages: mapApiMessages((data && data.messages) || [])
            };
          } catch (apiErr) {
            if (apiErr && apiErr.code === 'NOT_FOUND') throw apiErr;
            if (apiErr && apiErr.code === 'UNAUTHORIZED') throw apiErr;
            if (Ops.softNavigate) Ops.softNavigate('/copilot/c/' + chatId);
            else {
              history.pushState({}, '', '/copilot/c/' + chatId);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            await Ops.waitFor(
              function () {
                return currentChatId() === chatId && findChatTextarea();
              },
              { timeoutMs: 20000, message: 'Copilot navigate timeout' }
            );
            if (ctx && typeof ctx.getData === 'function') {
              var fallback = await ctx.getData();
              return Object.assign({ platform: 'copilot', url: location.href }, fallback || {}, {
                chatId: chatId
              });
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
          if (!refresh && capsCache.data && capsCache.key === key) {
            return capsCache.data;
          }
          var data = await detectCapabilities();
          capsCache = { key: key, data: data };
          return data;
        } catch (err) {
          hostErr(err);
        }
      },
      containers: async function () {
        return { items: [], nextCursor: null };
      },
      containerChats: async function () {
        rejectProjects();
      },
      containerCreate: async function () {
        rejectProjects();
      },
      containerDelete: async function () {
        rejectProjects();
      },
      containerMoveChat: async function () {
        rejectProjects();
      },
      hostState: function () {
        var ta = findChatTextarea();
        return {
          generating: !!Ops.findStopControl(findComposerForm() || document),
          composerReady: textareaVisible(ta) && Ops.composerReady(ta)
        };
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var text = String((args && args.text) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          if (currentChatId() !== chatId) {
            if (Ops.softNavigate) Ops.softNavigate('/copilot/c/' + chatId);
            else {
              history.pushState({}, '', '/copilot/c/' + chatId);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            await Ops.waitFor(
              function () {
                return currentChatId() === chatId && textareaVisible(findChatTextarea());
              },
              { timeoutMs: 25000, message: 'Copilot navigate timeout' }
            );
          }
          var beforeTurns = countChatTurns();
          var applied = await applyOptions(args);
          var input = await Ops.waitFor(
            function () {
              var ta = findChatTextarea();
              return ta && textareaVisible(ta) ? ta : null;
            },
            { timeoutMs: 15000, message: 'Copilot composer timeout' }
          );
          Ops.fillEditable(input, text);
          await Ops.sleep(200);
          await submitComposer(input);
          await waitForAssistantReply(beforeTurns);
          var sendResult = {
            platform: 'copilot',
            chatId: chatId,
            title: '',
            url: chatUrl(chatId),
            updatedAt: new Date().toISOString()
          };
          if (applied && Object.keys(applied).length) sendResult.applied = applied;
          return sendResult;
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
          await CE.platforms.copilot.ops.send({ chatId: chatId, text: text });
          var got = null;
          var deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            var cur = await CE.platforms.copilot.ops.get({ chatId: chatId }, ctx);
            var msgs = (cur && cur.messages) || [];
            var last = null;
            var j;
            for (j = msgs.length - 1; j >= 0; j--) {
              if (msgs[j] && msgs[j].role === 'assistant' && msgs[j].text) {
                last = msgs[j];
                break;
              }
            }
            if (last && !isPlaceholderAssistantText(last.text)) {
              got = cur;
              break;
            }
            await Ops.sleep(400);
          }
          if (!got) rpcErr('TIMEOUT', 'Copilot ask_selection reply timeout');
          var messages = (got && got.messages) || [];
          var reply = null;
          var after = null;
          var i;
          for (i = messages.length - 1; i >= 0; i--) {
            if (
              messages[i] &&
              messages[i].role === 'assistant' &&
              messages[i].text &&
              !isPlaceholderAssistantText(messages[i].text)
            ) {
              reply = messages[i];
              after = i;
              break;
            }
          }
          return {
            status: 'done',
            platform: 'copilot',
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
          // Stay under the default 60s server/MCP RPC timeout so callers get a real error, not a hang.
          var deadline = Date.now() + CREATE_BUDGET_MS;
          await ensureNewChat(15000);
          var applied = await applyOptions(args);
          var input = await Ops.waitFor(
            function () {
              var ta = findChatTextarea();
              return ta && textareaVisible(ta) ? ta : null;
            },
            { timeoutMs: 10000, message: 'Copilot composer timeout' }
          );
          var known = await snapshotThreadIds();
          Ops.fillEditable(input, text);
          await Ops.sleep(200);
          if (!String(input.value || '').trim()) rpcErr('HOST_ERROR', 'Copilot composer did not accept text');
          await submitComposer(input);
          var hasFiles = !!(args && args.files && args.files.length);
          var chatId = await waitForNewChatId(
            known,
            hasFiles ? Math.max(deadline, Date.now() + 15000) : Math.max(deadline, Date.now() + 8000)
          );
          var result = {
            platform: 'copilot',
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
          var res = await apiFetch('/github/chat/threads/' + encodeURIComponent(chatId), {
            method: 'DELETE',
            tryNextHostOn404: false
          });
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 401 || res.status === 403) {
            rpcErr('UNAUTHORIZED', 'Copilot delete ' + res.status);
          }
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
