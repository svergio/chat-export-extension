() => {
  const bar = document.querySelector('[data-chat-export-bar]');
  const fmt = document.querySelector('.chat-export-fmt');
  const dl = document.querySelector('.chat-export-dl');
  const folder = document.querySelector('.chat-export-folder');
  const host = document.querySelector('[data-ce-host]');
  function box(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      radius: s.borderRadius,
      color: s.color,
      bg: s.backgroundColor,
      display: s.display,
      cls: String(el.className || '').slice(0, 220)
    };
  }
  let prev = null;
  let next = null;
  if (host && host.parentElement) {
    const kids = Array.from(host.parentElement.children);
    const idx = kids.indexOf(host);
    if (idx > 0) prev = kids[idx - 1];
    if (idx >= 0 && idx < kids.length - 1) next = kids[idx + 1];
  }
  const fmtBox = box(fmt);
  const badTokens = [];
  const cls = ((fmt && fmt.className) || '') + ' ' + ((dl && dl.className) || '');
  if (/\bsend-button\b/.test(cls)) badTokens.push('send-button');
  if (/\bds-button--disabled\b/.test(cls)) badTokens.push('ds-button--disabled');
  if (/\bds-toggle-button--selected\b/.test(cls)) badTokens.push('ds-toggle-button--selected');
  const neighbor = box(prev) || box(next);
  let heightDelta = null;
  if (fmtBox && neighbor) heightDelta = Math.abs(fmtBox.h - neighbor.h);
  return {
    platform: bar && bar.getAttribute('data-chat-export-bar'),
    ver: bar && bar.getAttribute('data-chat-export-v'),
    scheme: bar && bar.getAttribute('data-ce-scheme'),
    hasFolderIcon: !!(folder && folder.querySelector('.chat-export-folder-icon')),
    folderWarn: !!(folder && folder.classList.contains('chat-export-folder--warn')),
    fmt: fmtBox,
    dl: box(dl),
    folder: box(folder),
    neighbor,
    heightDelta,
    badTokens
  };
}
