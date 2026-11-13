() => {
  const dl = document.querySelector('.chat-export-dl');
  if (!dl) return { ok: false, reason: 'no-dl' };
  dl.click();
  return { ok: true };
}
