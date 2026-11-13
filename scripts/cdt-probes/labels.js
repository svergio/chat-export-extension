() => {
  const fmt = document.querySelector('.chat-export-fmt');
  const dl = document.querySelector('.chat-export-dl');
  const folder = document.querySelector('.chat-export-folder');
  return {
    fmtAria: fmt && (fmt.getAttribute('aria-label') || '').slice(0, 80),
    dlAria: dl && (dl.getAttribute('aria-label') || '').slice(0, 80),
    dlTitle: dl && (dl.getAttribute('title') || '').slice(0, 120),
    folderTitle: folder && (folder.getAttribute('title') || folder.getAttribute('aria-label') || '').slice(0, 80)
  };
}
