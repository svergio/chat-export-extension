import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function wantsPathPickerFromSource() {
  const src = readFileSync(join(root, 'src/core.js'), 'utf8');
  const m = src.match(/function wantsPathPicker\(ev\) \{([\s\S]*?)\n  \}/);
  assert.ok(m, 'wantsPathPicker not found in core.js');
  return new Function('ev', m[1].trim());
}

test('wantsPathPicker is Shift-only', () => {
  const wantsPathPicker = wantsPathPickerFromSource();
  const src = readFileSync(join(root, 'src/core.js'), 'utf8');
  const body = src.match(/function wantsPathPicker\(ev\) \{([\s\S]*?)\n  \}/)[1];
  assert.ok(!/ctrlKey|metaKey|altKey/.test(body), 'picker must not use ctrl/meta/alt');
  assert.equal(wantsPathPicker({ ctrlKey: true }), false);
  assert.equal(wantsPathPicker({ metaKey: true }), false);
  assert.equal(wantsPathPicker({ altKey: true }), false);
  assert.equal(wantsPathPicker({ shiftKey: false }), false);
  assert.equal(wantsPathPicker({ shiftKey: true }), true);
  assert.equal(wantsPathPicker(null), false);
});
