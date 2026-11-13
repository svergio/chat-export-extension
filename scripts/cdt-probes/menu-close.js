() => {
  const fmt = document.querySelector('.chat-export-fmt');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  if (fmt) fmt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const open = fmt && fmt.getAttribute('aria-expanded') === 'true';
  return { closed: !open, aria: fmt && fmt.getAttribute('aria-expanded') };
}
