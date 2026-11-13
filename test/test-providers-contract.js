import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORMS } from '../src/settings.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bridgeSrc = readFileSync(join(root, 'src/background/bridge.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const RPC_CODES = readFileSync(join(root, 'src/rpc.js'), 'utf8');

const REQUIRED_OPS = ['list', 'get', 'create', 'send', 'delete'];
const START_RE = /const PLATFORM_START = \{([^}]+)\}/s;
const CONTENT_RE = /const PLATFORM_CONTENT = \{([^}]+)\}/s;

test('bridge registers all platforms with start URLs and content bundles', () => {
  const startBlock = START_RE.exec(bridgeSrc);
  assert.ok(startBlock, 'PLATFORM_START');
  for (const id of PLATFORMS) {
    assert.match(startBlock[1], new RegExp(`['"]?${id.replace('-', '\\-')}['"]?\\s*:`), `${id} start url`);
    assert.match(startBlock[1], /https?:\/\//, `${id} https url`);
  }
  const contentBlock = CONTENT_RE.exec(bridgeSrc);
  assert.ok(contentBlock, 'PLATFORM_CONTENT');
  for (const id of PLATFORMS) {
    assert.match(contentBlock[1], new RegExp(`['"]?${id.replace('-', '\\-')}['"]?\\s*:`), `${id} content`);
    assert.match(contentBlock[1], /content\//, `${id} content script path`);
  }
});

test('bridge handles tabs.ensure as light op without content rpc', () => {
  assert.match(bridgeSrc, /op === ['"]tabs\.ensure['"]/);
  assert.match(bridgeSrc, /created:\s*!!ensured\.created/);
  assert.match(bridgeSrc, /return \{\s*tabId:\s*tab\.id,\s*created:\s*true\s*\}/);
  const ensureIdx = bridgeSrc.indexOf("op === 'tabs.ensure'");
  const contentRpcIdx = bridgeSrc.indexOf('CONTENT_RPC_TYPE', ensureIdx);
  assert.ok(ensureIdx > 0, 'tabs.ensure branch');
  assert.ok(contentRpcIdx > ensureIdx, 'content rpc after light branch');
  const lightSlice = bridgeSrc.slice(ensureIdx, contentRpcIdx);
  assert.doesNotMatch(lightSlice, /sendMessageAsync/);
  assert.match(lightSlice, /ensurePlatformTab/);
  assert.match(lightSlice, /scheduleTabsSync/);
});

test('manifest host_permissions cover provider origins', () => {
  const hosts = manifest.host_permissions || [];
  const need = [
    'chatgpt.com',
    'grok.com',
    'x.com',
    'claude.ai',
    'github.com',
    'chat.qwen.ai',
    'perplexity.ai',
    'deepseek.com',
    'kimi.com',
    'chat.z.ai',
    'agent.minimax.io',
    'janitorai.com'
  ];
  for (const fragment of need) {
    assert.ok(hosts.some((h) => h.includes(fragment)), `missing host ${fragment}`);
  }
});

test('content scripts define platform ops and error codes', () => {
  for (const id of PLATFORMS) {
    const file = join(root, 'content', `${id}.js`);
    const src = readFileSync(file, 'utf8');
    assert.match(src, /definePlatform\s*\(/, `${id} definePlatform`);
    assert.match(src, /ops\s*:\s*\{/, `${id} ops`);
    for (const op of REQUIRED_OPS) {
      assert.match(src, new RegExp(`${op}\\s*:`), `${id} op ${op}`);
    }
    assert.match(src, /rpcErr\s*\(\s*['"]HOST_ERROR['"]/, `${id} HOST_ERROR`);
    assert.match(src, /rpcErr\s*\(\s*['"]UNAUTHORIZED['"]/, `${id} UAUTHORIZED`);
  }
  assert.match(RPC_CODES, /OPTION_LOCKED/, 'OPTION_LOCKED in rpc.js');
});

test('qwen deepseek perplexity exportData hooks present', () => {
  for (const id of ['qwen', 'deepseek', 'perplexity']) {
    const src = readFileSync(join(root, 'content', `${id}.js`), 'utf8');
    assert.match(src, /exportData\s*:/, `${id} exportData`);
  }
});
