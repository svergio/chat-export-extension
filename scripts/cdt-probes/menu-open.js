() => {
  const fmt = document.querySelector('.chat-export-fmt');
  if (!fmt) return { ok: false, reason: 'no-fmt' };
  fmt.click();
  // Only CE menu — host pages (Claude etc.) also have [role=menu] / radios.
  const menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  const open =
    fmt.getAttribute('aria-expanded') === 'true' ||
    !!(menu && getComputedStyle(menu).display !== 'none' && getComputedStyle(menu).visibility !== 'hidden');
  return {
    ok: open && !!menu,
    reason: open && menu ? undefined : 'no-menu',
    aria: fmt.getAttribute('aria-expanded'),
    menu: !!menu
  };
}
