import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOption, normalizeId } from '../src/ops/options.js';

test('normalizeId slug and well-known ids', () => {
  assert.equal(normalizeId('GPT-5.2 Pro'), 'gpt-5-2-pro');
  assert.equal(normalizeId('Размышление'), 'thinking');
  assert.equal(normalizeId('Thinking mode'), 'thinking');
  assert.equal(normalizeId('Глубокое исследование'), 'deep-research');
  assert.equal(normalizeId('Fast'), 'fast');
  assert.equal(normalizeId('  '), '');
});

test('matchOption is case and locale insensitive', () => {
  const options = [
    { id: 'thinking', label: 'Размышление', kind: 'toggle' },
    { id: 'fast', label: 'Быстрый', kind: 'mode' },
    { id: 'deep-research', label: 'Deep research', kind: 'tool' }
  ];
  assert.equal(matchOption(options, 'THINKING'), options[0]);
  assert.equal(matchOption(options, 'размышление'), options[0]);
  assert.equal(matchOption(options, 'быстрый'), options[1]);
  assert.equal(matchOption(options, 'deep-research'), options[2]);
  assert.equal(matchOption(options, 'missing'), null);
});
