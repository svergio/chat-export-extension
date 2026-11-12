import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOS_VERSION,
  FAQ_VERSION,
  STORAGE_KEYS,
  normalizeSettings
} from '../src/settings.js';

function installChrome(seed) {
  const store = Object.assign({}, seed || {});
  const listeners = [];
  globalThis.chrome = {
    runtime: {
      getManifest: function () {
        return { version: '0.0.0-test' };
      },
      lastError: null
    },
    storage: {
      local: {
        get(keys, cb) {
          const out = {};
          const list = Array.isArray(keys) ? keys : Object.keys(keys || {});
          for (let i = 0; i < list.length; i++) {
            const k = list[i];
            if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
          }
          cb(out);
        },
        set(obj, cb) {
          const changes = {};
          for (const k of Object.keys(obj)) {
            changes[k] = { oldValue: store[k], newValue: obj[k] };
          }
          Object.assign(store, obj);
          if (cb) cb();
          for (let i = 0; i < listeners.length; i++) listeners[i](changes, 'local');
        }
      },
      onChanged: {
        addListener(fn) {
          listeners.push(fn);
        }
      }
    },
    alarms: {
      create: function () {},
      clear: function () {},
      onAlarm: { addListener: function () {} }
    },
    tabs: {
      query: async function () {
        return [];
      },
      onUpdated: { addListener: function () {}, removeListener: function () {} },
      onRemoved: { addListener: function () {} },
      onActivated: { addListener: function () {} }
    }
  };
  return store;
}

function installFakeWebSocket(opts) {
  const openDelayMs = opts && opts.openDelayMs != null ? opts.openDelayMs : 40;
  const instances = [];
  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
      instances.push(this);
      const self = this;
      this._timer = setTimeout(function () {
        if (self.readyState !== 0) return;
        self.readyState = 1;
        if (self.onopen) self.onopen();
      }, openDelayMs);
    }
    send(data) {
      this.sent.push(data);
    }
    close() {
      if (this._timer) clearTimeout(this._timer);
      if (this.readyState === 3) return;
      this.readyState = 3;
      if (this.onclose) this.onclose();
    }
  }
  FakeWebSocket.CONNECTING = 0;
  FakeWebSocket.OPEN = 1;
  FakeWebSocket.CLOSING = 2;
  FakeWebSocket.CLOSED = 3;
  globalThis.WebSocket = FakeWebSocket;
  return instances;
}

test('isBridgeLiveAllowed requires serverOn + TOS + FAQ + apiKey', async () => {
  installChrome({});
  installFakeWebSocket({ openDelayMs: 5 });
  const bridge = await import('../src/background/bridge.js?' + Date.now() + '-gate');
  assert.equal(bridge.isBridgeLiveAllowed({ serverOn: true, tosVersion: TOS_VERSION }), false);
  assert.equal(
    bridge.isBridgeLiveAllowed({
      serverOn: true,
      tosVersion: TOS_VERSION,
      faqVersion: FAQ_VERSION,
      apiKey: 'ceb_x'
    }),
    true
  );
  assert.equal(
    bridge.isBridgeLiveAllowed({
      serverOn: false,
      tosVersion: TOS_VERSION,
      faqVersion: FAQ_VERSION,
      apiKey: 'ceb_x'
    }),
    false
  );
});

test('commitSavedSettings serverOn false must disconnect and not leave OPEN socket', async () => {
  const enabled = normalizeSettings({
    serverOn: true,
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    apiKey: 'ceb_test_gate',
    browserLabel: 'Chrome Test'
  });
  const store = installChrome({
    [STORAGE_KEYS.browserId]: 'b-test-gate',
    [STORAGE_KEYS.settings]: enabled
  });
  const instances = installFakeWebSocket({ openDelayMs: 80 });
  globalThis.fetch = async function () {
    return {
      ok: true,
      status: 200,
      json: async function () {
        return { ok: true };
      }
    };
  };

  const bridge = await import('../src/background/bridge.js?' + Date.now() + '-race');
  await bridge.startBridge();

  const deadline = Date.now() + 1000;
  while (instances.length < 1 && Date.now() < deadline) {
    await new Promise(function (resolve) {
      setTimeout(resolve, 10);
    });
  }
  assert.ok(instances.length >= 1, 'connect should open a socket while serverOn');

  const off = normalizeSettings(Object.assign({}, enabled, { serverOn: false }));
  await new Promise(function (resolve) {
    chrome.storage.local.set({ [STORAGE_KEYS.settings]: off }, resolve);
  });
  bridge.commitSavedSettings(off);
  assert.equal(bridge.getRuntimeState().settings.serverOn, false);
  assert.equal(bridge.getRuntimeState().socketState, -1);

  await new Promise(function (resolve) {
    setTimeout(resolve, 150);
  });

  for (let i = 0; i < instances.length; i++) {
    assert.notEqual(instances[i].readyState, 1, 'no OPEN orphan socket after serverOn false');
    const hellos = instances[i].sent.filter(function (raw) {
      try {
        return JSON.parse(raw).type === 'hello';
      } catch (e) {
        return false;
      }
    });
    assert.equal(hellos.length, 0, 'must not hello after bridge denied');
  }
});
