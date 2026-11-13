() => {
  function parseRgb(s) {
    if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
    const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  function lum(rgb) {
    const a = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(fg, bg) {
    const L1 = lum(fg);
    const L2 = lum(bg);
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function effectiveBg(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = parseRgb(getComputedStyle(n).backgroundColor);
      if (bg) return bg;
      n = n.parentElement;
    }
    return [255, 255, 255];
  }
  const bar = document.querySelector('[data-chat-export-bar]');
  const fmt = document.querySelector('.chat-export-fmt');
  const menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  const out = {
    scheme: bar && bar.getAttribute('data-ce-scheme'),
    fmtContrast: null,
    menuContrast: null,
    fmtColor: null,
    menuBg: null
  };
  if (fmt) {
    const fg = parseRgb(getComputedStyle(fmt).color);
    const bg = effectiveBg(fmt);
    out.fmtColor = fg;
    if (fg && bg) out.fmtContrast = Math.round(contrast(fg, bg) * 100) / 100;
  }
  if (menu) {
    const item = menu.querySelector('.chat-export-menu-item') || menu;
    const fg = parseRgb(getComputedStyle(item).color);
    const bg = parseRgb(getComputedStyle(menu).backgroundColor) || effectiveBg(menu);
    out.menuBg = bg;
    if (fg && bg) out.menuContrast = Math.round(contrast(fg, bg) * 100) / 100;
  }
  return out;
}
