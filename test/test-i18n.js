import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(root, 'locales/LN_ru.json'), 'utf8'));

test('LN_en.json and LN_ru.json key parity', () => {
  const ek = Object.keys(en).sort();
  const rk = Object.keys(ru).sort();
  assert.deepEqual(ek, rk);
});

test('locale values are non-empty strings', () => {
  for (const [k, v] of Object.entries(en)) {
    assert.equal(typeof v, 'string', `en ${k}`);
    assert.ok(v.trim().length > 0, `en ${k} empty`);
  }
  for (const [k, v] of Object.entries(ru)) {
    assert.equal(typeof v, 'string', `ru ${k}`);
    assert.ok(v.trim().length > 0, `ru ${k} empty`);
  }
});
