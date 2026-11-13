() => {
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }
  const buttons = Array.from(document.querySelectorAll('button')).filter(visible).map((b) => ({
    kind: 'button',
    text: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
    cls: String(b.className || '').slice(0, 120),
    disabled: !!b.disabled
  }));
  const checks = Array.from(document.querySelectorAll('input[type="checkbox"]'))
    .filter(visible)
    .map((c) => ({
      kind: 'checkbox',
      text: (
        (c.getAttribute('aria-label') || '') +
        ' ' +
        ((c.closest('label') && c.closest('label').textContent) || '')
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 80),
      checked: !!c.checked,
      disabled: !!c.disabled
    }));
  const bar = {
    fmt: !!document.querySelector('.chat-export-fmt'),
    folder: !!document.querySelector('.chat-export-folder'),
    dl: !!document.querySelector('.chat-export-dl'),
    menuOpen: !!document.querySelector('[data-chat-export-menu], .chat-export-menu'),
    menuItems: Array.from(document.querySelectorAll('.chat-export-menu-item')).map((el) =>
      (el.textContent || '').trim().slice(0, 40)
    ),
    packBtns: Array.from(document.querySelectorAll('[data-pack], .chat-export-pack-btn')).map((el) =>
      el.getAttribute('data-pack') || (el.textContent || '').trim().slice(0, 40)
    )
  };
  return {
    href: location.href.slice(0, 120),
    buttons: buttons.filter((b) => !b.disabled),
    disabledButtons: buttons.filter((b) => b.disabled).length,
    checkboxes: checks.filter((c) => !c.disabled),
    bar: bar
  };
}
