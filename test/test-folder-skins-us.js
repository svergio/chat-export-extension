import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// base.css leaves `.chat-export-folder { color: inherit }`, so a skin without its own
// folder rules paints the folder glyph in the host slot colour (purple on DeepSeek).
const SKINS = {
  chatgpt: '.chat-export-bar--chatgpt > .chat-export-folder',
  claude: '.chat-export-bar--claude > .chat-export-folder',
  copilot: '.chat-export-bar--copilot > .chat-export-folder',
  grok: '.chat-export-bar--grok > .chat-export-folder',
  'grok-x': "[data-chat-export-bar='grok-x'] .chat-export-folder",
  perplexity: '.chat-export-bar--perplexity > .chat-export-folder'
};

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const [skin, sel] of Object.entries(SKINS)) {
  test(`${skin}.css styles the folder button like the download button`, () => {
    const css = readFileSync(join(root, 'styles', skin + '.css'), 'utf8');
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
      sels: m[1].split(',').map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').trim()),
      body: m[2]
    }));
    const withFolder = rules.filter((r) => r.sels.some((s) => s === sel || s.startsWith(sel + ':') || s.endsWith('> .chat-export-folder')));
    assert.ok(withFolder.some((r) => /(^|;|\s)color:\s*(?!inherit)[^;]+!important/.test(r.body)), 'folder colour pinned');
    assert.ok(withFolder.some((r) => /width:\s*[^;]+!important/.test(r.body)), 'folder sized like dl');
    assert.ok(rules.some((r) => r.sels.some((s) => s === sel + ':hover')), 'folder :hover');
    assert.ok(rules.some((r) => r.sels.some((s) => s === sel + ':focus-visible')), 'folder :focus-visible');
    for (const r of withFolder) {
      assert.doesNotMatch(r.body, /(^|;|\s)color:\s*inherit/, 'folder colour must not inherit');
    }
    const warn = new RegExp(esc('[data-ce-scheme]') + '[^{]*\\.chat-export-folder\\.chat-export-folder--warn[^{]*\\{[^}]*color:\\s*#c45c26 !important');
    assert.match(css, warn, 'warn state stays orange and outranks the scheme pins');
  });
}
