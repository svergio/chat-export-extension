() => {
  const bar = document.querySelector('[data-chat-export-bar]');
  const folder = document.querySelector('.chat-export-folder');
  const dl = document.querySelector('.chat-export-dl');
  const fmt = document.querySelector('.chat-export-fmt');
  const menu = document.querySelector(
    '.chat-export-menu, [role="menu"].chat-export-fmt-menu, .chat-export-format-menu'
  );
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = cs(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: s.display,
      visibility: s.visibility,
      opacity: s.opacity
    };
  };
  return {
    href: location.href.slice(0, 160),
    host: location.host,
    title: (document.title || '').slice(0, 80),
    platform: bar && bar.getAttribute('data-chat-export-bar'),
    ver: bar && bar.getAttribute('data-chat-export-v'),
    scheme: bar && bar.getAttribute('data-ce-scheme'),
    hasBar: !!bar,
    hasFolder: !!folder,
    folderTitle: folder
      ? (folder.getAttribute('title') || folder.getAttribute('aria-label') || folder.textContent || '')
          .trim()
          .slice(0, 80)
      : null,
    folderWarn: !!(folder && folder.classList.contains('chat-export-folder--warn')),
    hasDl: !!dl,
    hasFmt: !!fmt,
    fmtExpanded: fmt && fmt.getAttribute('aria-expanded') === 'true',
    menuOpen: !!(menu && cs(menu) && cs(menu).display !== 'none' && cs(menu).visibility !== 'hidden'),
    barBox: box(bar),
    folderBox: box(folder),
    dlBox: box(dl),
    fmtBox: box(fmt)
  };
}
