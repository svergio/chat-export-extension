// save.js: direct writes into a granted folder are bounded by the runtime
// message limit (48 MB base64); exports waiting for a folder by canQueue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeChrome, tabSender } from './background-chrome-mock.js';

let saveSeq = 0;
test('save.js: a 20 MB export goes straight into a granted folder; queueing it still refuses', async () => {
  const env = makeChrome({ tabs: [1], local: { 'ce.onboarding.welcomeShown': 1 } });
  globalThis.chrome = env.chrome;
  const mod = await import('../src/background/save.js?size=' + saveSeq++);
  mod.registerSaveHandlers();
  const big = { type: 'ce-save', pack: 'single', files: [{ name: 'big.pdf', mime: 'application/pdf', b64: 'A'.repeat(20 * 1024 * 1024) }] };
  env.folder.state = 'granted';
  env.folder.name = 'Exports';
  const ok = await env.send(big, tabSender(1));
  assert.equal(ok.ok, true);
  assert.equal(ok.via, 'folder');
  const huge = { type: 'ce-save', pack: 'single', files: [{ name: 'huge.pdf', mime: 'application/pdf', b64: 'A'.repeat(49 * 1024 * 1024) }] };
  assert.equal((await env.send(huge, tabSender(1))).reason, 'too-large');
  env.folder.state = 'none';
  const queued = await env.send(big, tabSender(1));
  assert.equal(queued.reason, 'too-large-to-queue');
});
