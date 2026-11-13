import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(repoRoot, 'content/minimax.js'), 'utf8');
const m = src.match(/function chatIdFromUrl\(href\) \{[\s\S]*?\n  \}/);
assert.ok(m, 'chatIdFromUrl must exist in content/minimax.js');

function loadChatIdFromUrl() {
  const location = {
    href: 'https://agent.minimax.io/',
    origin: 'https://agent.minimax.io'
  };
  // eslint-disable-next-line no-new-func
  return new Function('URL', 'location', `${m[0]}; return chatIdFromUrl;`)(URL, location);
}

test('minimax chatIdFromUrl reads /mavis?id=', () => {
  const chatIdFromUrl = loadChatIdFromUrl();
  assert.equal(
    chatIdFromUrl('https://agent.minimax.io/mavis?id=462938638667942'),
    '462938638667942'
  );
});

test('minimax chatIdFromUrl reads legacy ?chatID=', () => {
  const chatIdFromUrl = loadChatIdFromUrl();
  assert.equal(chatIdFromUrl('https://agent.minimax.io/?chatID=legacy-id'), 'legacy-id');
});

test('minimax chatIdFromUrl reads mavis session_id', () => {
  const chatIdFromUrl = loadChatIdFromUrl();
  assert.equal(
    chatIdFromUrl('https://agent.minimax.io/mavis?session_id=sess-9'),
    'sess-9'
  );
});
