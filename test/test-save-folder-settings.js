import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../src/settings.js';

test('saveFolder.shiftMode rejects null, arrays, and numbers', () => {
  assert.equal(normalizeSettings({ saveFolder: null }).saveFolder.shiftMode, 'rebind');
  assert.equal(normalizeSettings({ saveFolder: [] }).saveFolder.shiftMode, 'rebind');
  assert.equal(normalizeSettings({ saveFolder: ['saveAs'] }).saveFolder.shiftMode, 'rebind');
  assert.equal(normalizeSettings({ saveFolder: { shiftMode: 1 } }).saveFolder.shiftMode, 'rebind');
  assert.equal(normalizeSettings({ saveFolder: { shiftMode: null } }).saveFolder.shiftMode, 'rebind');
});
