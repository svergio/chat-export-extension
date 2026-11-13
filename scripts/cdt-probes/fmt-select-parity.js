() => {
  // Structural parity: ExportBar .chat-export-menu ≈ popup .ce-select-menu / .ce-select-item.
  // Colors (--ce-menu-* vs --ce-surface) stay host/popup-skinned; this probe checks geometry.
  const TOL = 1.5;
  // Default geometry = popup.css chatgpt --ce-radius-sm (10) / item calc(sm-2).
  // On popup, prefer live --ce-radius-sm so skin variants still pass select-vs-expect.
  function px(v) {
    const n = parseFloat(String(v || '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  const liveRadius = px(getComputedStyle(document.documentElement).getPropertyValue('--ce-radius-sm'));
  const EXPECT = {
    menuPad: 4,
    menuRadius: liveRadius != null ? liveRadius : 10,
    itemPadY: 8,
    itemPadX: 10,
    itemRadius: liveRadius != null ? Math.max(0, liveRadius - 2) : 8,
    itemGap: 8
  };

  function near(a, b, tol) {
    if (a == null || b == null) return false;
    return Math.abs(a - b) <= tol;
  }

  function readMenu(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      paddingTop: px(cs.paddingTop),
      paddingRight: px(cs.paddingRight),
      paddingBottom: px(cs.paddingBottom),
      paddingLeft: px(cs.paddingLeft),
      borderTopLeftRadius: px(cs.borderTopLeftRadius),
      backgroundColor: cs.backgroundColor
    };
  }

  function readItem(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      paddingTop: px(cs.paddingTop),
      paddingRight: px(cs.paddingRight),
      paddingBottom: px(cs.paddingBottom),
      paddingLeft: px(cs.paddingLeft),
      borderTopLeftRadius: px(cs.borderTopLeftRadius),
      gap: px(cs.gap),
      fontWeight: cs.fontWeight
    };
  }

  function checkVsExpect(kind, menu, item) {
    const fails = [];
    if (!menu) {
      fails.push(kind + ':no-menu');
      return fails;
    }
    if (!near(menu.paddingTop, EXPECT.menuPad, TOL)) fails.push(kind + '.menu.padT=' + menu.paddingTop);
    if (!near(menu.paddingRight, EXPECT.menuPad, TOL)) fails.push(kind + '.menu.padR=' + menu.paddingRight);
    if (!near(menu.paddingBottom, EXPECT.menuPad, TOL)) fails.push(kind + '.menu.padB=' + menu.paddingBottom);
    if (!near(menu.paddingLeft, EXPECT.menuPad, TOL)) fails.push(kind + '.menu.padL=' + menu.paddingLeft);
    if (!near(menu.borderTopLeftRadius, EXPECT.menuRadius, TOL)) {
      fails.push(kind + '.menu.radius=' + menu.borderTopLeftRadius);
    }
    if (!item) {
      fails.push(kind + ':no-item');
      return fails;
    }
    if (!near(item.paddingTop, EXPECT.itemPadY, TOL)) fails.push(kind + '.item.padY=' + item.paddingTop);
    if (!near(item.paddingLeft, EXPECT.itemPadX, TOL)) fails.push(kind + '.item.padX=' + item.paddingLeft);
    if (!near(item.borderTopLeftRadius, EXPECT.itemRadius, TOL)) {
      fails.push(kind + '.item.radius=' + item.borderTopLeftRadius);
    }
    if (!near(item.gap, EXPECT.itemGap, TOL)) fails.push(kind + '.item.gap=' + item.gap);
    return fails;
  }

  function comparePair(barMenu, barItem, selMenu, selItem) {
    const fails = [];
    const pairs = [
      ['menu.padT', barMenu && barMenu.paddingTop, selMenu && selMenu.paddingTop],
      ['menu.padR', barMenu && barMenu.paddingRight, selMenu && selMenu.paddingRight],
      ['menu.padB', barMenu && barMenu.paddingBottom, selMenu && selMenu.paddingBottom],
      ['menu.padL', barMenu && barMenu.paddingLeft, selMenu && selMenu.paddingLeft],
      ['menu.radius', barMenu && barMenu.borderTopLeftRadius, selMenu && selMenu.borderTopLeftRadius],
      ['item.padT', barItem && barItem.paddingTop, selItem && selItem.paddingTop],
      ['item.padR', barItem && barItem.paddingRight, selItem && selItem.paddingRight],
      ['item.padB', barItem && barItem.paddingBottom, selItem && selItem.paddingBottom],
      ['item.padL', barItem && barItem.paddingLeft, selItem && selItem.paddingLeft],
      ['item.radius', barItem && barItem.borderTopLeftRadius, selItem && selItem.borderTopLeftRadius],
      ['item.gap', barItem && barItem.gap, selItem && selItem.gap]
    ];
    for (const [name, a, b] of pairs) {
      if (a == null || b == null) {
        fails.push(name + ':missing');
        continue;
      }
      if (!near(a, b, TOL)) fails.push(name + '=' + a + '!=' + b);
    }
    return fails;
  }

  const barEl = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  const barItemEl = barEl && barEl.querySelector('.chat-export-menu-item');
  const barCheck = barEl && barEl.querySelector('.chat-export-check, .chat-export-menu-item.is-active svg');
  const selEl =
    document.querySelector('.ce-select.is-open .ce-select-menu') ||
    document.querySelector('.ce-select-menu');
  const selItemEl = selEl && selEl.querySelector('.ce-select-item');

  const bar = { menu: readMenu(barEl), item: readItem(barItemEl), hasCheck: !!barCheck };
  const select = { menu: readMenu(selEl), item: readItem(selItemEl) };

  let mode = 'none';
  let fails = [];

  if (bar.menu && select.menu) {
    mode = 'pair';
    fails = comparePair(bar.menu, bar.item, select.menu, select.item);
  } else if (bar.menu) {
    mode = 'bar-vs-expect';
    fails = checkVsExpect('bar', bar.menu, bar.item);
    if (barItemEl && barItemEl.classList.contains('is-active') && !bar.hasCheck) {
      fails.push('bar:active-missing-check');
    }
  } else if (select.menu) {
    mode = 'select-vs-expect';
    fails = checkVsExpect('select', select.menu, select.item);
  } else {
    mode = 'none';
    fails = ['no-menu'];
  }

  return {
    ok: fails.length === 0,
    mode,
    tol: TOL,
    expect: EXPECT,
    fails,
    bar,
    select
  };
}
