import { clickEl, waitFor } from './helpers.js';

const ITEM_ROLES = ['menuitem', 'menuitemcheckbox', 'menuitemradio', 'option'];

function pageView(doc) {
  return (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null);
}

function isVisible(el) {
  if (!el || !el.isConnected) return false;
  var r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  var st = pageView(el.ownerDocument);
  if (st && st.getComputedStyle) {
    var cs = st.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  }
  return true;
}

function itemLabel(el) {
  var bits = [];
  var aria = el.getAttribute('aria-label');
  if (aria) bits.push(aria.trim());
  var labelled = el.getAttribute('aria-labelledby');
  if (labelled && el.ownerDocument) {
    var parts = labelled.split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var ref = el.ownerDocument.getElementById(parts[i]);
      if (ref) bits.push((ref.textContent || '').replace(/\s+/g, ' ').trim());
    }
  }
  bits.push((el.textContent || '').replace(/\s+/g, ' ').trim());
  return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function isLockedItem(el, label) {
  if (!el) return false;
  if (el.getAttribute('data-locked') === 'true' || el.getAttribute('aria-disabled') === 'true') {
    var t = (label || '').toLowerCase();
    if (/pro\+|max|upgrade|premium|премиум|перейти на/i.test(t)) return true;
  }
  var t2 = (label || '').toLowerCase();
  if (/\b(pro\+|pro plus|max only|agent upgrade|upgrade)\b/i.test(t2)) return true;
  if (/перейти на grok\.com/i.test(t2)) return true;
  var cls = String(el.className || '');
  if (/\blocked\b|\bdisabled\b/i.test(cls) && el.getAttribute('aria-disabled') === 'true') {
    if (/pro|max|upgrade|premium/i.test(t2)) return true;
  }
  return el.getAttribute('data-ce-locked') === 'true';
}

function menuItemNodes(root) {
  var out = [];
  var seen = new Set();
  function add(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    out.push(el);
  }
  var i;
  var role;
  var nodes = root.querySelectorAll('[role]');
  for (i = 0; i < nodes.length; i++) {
    role = (nodes[i].getAttribute('role') || '').toLowerCase();
    if (ITEM_ROLES.indexOf(role) >= 0) add(nodes[i]);
  }
  var lis = root.querySelectorAll('li[class*="ActionList-ActionListItem" i], li.prc-ActionList-ActionListItem');
  for (i = 0; i < lis.length; i++) add(lis[i]);
  if (
    root.getAttribute &&
    ITEM_ROLES.indexOf((root.getAttribute('role') || '').toLowerCase()) >= 0
  ) {
    add(root);
  }
  return out;
}

export function locateMenuRoot(doc, trigger) {
  if (!doc) return null;
  if (trigger) {
    var controls = trigger.getAttribute('aria-controls');
    if (controls) {
      var ids = String(controls).split(/\s+/);
      for (var c = 0; c < ids.length; c++) {
        var linked = doc.getElementById(ids[c]);
        if (linked && linked.isConnected) return linked;
      }
    }
    var expanded = trigger.getAttribute('aria-expanded');
    if (expanded === 'true') {
      var next = trigger.nextElementSibling;
      if (next && (next.querySelector('li') || next.getAttribute('role') === 'menu')) return next;
    }
  }
  var menus = doc.querySelectorAll('[role="menu"], [role="listbox"]');
  var i;
  for (i = menus.length - 1; i >= 0; i--) {
    if (isVisible(menus[i])) return menus[i];
  }
  var portals = doc.querySelectorAll(
    '#__primerPortalRoot__, [id*="primer-portal" i], [data-portal], [data-radix-popper-content-wrapper]'
  );
  for (i = portals.length - 1; i >= 0; i--) {
    if (!portals[i].querySelector) continue;
    var portalMenu = portals[i].querySelector(
      '[role="menu"], [role="listbox"], [data-testid="action-list"], ul[class*="ActionList" i]'
    );
    if (portalMenu && (isVisible(portalMenu) || portalMenu.querySelector('li'))) return portalMenu;
    if (portals[i].querySelector('li') && isVisible(portals[i])) return portals[i];
  }
  var overlays = doc.querySelectorAll(
    '[data-testid="action-list"], [class*="ActionList" i], ul.prc-ActionList-ActionList'
  );
  for (i = overlays.length - 1; i >= 0; i--) {
    if (!isVisible(overlays[i]) && !overlays[i].querySelector('li')) continue;
    var inner = overlays[i].querySelector('[role="menu"], [role="listbox"], ul');
    if (inner && (isVisible(inner) || inner.querySelector('li'))) return inner;
    if (overlays[i].querySelector('li')) return overlays[i];
  }
  return null;
}

export async function openMenu(trigger, opts) {
  opts = opts || {};
  if (!trigger) throw new Error('menu trigger missing');
  var doc = trigger.ownerDocument;
  var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 10000;
  var attempts = opts.retries != null ? opts.retries : 2;
  var a;
  var lastErr = null;
  for (a = 0; a <= attempts; a++) {
    if (a > 0) closeMenu(doc);
    clickEl(trigger);
    try {
      return await waitFor(
        function () {
          return locateMenuRoot(doc, trigger);
        },
        Object.assign({}, opts, {
          timeoutMs: Math.floor(timeoutMs / (attempts + 1)) + (a === attempts ? 2000 : 0),
          message: opts.message || 'menu did not open'
        })
      );
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('menu did not open');
}

export function readMenuItems(root) {
  if (!root) return [];
  var nodes = menuItemNodes(root);
  var items = [];
  var i;
  var el;
  var role;
  var label;
  var checked;
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    role = (el.getAttribute('role') || '').toLowerCase();
    if (!role && el.tagName === 'LI') role = 'menuitem';
    label = itemLabel(el);
    checked = null;
    if (role === 'menuitemcheckbox' || role === 'menuitemradio' || role === 'option') {
      var ac = el.getAttribute('aria-checked');
      if (ac === 'true' || ac === 'false') checked = ac === 'true';
      else if (el.getAttribute('aria-selected') === 'true') checked = true;
    }
    var disabled =
      el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled') || el.getAttribute('data-disabled') === 'true';
    items.push({
      el: el,
      role: role,
      label: label,
      checked: checked,
      disabled: disabled,
      locked: isLockedItem(el, label)
    });
  }
  return items;
}

function matchMenuItem(item, matcher) {
  if (typeof matcher === 'function') return !!matcher(item);
  if (matcher instanceof RegExp) return matcher.test(item.label || '');
  var m = String(matcher || '').trim().toLowerCase();
  if (!m) return false;
  var label = String(item.label || '').toLowerCase();
  return label === m || label.indexOf(m) >= 0;
}

export function pickMenuItem(root, matcher, opts) {
  opts = opts || {};
  var maxScroll = opts.maxScroll != null ? opts.maxScroll : 40;
  var s;
  for (s = 0; s <= maxScroll; s++) {
    var items = readMenuItems(root);
    var i;
    for (i = 0; i < items.length; i++) {
      if (items[i].disabled) continue;
      if (matchMenuItem(items[i], matcher)) {
        try {
          if (items[i].el.scrollIntoView) items[i].el.scrollIntoView({ block: 'nearest' });
        } catch (e) {}
        clickEl(items[i].el);
        return items[i];
      }
    }
    var scroller =
      (root.scrollHeight > root.clientHeight + 4 && root) ||
      root.querySelector('[style*="overflow"], [class*="Scroll" i], ul') ||
      root;
    if (scroller && scroller.scrollTop != null) {
      var before = scroller.scrollTop;
      scroller.scrollTop = before + Math.max(48, Math.floor((scroller.clientHeight || 120) * 0.8));
      if (scroller.scrollTop === before) break;
    } else {
      break;
    }
  }
  return null;
}

export function closeMenu(doc) {
  doc = doc || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  var view = pageView(doc);
  var keyInit = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
  var target = doc.body || doc.documentElement;
  try {
    target.dispatchEvent(new view.KeyboardEvent('keydown', keyInit));
    target.dispatchEvent(new view.KeyboardEvent('keyup', keyInit));
  } catch (e) {
    target.dispatchEvent(new KeyboardEvent('keydown', keyInit));
    target.dispatchEvent(new KeyboardEvent('keyup', keyInit));
  }
}
