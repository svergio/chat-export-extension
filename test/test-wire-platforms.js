import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWirePlatform,
  platformsEnabledForWire,
  normalizeSettings
} from '../src/settings.js';

test('janitorai is extension-only and never on MCP wire platform list', () => {
  assert.equal(isWirePlatform('janitorai'), false);
  assert.equal(isWirePlatform('chatgpt'), true);
  const wire = platformsEnabledForWire(
    normalizeSettings({
      platforms: {
        chatgpt: true,
        janitorai: true,
        minimax: true
      }
    })
  );
  assert.ok(wire.includes('chatgpt'));
  assert.ok(wire.includes('minimax'));
  assert.ok(!wire.includes('janitorai'));
});
