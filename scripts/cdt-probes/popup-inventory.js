() => {
  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0;
  }
  const toggles = Array.from(document.querySelectorAll('.ce-advanced-toggle'))
    .filter(visible)
    .map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80));
  const selectBtns = Array.from(document.querySelectorAll('.ce-select-btn'))
    .filter((b) => visible(b) && !b.disabled)
    .map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80));
  const checks = Array.from(document.querySelectorAll('input[type="checkbox"]'))
    .filter((c) => visible(c) && !c.disabled)
    .map((c) => {
      const lab = c.closest('label');
      return (
        (c.getAttribute('aria-label') || '') +
        ' ' +
        (lab ? lab.textContent : '')
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 80);
    });
  const buttons = Array.from(document.querySelectorAll('button'))
    .filter((b) => visible(b) && !b.disabled)
    .map((b) => ({
      text: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      cls: String(b.className || '')
    }));
  const openItems = Array.from(document.querySelectorAll('.ce-select.is-open .ce-select-item')).map((el) =>
    (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80)
  );
  return { toggles, selectBtns, checks, buttons, openItems, href: location.href.slice(0, 120) };
}
