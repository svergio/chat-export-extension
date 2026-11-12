import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'locales/LN_en.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(root, 'locales/LN_ru.json'), 'utf8'));

const PLAN_KEYS = [
  'section.exportSettings',
  'btn.showExportSettings',
  'btn.hideExportSettings',
  'label.saveFolder',
  'saveFolder.none',
  'saveFolder.prompt',
  'saveFolder.unsupported',
  'btn.chooseFolder',
  'btn.changeFolder',
  'btn.forgetFolder',
  'label.shiftMode',
  'shiftMode.rebind',
  'shiftMode.saveAs',
  'hint.shiftMode',
  'label.schemaDefault',
  'label.schemaPerFormat',
  'schema.inherit',
  'bar.dl.single',
  'bar.dl.multi',
  'bar.shift.rebind',
  'bar.shift.saveAs',
  'folderPage.title',
  'folderPage.pick',
  'folderPage.grant',
  'folderPage.saved',
  'folderPage.cancelled'
];

const RU_SAME_AS_EN_OK = new Set([]);

test('plan section 1.5 locale keys exist and are non-empty in EN and RU', () => {
  for (const key of PLAN_KEYS) {
    assert.equal(typeof en[key], 'string', `missing en ${key}`);
    assert.equal(typeof ru[key], 'string', `missing ru ${key}`);
    assert.ok(en[key].trim().length > 0, `en ${key} empty`);
    assert.ok(ru[key].trim().length > 0, `ru ${key} empty`);
  }
});

test('plan 1.5 keys differ between RU and EN where required', () => {
  for (const key of PLAN_KEYS) {
    if (RU_SAME_AS_EN_OK.has(key)) continue;
    assert.notEqual(ru[key], en[key], `ru should differ from en for ${key}`);
  }
});
