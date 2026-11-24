import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('styles/*.css never use aria-label attribute selectors', () => {
  const dir = join(root, 'styles');
  const files = readdirSync(dir).filter((f) => f.endsWith('.css'));
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8');
    assert.ok(!/aria-label/i.test(text), `${file} mentions aria-label`);
  }
});

test('manifest content_scripts css paths exist', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const seen = new Set();
  for (const entry of manifest.content_scripts || []) {
    for (const rel of entry.css || []) {
      if (seen.has(rel)) continue;
      seen.add(rel);
      const path = join(root, rel);
      assert.ok(existsSync(path), `missing css ${rel}`);
    }
  }
});

test('qwen.css pins the folder button color in both schemes', () => {
  const text = readFileSync(join(root, 'styles/qwen.css'), 'utf8');
  // base.css sets `.chat-export-folder { color: inherit }` — Qwen's slot inherits
  // black on dark, so the stroked folder glyph went invisible. Both schemes must
  // pin an explicit color, and the warn (rebind) state must stay orange.
  const dark = /\.chat-export-bar--qwen > \.chat-export-folder \{[^}]*color:\s*var\(/;
  const light = /\[data-ce-scheme='light'\] > \.chat-export-folder \{[^}]*color:\s*var\(/;
  const warn = /\.chat-export-bar--qwen > \.chat-export-folder--warn \{[^}]*color:\s*#c45c26/;
  assert.match(text, dark, 'dark scheme must pin folder color');
  assert.match(text, light, 'light scheme must pin folder color');
  assert.match(text, warn, 'warn state must stay #c45c26');
  assert.doesNotMatch(
    text,
    /\.chat-export-bar--qwen > \.chat-export-folder \{[^}]*color:\s*inherit/,
    'folder color must not fall back to inherit'
  );
});
