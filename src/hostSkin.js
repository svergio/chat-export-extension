/** Toolbar PNG basename + popup skin id from the active tab URL (kept in sync). */
export function toolbarKindFromUrl(url) {
  if (!url) return 'idle';
  try {
    const u = new URL(url);
    const host = (u.hostname || '').toLowerCase();
    const path = u.pathname || '';
    if (host === 'grok.com' || host.endsWith('.grok.com')) return 'grok';
    if (host === 'chatgpt.com' || host === 'chat.openai.com' || host.endsWith('.chatgpt.com')) {
      return 'chatgpt';
    }
    if (host === 'github.com' || host.endsWith('.github.com')) {
      if (path === '/' || /^\/copilot(?:\/|$)/i.test(path)) return 'copilot';
      return 'idle';
    }
    if (
      host === 'x.com' ||
      host === 'twitter.com' ||
      host.endsWith('.x.com') ||
      host.endsWith('.twitter.com')
    ) {
      if (/^\/i\/grok(?:\/|$)/i.test(path)) return 'x';
      return 'idle';
    }
    if (host === 'claude.ai' || host.endsWith('.claude.ai')) return 'claude';
    if (host === 'chat.qwen.ai' || host.endsWith('.qwen.ai')) return 'qwen';
    if (host === 'chat.deepseek.com' || host.endsWith('.deepseek.com')) return 'deepseek';
    if (host === 'perplexity.ai' || host === 'www.perplexity.ai' || host.endsWith('.perplexity.ai')) {
      return 'perplexity';
    }
  } catch (e) {}
  return 'idle';
}

export function toolbarKindToSkinId(kind) {
  if (!kind || kind === 'idle') return null;
  if (kind === 'x') return 'grok-x';
  return kind;
}
