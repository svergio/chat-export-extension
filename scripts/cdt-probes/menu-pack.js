() => {
  const menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  if (!menu) return { ok: false, reason: 'no-menu' };
  const items = Array.from(menu.querySelectorAll('.chat-export-menu-item')).map((el) =>
    (el.textContent || '').trim().slice(0, 40)
  );
  const packBtns = Array.from(menu.querySelectorAll('.chat-export-pack-btn, [data-pack]')).map((el) => ({
    pack: el.getAttribute('data-pack') || el.getAttribute('aria-label') || (el.textContent || '').trim(),
    active: el.classList.contains('is-active') || el.getAttribute('aria-checked') === 'true'
  }));
  const hasFolder = packBtns.some((p) => /folder|папк/i.test(p.pack + (p.pack || ''))) ||
    /Папка|Folder/i.test(menu.textContent || '');
  const hasZip = packBtns.some((p) => /zip|архив/i.test(p.pack)) || /Архив|Zip|ZIP/i.test(menu.textContent || '');
  return {
    ok: true,
    itemCount: items.length,
    items: items.slice(0, 8),
    packBtns,
    hasFolder,
    hasZip
  };
}
