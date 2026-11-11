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
