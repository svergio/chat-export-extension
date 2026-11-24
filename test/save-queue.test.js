import test from 'node:test';
import assert from 'node:assert/strict';
import { makeChrome, tabSender, extSender, saveMsg, bridge } from './background-chrome-mock.js';

let seq = 0;
async function boot(opts) {
  const env = makeChrome(opts);
  globalThis.chrome = env.chrome;
  const mod = await import('../src/background/save.js?case=' + seq++);
  mod.registerSaveHandlers();
  return env;
}

const SEEN = { 'ce.onboarding.welcomeShown': 1 };
const jobKeys = (env) => Object.keys(env.session).filter((k) => k.indexOf('ce.job.') === 0);
const queue = (env) => env.session['ce.folderQueue'] || [];

test('exports from two tabs queue up; welcome allQueued saves both and clears the bars', async () => {
  const env = await boot({ tabs: [1, 2] });
  const a = await env.send(saveMsg('a.md'), tabSender(1));
  const b = await env.send(saveMsg('b.md'), tabSender(2));
  assert.equal(a.reason, 'no-folder');
  assert.equal(a.pending, true);
  assert.equal(b.pending, true);
  assert.equal(env.log.created.length, 1, 'welcome opens once for the first export only');
  assert.deepEqual(queue(env).map((e) => e.tabId), [1, 2]);

  env.folder.state = 'granted';
  env.folder.name = 'Exports';
  const res = await env.send(bridge('folderPicked', { allQueued: true }), extSender('welcome.html'));
  await env.settle();
  assert.equal(res.ok, true);
  assert.equal(res.saved, 2);
  assert.deepEqual(env.log.writes, ['a.md', 'b.md']);
  assert.deepEqual(queue(env), []);
  assert.deepEqual(jobKeys(env), [], 'no orphaned jobs in storage.session');
  const saved = env.log.tabMessages.filter((m) => m.msg.type === 'ce-saved');
  assert.deepEqual(saved.map((m) => [m.tabId, m.msg.jobId]), [[1, a.jobId], [2, b.jobId]]);
  for (const tabId of [1, 2]) {
    const q = env.log.tabMessages.filter((m) => m.tabId === tabId && m.msg.type === 'ce-folder-queue').pop();
    assert.equal(q && q.msg.count, 0, 'bar in tab ' + tabId + ' gets an empty queue count');
  }
});

test('allQueued from a provider tab is ignored (only extension pages drain everything)', async () => {
  const env = await boot({ tabs: [1, 2], local: SEEN });
  await env.send(saveMsg('a.md'), tabSender(1));
  await env.send(saveMsg('b.md'), tabSender(2));
  env.folder.state = 'granted';
  const res = await env.send(bridge('folderPicked', { allQueued: true }), tabSender(1));
  assert.equal(res.saved, 1);
  assert.deepEqual(queue(env).map((e) => e.tabId), [2]);
});

test('write failure requeues the rest under their origin tabs, in order, without duplicates', async () => {
  const env = await boot({ tabs: [1, 2], local: SEEN });
  await env.send(saveMsg('a.md'), tabSender(1));
  await env.send(saveMsg('b.md'), tabSender(2));
  env.folder.state = 'granted';
  env.folder.write = () => ({ ok: false, reason: 'permission' });
  const res = await env.send(bridge('folderPicked', { allQueued: true }), extSender('welcome.html'));
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'permission');
  assert.equal(res.pending, 2);
  assert.deepEqual(queue(env).map((e) => e.tabId), [1, 2], 'queue recreated after it was drained');
  assert.equal(jobKeys(env).length, 2, 'job payloads restored');

  env.folder.write = (job) => ({ ok: true, name: job.files[0].name, folder: 'Exports' });
  const again = await env.send(bridge('folderPicked', { allQueued: true }), extSender('welcome.html'));
  assert.equal(again.saved, 2);
  assert.deepEqual(jobKeys(env), []);
});

test('a throwing offscreen write requeues the job instead of losing it', async () => {
  const env = await boot({ tabs: [1], local: SEEN });
  const a = await env.send(saveMsg('a.md'), tabSender(1));
  env.folder.state = 'granted';
  env.folder.write = () => {
    throw new Error('offscreen gone');
  };
  const res = await env.send(bridge('folderPicked', { allQueued: true }), extSender('welcome.html'));
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'error');
  assert.deepEqual(queue(env).map((e) => e.id), [a.jobId]);
  assert.deepEqual(jobKeys(env), ['ce.job.' + a.jobId]);
});

test('requeue drops jobs whose origin tab is already closed', async () => {
  const env = await boot({ tabs: [1, 2], local: SEEN });
  await env.send(saveMsg('a.md'), tabSender(1));
  const b = await env.send(saveMsg('b.md'), tabSender(2));
  env.alive.delete(1); // closed without onRemoved reaching us (service worker asleep)
  env.folder.state = 'granted';
  env.folder.write = () => ({ ok: false, reason: 'permission' });
  await env.send(bridge('folderPicked', { allQueued: true }), extSender('welcome.html'));
  assert.deepEqual(queue(env).map((e) => e.id), [b.jobId]);
  assert.deepEqual(jobKeys(env), ['ce.job.' + b.jobId]);
});

test('closing a queued tab drops only its jobs', async () => {
  const env = await boot({ tabs: [1, 2], local: SEEN });
  await env.send(saveMsg('a.md'), tabSender(1));
  const b = await env.send(saveMsg('b.md'), tabSender(2));
  await env.closeTab(1);
  assert.deepEqual(queue(env).map((e) => e.id), [b.jobId]);
  assert.deepEqual(jobKeys(env), ['ce.job.' + b.jobId]);
});

test('folder popup: a stale or closed popup record never drops the queue', async () => {
  const env = await boot({ tabs: [1], local: SEEN, noBar: true });
  const a = await env.send(saveMsg('a.md'), tabSender(1));
  assert.equal(a.reason, 'no-folder');
  assert.equal(env.log.popups.length, 1, 'no bar in the tab -> folder popup');
  const popup = env.log.popups[0];
  await env.closeWindow(popup.id);
  assert.equal((await env.send(bridge('folderQueue'), extSender('folder.html'))).count, 1);

  await env.send(bridge('folderPick', { mode: 'pick' }), tabSender(1));
  assert.equal(env.log.popups.length, 2, 'a new popup is opened');
  assert.deepEqual(queue(env).map((e) => e.id), [a.jobId]);
  assert.equal(jobKeys(env).length, 1);
});

test('folder popup cancel drops the whole queue and tells the origin tab', async () => {
  const env = await boot({ tabs: [1], local: SEEN, noBar: true });
  await env.send(saveMsg('a.md'), tabSender(1));
  const res = await env.send(bridge('folderCancel'), extSender('folder.html', env.log.popups[0].tabs[0].id));
  await env.settle();
  assert.equal(res.dropped, 1);
  assert.deepEqual(jobKeys(env), []);
  const last = env.log.tabMessages.filter((m) => m.tabId === 1 && m.msg.type === 'ce-folder-queue').pop();
  assert.equal(last.msg.count, 0);
});

test('quota guard: an export too big for storage.session is not queued', async () => {
  const env = await boot({ tabs: [1], local: SEEN, sessionQuota: 200 });
  const res = await env.send(saveMsg('big.md'), tabSender(1));
  assert.deepEqual(res, { ok: false, reason: 'too-large-to-queue' });
  assert.deepEqual(jobKeys(env), []);
  assert.deepEqual(queue(env), []);
});

test('two tabs without a bar: second export opens the popup, both jobs survive and drain from welcome', async () => {
  const env = await boot({ tabs: [1, 2], noBar: true });
  const a = await env.send(saveMsg('a.md'), tabSender(1));
  const b = await env.send(saveMsg('b.md'), tabSender(2));
  assert.equal(a.reason, 'no-folder');
  assert.equal(b.reason, 'no-folder');
  assert.equal(env.log.created.length, 1, 'welcome for the first export');
  assert.equal(env.log.popups.length, 1, 'folder popup for the second (no bar to ping)');
  assert.deepEqual(queue(env).map((e) => e.id), [a.jobId, b.jobId]);

  env.folder.state = 'granted';
  const res = await env.send(bridge('folderPicked', { allQueued: true }), extSender('welcome.html'));
  assert.equal(res.ok, true);
  assert.equal(res.saved, 2);
  assert.deepEqual(env.log.writes, ['a.md', 'b.md']);
  assert.deepEqual(jobKeys(env), []);
});
