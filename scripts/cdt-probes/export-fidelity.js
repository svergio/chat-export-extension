() => {
  const bar = document.querySelector('[data-chat-export-bar]');
  const platform =
    (bar && (bar.getAttribute('data-chat-export-bar') || bar.getAttribute('data-chat-export-platform'))) ||
    '';
  const body = (document.body && document.body.innerText) || '';
  const bodyLen = body.length;
  const href = location.href;

  function count(sel) {
    try {
      return document.querySelectorAll(sel).length;
    } catch (_) {
      return 0;
    }
  }

  let domUserN = 0;
  let domAsstN = 0;
  if (platform === 'zai') {
    domUserN = count('.user-message');
    domAsstN = count('.chat-assistant');
  } else if (platform === 'chatgpt') {
    domUserN = count('[data-message-author-role="user"]');
    domAsstN = count('[data-message-author-role="assistant"]');
  } else if (platform === 'claude') {
    domUserN = count('[data-testid="user-message"]');
    domAsstN = count('[data-testid="assistant-message"]');
  } else if (platform === 'minimax') {
    domUserN = 0;
    domAsstN = count('.message-animate-in.group');
    if (!domAsstN) domAsstN = count('.matrix-markdown, .message-content');
  } else if (platform === 'janitorai') {
    domUserN = (body.match(/\boleg\b/gi) || []).length ? 1 : 0;
    domAsstN = bodyLen > 500 ? 1 : 0;
  } else {
    domUserN = count(
      '.user-message, [data-message-author-role="user"], [data-testid="user-message"]'
    );
    domAsstN = count(
      '.chat-assistant, [data-message-author-role="assistant"], [data-testid="assistant-message"]'
    );
  }

  const topSnippet = body.replace(/\s+/g, ' ').trim().slice(0, 80);
  const bottomSnippet = body.replace(/\s+/g, ' ').trim().slice(-80);

  return {
    href: href.slice(0, 180),
    platform,
    hasBar: !!bar,
    bodyLen,
    domUserN,
    domAsstN,
    topSnippet,
    bottomSnippet
  };
}
