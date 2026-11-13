() => {
  const live = Array.from(document.querySelectorAll('.chat-export-toast')).map((n) =>
    (n.textContent || '').trim().slice(0, 240)
  );
  const folder = document.querySelector('.chat-export-folder');
  return {
    log: (window.__ceCdt && window.__ceCdt.toasts) || [],
    live,
    folderWarn: !!(folder && folder.classList.contains('chat-export-folder--warn')),
    folderTitle: folder && (folder.getAttribute('title') || '').slice(0, 80)
  };
}
