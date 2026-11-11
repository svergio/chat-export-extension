const OP_HOOKS = [
  'list',
  'get',
  'create',
  'delete',
  'capabilities',
  'send',
  'containers',
  'containerChats',
  'containerCreate',
  'containerDelete',
  'containerMoveChat',
  'askSelection',
  'sideAsk',
  'hostState'
];
const SUBMIT_HOOKS = ['create', 'send', 'askSelection', 'sideAsk'];

function removeBar(CE, id) {
  const existing = document.querySelector('[' + CE.BAR_ATTR + '="' + id + '"]');
  if (!existing) return;
  const host = existing.parentElement;
  existing.remove();
  if (host && host.getAttribute('data-ce-host') === id) host.remove();
}

export function definePlatform(spec) {
  const CE = window.ChatExport;
  if (!CE || !spec || !spec.id) return;

  const id = spec.id;
  const modifier = spec.modifier || id;
  const fenceFallback = spec.fenceTag || id;

  function messagesFromHydrate(res, modelName, scroller) {
    const assistantTag = CE.modelFenceTag(modelName, fenceFallback);
    const root = (res && res.scroller) || scroller || document;
    const turns = typeof spec.turns === 'function' ? spec.turns(root) : [];
    const live = [];
    for (let i = 0; i < turns.length; i++) {
      const msg = spec.capture(turns[i], assistantTag);
      if (msg) live.push(msg);
    }
    if (!res || !res.items) return live;
    const captured = [];
    const order = res.order || [];
    for (let i = 0; i < order.length; i++) {
      const row = res.items[order[i]];
      if (row && row.payload && row.payload.role) captured.push(row.payload);
    }
    return captured.length > live.length ? captured : live;
  }

  function currentChatId() {
    return (typeof spec.chatId === 'function' && spec.chatId()) || '';
  }

  function getDataFromDom() {
    const user = (typeof spec.user === 'function' && spec.user()) || {};
    const model = (typeof spec.model === 'function' && spec.model()) || '';
    const scroller = (typeof spec.scroller === 'function' && spec.scroller()) || null;
    const assistantTag = CE.modelFenceTag(model, fenceFallback);
    const keyOf =
      typeof spec.turnKey === 'function'
        ? spec.turnKey
        : function (el, i) {
            return (
              (el &&
                (el.id ||
                  el.getAttribute('data-message-id') ||
                  el.getAttribute('data-testid') ||
                  (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96))) ||
              'n' + i
            );
          };
    var hydrateOpts = {
      scroller: scroller,
      fromEl: scroller,
      nodes: function () {
        return typeof spec.turns === 'function' ? spec.turns(scroller) : [];
      },
      keyOf: keyOf,
      capture: function (el) {
        return spec.capture(el, assistantTag);
      }
    };
    if (spec.maxSteps) hydrateOpts.maxSteps = spec.maxSteps;
    return CE.hydrateTranscript(hydrateOpts).then(function (res) {
      return {
        title: (typeof spec.title === 'function' && spec.title()) || 'chat',
        chatId: currentChatId(),
        model: model,
        userName: user.userName || '',
        userHandle: user.userHandle || '',
        userEmail: user.userEmail || '',
        messages: messagesFromHydrate(res, model, (res && res.scroller) || scroller)
      };
    });
  }

  function getData() {
    if (typeof spec.exportData === 'function') {
      return Promise.resolve()
        .then(function () {
          return spec.exportData();
        })
        .then(function (fromApi) {
          const apiOnly = spec.exportDomFallback === false;
          if (fromApi && Array.isArray(fromApi.messages) && (fromApi.messages.length || apiOnly)) {
            const user = (typeof spec.user === 'function' && spec.user()) || {};
            return Object.assign(
              {
                title: (typeof spec.title === 'function' && spec.title()) || 'chat',
                chatId: currentChatId(),
                model: (typeof spec.model === 'function' && spec.model()) || '',
                userName: user.userName || '',
                userHandle: user.userHandle || '',
                userEmail: user.userEmail || ''
              },
              fromApi
            );
          }
          return getDataFromDom();
        })
        .catch(function (err) {
          if (spec.exportDomFallback === false) throw err;
          return getDataFromDom();
        });
    }
    return getDataFromDom();
  }

  const ops = {};
  const specOps = spec.ops || {};
  for (const name of OP_HOOKS) {
    if (typeof specOps[name] === 'function') ops[name] = specOps[name];
  }

  // Hosts often render overload/limit errors as a short assistant turn instead of a toast.
  function lastAssistantTurn() {
    if (typeof spec.turns !== 'function' || typeof spec.capture !== 'function') return null;
    try {
      const turns = spec.turns(document) || [];
      for (let i = turns.length - 1; i >= 0; i--) {
        const msg = spec.capture(turns[i], fenceFallback);
        if (!msg) continue;
        return msg.role === 'assistant' ? turns[i] : null;
      }
    } catch (e) {}
    return null;
  }

  const Ops = CE.Ops || {};
  if (typeof Ops.guardBusy === 'function') {
    for (const name of SUBMIT_HOOKS) {
      const run = ops[name];
      if (!run) continue;
      ops[name] = function (args, ctx) {
        return Ops.guardBusy(function () {
          return run(args, ctx);
        }, lastAssistantTurn);
      };
    }
  }
  if (ops.hostState && typeof Ops.buildHostState === 'function') {
    const probe = ops.hostState;
    ops.hostState = async function (args, ctx) {
      const state = (await probe(args, ctx)) || {};
      const wanted = args && args.chatId ? String(args.chatId) : '';
      if (wanted && wanted !== currentChatId()) state.generating = false;
      return Ops.buildHostState(id, state, lastAssistantTurn());
    };
  }
  CE.platforms[id] = { id: id, getData: getData, chatId: currentChatId, ops: ops };

  function mount() {
    if (typeof CE.isPlatformEnabled === 'function' && !CE.isPlatformEnabled(id)) {
      removeBar(CE, id);
      return;
    }
    if (typeof spec.active === 'function' && !spec.active()) return;
    const found = typeof spec.composer === 'function' ? spec.composer() : null;
    if (!found || !found.el) return;

    const existing = document.querySelector('[' + CE.BAR_ATTR + '="' + id + '"]');
    const sameVer = existing && existing.getAttribute('data-chat-export-v') === CE.EXT_VERSION;
    const existingOk =
      existing &&
      existing.isConnected &&
      sameVer &&
      found.el.contains(existing) &&
      existing.getBoundingClientRect().width > 0;
    if (existingOk) return;
    if (existing) removeBar(CE, id);

    const nativeFrom = found.nativeFrom || null;
    const nativeIconFrom = found.nativeIconFrom || null;

    CE.injectBar(found.el, {
      platform: id,
      modifier: modifier,
      insertAfter: found.insertAfter || null,
      beforeChild: found.beforeChild || null,
      placement: found.placement,
      nativeFrom: nativeFrom,
      nativeClass: found.nativeClass || (nativeFrom ? String(nativeFrom.className || '').trim() : ''),
      nativeIconFrom: nativeIconFrom,
      nativeIconClass:
        found.nativeIconClass ||
        (nativeIconFrom ? String(nativeIconFrom.className || '').trim() : ''),
      downloadSvg: found.downloadSvg || spec.downloadSvg,
      getData: getData
    });
  }

  CE.observe(mount);
  if (typeof CE.onPlatformSettings === 'function') {
    CE.onPlatformSettings(function () {
      mount();
    });
  }
  return mount;
}
