() => {
  const which = window.__cePackWhich === 'zip' ? 'zip' : 'folder';
  let menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  if (!menu) {
    const fmt = document.querySelector('.chat-export-fmt');
    if (!fmt) return { ok: false, reason: 'no-fmt' };
    fmt.click();
    menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  }
  if (!menu) return { ok: false, reason: 'no-menu' };
  const btns = Array.from(menu.querySelectorAll('.chat-export-pack-btn, [role="radio"]'));
  const re = which === 'zip' ? /zip|архив/i : /folder|папк/i;
  const btn = btns.find((el) => re.test((el.textContent || '') + (el.getAttribute('aria-label') || '')));
  if (!btn) {
    return {
      ok: false,
      reason: 'no-pack-btn',
      which,
      found: btns.map((el) => (el.textContent || '').trim().slice(0, 24))
    };
  }
  btn.click();
  return {
    ok: true,
    which,
    label: (btn.textContent || '').trim().slice(0, 24),
    active: btn.classList.contains('is-active') || btn.getAttribute('aria-checked') === 'true'
  };
}
