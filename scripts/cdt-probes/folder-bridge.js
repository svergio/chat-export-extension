() =>
  new Promise((resolve) => {
    const done = (payload) => resolve(payload);
    try {
      const ev = new CustomEvent('ce-cdt-folder-status');
      window.dispatchEvent(ev);
    } catch (_) {}
    // Content script exposes nothing on window by design; ask via DOM bridge marker.
    const bar = document.querySelector('[data-chat-export-bar]');
    const folder = document.querySelector('.chat-export-folder');
    done({
      hasBar: !!bar,
      ver: bar && bar.getAttribute('data-chat-export-v'),
      folderTitle: folder && (folder.getAttribute('title') || '').slice(0, 80),
      folderWarn: !!(folder && folder.classList.contains('chat-export-folder--warn')),
      folderClass: folder && folder.className
    });
  });
