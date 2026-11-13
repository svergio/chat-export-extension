() => {
  window.__ceCdt = { toasts: [], t0: Date.now() };
  if (window.__ceCdtObs) window.__ceCdtObs.disconnect();
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const cls = n.className && String(n.className);
        if (cls && /chat-export-toast/.test(cls)) {
          window.__ceCdt.toasts.push({
            t: Date.now() - window.__ceCdt.t0,
            text: (n.textContent || '').trim().slice(0, 240)
          });
        }
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  window.__ceCdtObs = obs;
  return { armed: true, hasDl: !!document.querySelector('.chat-export-dl') };
}
