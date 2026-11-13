() => {
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0;
  }
  const bar = document.querySelector('[data-chat-export-bar]');
  const fmt = document.querySelector('.chat-export-fmt');
  const folder = document.querySelector('.chat-export-folder');
  const dl = document.querySelector('.chat-export-dl');
  const menuItems = Array.from(document.querySelectorAll('.chat-export-menu-item'))
    .filter(visible)
    .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  const packBtns = Array.from(
    document.querySelectorAll('[data-pack], .chat-export-pack-btn, .chat-export-pack button')
  )
    .filter(visible)
    .map((el) => ({
      pack: el.getAttribute('data-pack') || '',
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    }));
  return {
    hasBar: !!bar,
    ver: bar && bar.getAttribute('data-chat-export-v'),
    hasFmt: !!(fmt && visible(fmt)),
    hasFolder: !!(folder && visible(folder)),
    hasDl: !!(dl && visible(dl)),
    folderTitle: folder
      ? (folder.getAttribute('title') || folder.getAttribute('aria-label') || '').trim().slice(0, 80)
      : '',
    menuItems,
    packBtns
  };
}
