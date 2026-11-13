() => {
  const menu = document.querySelector('[data-chat-export-menu], .chat-export-menu');
  if (!menu) return { ok: false, reason: 'no-menu' };
  const items = Array.from(menu.querySelectorAll('.chat-export-menu-item'));
  if (items.length < 2) return { ok: false, reason: 'need-2-formats', count: items.length };
  const before = items.map((el) => el.classList.contains('is-active'));
  const idx = before.findIndex((on, i) => on && i > 0) >= 0 ? before.findIndex((on, i) => on && i > 0) : 1;
  items[idx].click();
  const mid = items.map((el) => el.classList.contains('is-active'));
  items[idx].click();
  const after = items.map((el) => el.classList.contains('is-active'));
  const restored = before.every((v, i) => v === after[i]);
  return { ok: restored, before: before, mid: mid, after: after, toggled: idx };
}
