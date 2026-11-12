import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/popup/main.jsx'), 'utf8');

test('popup main.jsx has no native select elements', () => {
  assert.ok(!/<select\b/i.test(src), 'found <select in popup main.jsx');
});

test('popup inputs declare stable id and name attributes', () => {
  const inputs = [...src.matchAll(/<input\b[^>]*>/gi)].map((m) => m[0]);
  assert.ok(inputs.length > 0, 'expected input elements in popup main.jsx');
  for (const tag of inputs) {
    assert.match(tag, /\bid="/, 'input missing id: ' + tag);
    assert.match(tag, /\bname="/, 'input missing name: ' + tag);
  }
});

test('export settings toggle appears before advanced toggle in source', () => {
  const exportAt = src.indexOf("btn.showExportSettings");
  const advancedAt = src.indexOf("btn.showAdvanced");
  assert.ok(exportAt >= 0, 'btn.showExportSettings missing');
  assert.ok(advancedAt >= 0, 'btn.showAdvanced missing');
  assert.ok(exportAt < advancedAt, 'export settings block should precede advanced');
});
