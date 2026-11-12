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
