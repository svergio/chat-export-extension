const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 20;
const TEST_PREFIX = '[ce-test]';

export function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

export function clampLimit(n) {
  var v = Number(n);
  if (!Number.isFinite(v) || v < 1) return LIST_LIMIT_DEFAULT;
  return Math.min(LIST_LIMIT_MAX, Math.floor(v));
}

export function matchQuery(title, query) {
  var q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(title || '')
    .toLowerCase()
    .indexOf(q) >= 0;
}

export function toIso(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    var ms = value < 1e12 ? value * 1000 : value;
    var d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  var s = String(value).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return toIso(Number(s));
  var d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2.toISOString();
}

export function testTitle(title) {
  var t = String(title || '').trim();
  if (!t) return TEST_PREFIX + ' chat';
  if (t.indexOf(TEST_PREFIX) === 0) return t;
  return TEST_PREFIX + ' ' + t;
}

export function quoteSelectionPrompt(selection, prompt) {
  var sel = String(selection || '').trim();
  var q = String(prompt || '').trim();
  if (!sel) return q;
  var quoted = sel
    .split(/\r?\n/)
    .map(function (line) {
      return '> ' + line;
    })
    .join('\n');
  if (!q) return quoted;
  return quoted + '\n\n' + q;
}

export function waitFor(check, opts) {
  opts = opts || {};
  var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 30000;
  var intervalMs = opts.intervalMs != null ? opts.intervalMs : 200;
  var started = Date.now();
  return new Promise(function (resolve, reject) {
    function tick() {
      var v;
      try {
        v = check();
      } catch (err) {
        reject(err);
        return;
      }
      if (v) {
        resolve(v);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(opts.message || 'timeout'));
        return;
      }
      setTimeout(tick, intervalMs);
    }
    tick();
  });
}

export function setNativeValue(el, value) {
  if (!el) return;
  var view = el.ownerDocument.defaultView || window;
  var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  var desc = Object.getOwnPropertyDescriptor(proto, 'value');
  try {
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  } catch (e) {
    try {
      el.value = value;
    } catch (e2) {}
  }
  try {
    el.dispatchEvent(new view.Event('input', { bubbles: true }));
    el.dispatchEvent(new view.Event('change', { bubbles: true }));
  } catch (e3) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function fillEditable(el, text) {
  if (!el) throw new Error('composer not found');
  var value = String(text == null ? '' : text);
  var view = el.ownerDocument.defaultView || window;
  try {
    el.focus();
  } catch (e) {}
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    // Avoid document.execCommand from the isolated world (Illegal invocation on some hosts).
    el.textContent = value;
    try {
      el.dispatchEvent(
        new view.InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: value,
          inputType: 'insertText'
        })
      );
    } catch (e2) {
      el.dispatchEvent(new view.Event('input', { bubbles: true }));
    }
    return;
  }
  setNativeValue(el, value);
}

function selectEditableContents(el) {
  try {
    var view = el.ownerDocument.defaultView || window;
    var sel = view.getSelection();
    var range = el.ownerDocument.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  } catch (e) {
    return false;
  }
}

function editableHasText(el, value) {
  var cur = String((el && (el.innerText || el.textContent)) || '').replace(/\u00a0/g, ' ').trim();
  var want = String(value || '').replace(/\u00a0/g, ' ').trim();
  if (!want) return !!cur;
  // Exact match only — loose prefix match caused stacked paste+insertText (duplicate bubbles).
  return cur === want;
}

export function fillRichComposer(el, text) {
  if (!el) throw new Error('composer not found');
  var value = String(text == null ? '' : text);
  var view = el.ownerDocument.defaultView || window;
  try {
    el.focus();
  } catch (e) {}
  selectEditableContents(el);

  // TipTap / ProseMirror: try one path at a time; stop when composer holds exact text.
  try {
    var dt = new view.DataTransfer();
    dt.setData('text/plain', value);
    var pasteEv;
    try {
      pasteEv = new view.ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
    } catch (ePaste) {
      pasteEv = new view.Event('paste', { bubbles: true, cancelable: true });
      try {
        Object.defineProperty(pasteEv, 'clipboardData', { value: dt });
      } catch (eProp) {}
    }
    el.dispatchEvent(pasteEv);
  } catch (e2) {}
  if (editableHasText(el, value)) return 'paste';

  try {
    selectEditableContents(el);
    if (el.ownerDocument.execCommand('insertText', false, value) && editableHasText(el, value)) {
      return 'execCommand';
    }
  } catch (e4) {}

  fillEditable(el, value);
  return editableHasText(el, value) ? 'textContent' : 'failed';
}

export function clickEl(el) {
  if (!el) throw new Error('click target missing');
  var view = el.ownerDocument.defaultView || window;
  var ME = view.MouseEvent || MouseEvent;
  var PE = view.PointerEvent || null;
  if (typeof el.scrollIntoView === 'function') {
    try {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch (e) {}
  }
  var rect = el.getBoundingClientRect();
  var x = rect.left + Math.max(1, Math.min(rect.width / 2, 12));
  var y = rect.top + Math.max(1, Math.min(rect.height / 2, 12));
  var down = {
    bubbles: true,
    cancelable: true,
    view: view,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    button: 0,
    buttons: 1,
    detail: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true
  };
  var up = Object.assign({}, down, { buttons: 0 });
  // Correct pointer/mouse order: down → up → click. click-before-up breaks React send handlers.
  if (PE) el.dispatchEvent(new PE('pointerdown', down));
  el.dispatchEvent(new ME('mousedown', down));
  if (PE) el.dispatchEvent(new PE('pointerup', up));
  el.dispatchEvent(new ME('mouseup', up));
  el.dispatchEvent(new ME('click', up));
}

export function dispatchEnter(el) {
  if (!el) return;
  var view = el.ownerDocument.defaultView || window;
  try {
    el.focus();
  } catch (e) {}
  var init = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    view: view
  };
  try {
    el.dispatchEvent(new view.KeyboardEvent('keydown', init));
    el.dispatchEvent(new view.KeyboardEvent('keypress', init));
    el.dispatchEvent(new view.KeyboardEvent('keyup', init));
  } catch (e2) {
    el.dispatchEvent(new KeyboardEvent('keydown', init));
    el.dispatchEvent(new KeyboardEvent('keyup', init));
  }
}

function composerHasDraft(input) {
  if (!input) return false;
  var tag = String(input.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'INPUT') {
    return !!String(input.value || '').trim();
  }
  return !!String((input.innerText || input.textContent) || '').trim();
}

export async function ensureComposerSubmitted(opts) {
  opts = opts || {};
  var send = opts.send;
  var input = opts.input;
  var isDone = opts.isDone;
  if (typeof isDone !== 'function') throw new Error('isDone required');
  var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 5000;
  if (send) clickEl(send);
  try {
    await waitFor(isDone, { timeoutMs: 2000, intervalMs: 100, message: 'click submit pending' });
    return 'click';
  } catch (e1) {}
  try {
    if (isDone()) return 'click-late';
  } catch (eLate) {}
  // First click already started submit — do not Enter + re-click (duplicate user bubbles).
  if (send && (send.disabled || send.getAttribute('aria-disabled') === 'true')) {
    await waitFor(isDone, {
      timeoutMs: timeoutMs,
      intervalMs: 150,
      message: opts.message || 'composer submit failed'
    });
    return 'click-disabled';
  }
  var emptied = false;
  try {
    emptied = !!(input && !composerHasDraft(input));
  } catch (eEmpty) {}
  if (emptied) {
    await waitFor(isDone, {
      timeoutMs: timeoutMs,
      intervalMs: 150,
      message: opts.message || 'composer submit failed'
    });
    return 'cleared';
  }
  if (input) dispatchEnter(input);
  if (send && !(send.disabled || send.getAttribute('aria-disabled') === 'true')) {
    clickEl(send);
  }
  await waitFor(isDone, {
    timeoutMs: timeoutMs,
    intervalMs: 150,
    message: opts.message || 'composer submit failed'
  });
  return 'retry';
}

export function softNavigate(path) {
  var url = path;
  if (path.indexOf('http') !== 0) {
    url = location.origin + (path.charAt(0) === '/' ? path : '/' + path);
  }
  if (location.href === url) return;
  history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const OPS_CONST = Object.freeze({
  LIST_LIMIT_MAX: LIST_LIMIT_MAX,
  LIST_LIMIT_DEFAULT: LIST_LIMIT_DEFAULT,
  TEST_PREFIX: TEST_PREFIX
});

export function hostErr(code, message, details) {
  var CE = typeof window !== 'undefined' && window.ChatExport;
  if (CE && typeof CE.RpcError === 'function') {
    throw new CE.RpcError(code, message, details);
  }
  var err = new Error(message);
  err.code = code;
  if (details) err.details = details;
  throw err;
}

var RATE_LIMIT_RE =
  /rate.?limit|too many (requests|messages)|usage limit|message limit|daily limit|limit reached|reached (your|the) (\w+ )?(limit|cap)|quota|free (plan|preview|tier)|upgrade to (pro|plus|max)|try a more powerful model|more powerful model|перейти на (pro|плюс|макс)|бесплатн\S* (предпросмотр|план|тариф)|слишком много (запросов|сообщений)|лимит (запросов|сообщений)|достигнут\S* (\S+ )?лимит|превышен\S* (\S+ )?лимит/i;
var PAYWALL_RE =
  /free (plan|preview|tier)|upgrade to (pro|plus|max)|try a more powerful model|more powerful model|перейти на (pro|плюс|макс)|бесплатн\S* (предпросмотр|план|тариф)/i;
var AUTH_WALL_RE =
  /sign up and (repeat|continue|sign in)|sign in to continue|log in to continue|please (sign|log) in|зарегистрируйтесь|войдите,? чтобы|войти,? чтобы продолж/i;
var PLATFORM_BUSY_RE =
  /heavy (load|usage|traffic)|high demand|(at|over) capacity|overloaded|temporarily unavailable|service unavailable|something went wrong|try again (later|in|shortly|soon)|перегруж|высок\S* нагрузк|временно недоступ|попробуйте (\S+ )?(позже|снова|ещ[её] раз)|что-то пошло не так/i;
var BANNER_SELECTOR = [
  '[role="alert"]',
  '[role="alertdialog"]',
  '[role="status"]',
  '[aria-live="assertive"]',
  '[aria-live="polite"]',
  '[data-sonner-toast]',
  '[data-testid*="toast" i]',
  '[data-testid*="error" i]',
  '[data-testid*="banner" i]',
  '[data-testid*="upsell" i]',
  '[data-testid*="upgrade" i]',
  '[class*="toast" i]',
  '[class*="banner" i]',
  '[class*="error" i]'
].join(',');
var UPSELL_SCAN_SELECTOR = 'main button, main [role="button"], main [role="status"], main [role="alert"], main a[href*="upgrade" i], main a[href*="pricing" i]';
var BANNER_TEXT_MAX = 400;
var OWN_UI_SELECTOR = '[data-chat-export-bar], [data-ce-host]';
var BUSY_OVERRIDABLE = [undefined, null, '', 'HOST_ERROR', 'TIMEOUT', 'NOT_FOUND', 'ATTACH_TIMEOUT'];

function bannerText(el) {
  return String((el && (el.innerText || el.textContent)) || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function bannerVisible(el) {
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
  if (typeof el.checkVisibility === 'function') {
    try {
      return el.checkVisibility();
    } catch (e) {}
  }
  return true;
}

function insideHit(hits, el) {
  for (var i = 0; i < hits.length; i++) {
    if (hits[i].el === el || hits[i].el.contains(el)) return true;
  }
  return false;
}

export function classifyGateKind(code, text) {
  if (code === 'UNAUTHORIZED') return 'auth_wall';
  if (code === 'PLATFORM_BUSY') return 'busy';
  if (PAYWALL_RE.test(String(text || ''))) return 'paywall';
  return 'quota';
}

export function classifyBusyText(text) {
  var t = String(text || '');
  if (!t || t.length > BANNER_TEXT_MAX) return null;
  if (AUTH_WALL_RE.test(t)) return 'UNAUTHORIZED';
  if (RATE_LIMIT_RE.test(t)) return 'RATE_LIMIT';
  if (PLATFORM_BUSY_RE.test(t)) return 'PLATFORM_BUSY';
  return null;
}

function pushGateHit(out, el, text) {
  var code = classifyBusyText(text);
  if (!code) return;
  out.push({ el: el, code: code, text: text, kind: classifyGateKind(code, text) });
}

export function findBusyBanners(root, extra) {
  root = root || document;
  var nodes = Array.prototype.slice.call(root.querySelectorAll(BANNER_SELECTOR));
  try {
    nodes = nodes.concat(Array.prototype.slice.call(root.querySelectorAll(UPSELL_SCAN_SELECTOR)));
  } catch (e) {}
  if (extra) nodes = nodes.concat(Array.isArray(extra) ? extra : [extra]);
  var out = [];
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (!el || insideHit(out, el)) continue;
    if (el.closest && el.closest(OWN_UI_SELECTOR)) continue;
    if (!bannerVisible(el)) continue;
    var text = bannerText(el);
    if (!text || text.length > BANNER_TEXT_MAX) continue;
    pushGateHit(out, el, text);
  }
  return out;
}

export function preferGateHit(hits) {
  if (!hits || !hits.length) return null;
  for (var i = 0; i < hits.length; i++) if (hits[i].code === 'UNAUTHORIZED') return hits[i];
  for (var j = 0; j < hits.length; j++) if (hits[j].code === 'RATE_LIMIT') return hits[j];
  return hits[0] || null;
}

export function detectBusyBanner(root, extra) {
  return preferGateHit(findBusyBanners(root, extra));
}

export function throwBusy(hit) {
  var kind = hit.kind || classifyGateKind(hit.code, hit.text);
  var retryable = hit.code === 'PLATFORM_BUSY' || (hit.code === 'RATE_LIMIT' && kind !== 'paywall');
  hostErr(hit.code, hit.text, { retryable: retryable, banner: hit.text, kind: kind });
}

// Banners that were already on screen before the op must not fail it: only nodes that appeared during the op count.
export async function guardBusy(run, candidates) {
  var collect = typeof candidates === 'function' ? candidates : function () {
    return null;
  };
  var before = findBusyBanners(document, collect()).map(function (h) {
    return h.el;
  });
  function fresh() {
    var hits = findBusyBanners(document, collect()).filter(function (h) {
      return before.indexOf(h.el) < 0;
    });
    return preferGateHit(hits);
  }
  var result;
  try {
    result = await run();
  } catch (err) {
    var hit = BUSY_OVERRIDABLE.indexOf(err && err.code) >= 0 ? fresh() : null;
    if (hit) throwBusy(hit);
    throw err;
  }
  var after = fresh();
  if (after) throwBusy(after);
  return result;
}

var STOP_LABEL_RE = /^(stop|cancel response|останов\S*|прерв\S*|стоп)(\s|$)/i;

export function findStopControl(root) {
  root = root || document;
  var btns = root.querySelectorAll('button, [role="button"]');
  for (var i = 0; i < btns.length; i++) {
    var b = btns[i];
    if (b.closest && b.closest(OWN_UI_SELECTOR)) continue;
    var testId = b.getAttribute('data-testid') || '';
    var label = (b.getAttribute('aria-label') || b.getAttribute('title') || '').trim();
    if (!/stop/i.test(testId) && !STOP_LABEL_RE.test(label)) continue;
    if (b.disabled || b.getAttribute('aria-disabled') === 'true' || !bannerVisible(b)) continue;
    return b;
  }
  return null;
}

export function composerReady(el) {
  if (!el || !el.isConnected) return false;
  if (el.disabled || el.readOnly) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  if (el.getAttribute('contenteditable') === 'false') return false;
  return true;
}

export function buildHostState(platform, state, candidates) {
  var hit = detectBusyBanner(document, candidates || null);
  var generating = !!(state && state.generating);
  var composerReady = !!(state && state.composerReady);
  var code = hit ? hit.code : null;
  var kind = hit ? hit.kind || classifyGateKind(hit.code, hit.text) : null;
  var retryable = !hit
    ? true
    : hit.code === 'PLATFORM_BUSY' || (hit.code === 'RATE_LIMIT' && kind !== 'paywall');
  var gateState = 'ok';
  if (hit) {
    if (code === 'UNAUTHORIZED') gateState = 'auth_wall';
    else if (code === 'RATE_LIMIT') gateState = 'rate_limit';
    else gateState = 'busy';
  } else if (generating) gateState = 'generating';
  else if (!composerReady) gateState = 'composer_blocked';
  return {
    platform: platform,
    generating: generating,
    busy: !!hit,
    banner: hit ? hit.text : null,
    composerReady: composerReady,
    code: code,
    kind: kind,
    retryable: retryable,
    state: gateState
  };
}

export * from './menu.js';
export * from './files.js';
export * from './options.js';
