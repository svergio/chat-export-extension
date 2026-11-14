import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gatewayFieldsDisabled,
  maskToken,
  pingOkDetail,
  tokenPreviewIsSafe
} from '../src/popup/gateway-ui.js';

test('gatewayFieldsDisabled locks only when serverOn', () => {
  assert.equal(gatewayFieldsDisabled(false), false);
  assert.equal(gatewayFieldsDisabled(true), true);
  assert.equal(gatewayFieldsDisabled(0), false);
  assert.equal(gatewayFieldsDisabled(1), true);
});

test('maskToken shows head/tail preview without full key', () => {
  assert.equal(maskToken(''), '');
  assert.equal(maskToken('   '), '');
  const key = 'ceb_b8bfc5d4383f88e81a7f9c817061ca5a9120733cb79fa594';
  const masked = maskToken(key);
  assert.ok(masked.startsWith('ceb_b8bfc5d4'));
  assert.ok(masked.includes('…'));
  assert.ok(masked.endsWith('fa594') || masked.endsWith(key.slice(-6)));
  assert.notEqual(masked, key);
  assert.ok(tokenPreviewIsSafe(masked, key));
  assert.equal(tokenPreviewIsSafe(key, key), false);
});

test('pingOkDetail prefers browserId', () => {
  assert.equal(pingOkDetail('b-215c6f46', '1.2.3'), 'OK · b-215c6f46');
  assert.equal(pingOkDetail('', '1.2.3'), 'OK · 1.2.3');
  assert.equal(pingOkDetail(null, ''), 'OK');
});
