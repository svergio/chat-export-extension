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
