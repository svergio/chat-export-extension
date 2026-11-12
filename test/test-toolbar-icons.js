import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kinds = ['idle', 'chatgpt', 'grok', 'x', 'copilot', 'claude', 'qwen', 'deepseek', 'perplexity'];
const sizes = [16, 32, 48, 128];

test('toolbar PNGs exist for all 9 kinds and 4 sizes', () => {
  for (const kind of kinds) {
    for (const size of sizes) {
      const path = join(root, 'icons', `toolbar-${kind}-${size}.png`);
      assert.ok(existsSync(path), path);
    }
  }
});

test('toolbar SVGs contain no sticker overlay', () => {
  const svgs = readdirSync(join(root, 'icons')).filter((f) => /^toolbar-.+\.svg$/.test(f));
  assert.ok(svgs.length >= kinds.length);
  for (const file of svgs) {
    const text = readFileSync(join(root, 'icons', file), 'utf8');
    assert.ok(!/sticker/i.test(text), `${file} contains sticker`);
  }
});
