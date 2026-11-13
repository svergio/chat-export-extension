() => {
  const fmt = document.querySelector('.chat-export-fmt');
  if (!fmt) return { ok: false, reason: 'no-fmt' };
  fmt.click();
  const menu = document.querySelector('.chat-export-menu, [role="menu"], .chat-export-format-menu');
  const open =
    fmt.getAttribute('aria-expanded') === 'true' ||
    !!(menu && getComputedStyle(menu).display !== 'none');
  return { ok: open, aria: fmt.getAttribute('aria-expanded'), menu: !!menu };
}
