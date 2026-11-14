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

function installWelcomeWebSocket(welcomeBrowserId) {
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
      }, 10);
    }
    send(data) {
      this.sent.push(data);
      const self = this;
      let frame;
      try {
        frame = JSON.parse(data);
      } catch (e) {
        return;
      }
      if (frame && frame.type === 'hello') {
        setTimeout(function () {
          if (self.onmessage) {
            self.onmessage({
              data: JSON.stringify({
                type: 'welcome',
                browserId: welcomeBrowserId || frame.browserId,
                serverVersion: 'test-server'
              })
            });
          }
        }, 5);
      }
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

test('testConnection returns browserId from welcome', async () => {
  const settings = normalizeSettings({
    serverOn: false,
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    apiKey: 'ceb_test_ping',
    browserLabel: 'Ping Lab',
    host: '127.0.0.1',
    port: 8765
  });
  installChrome({
    [STORAGE_KEYS.browserId]: 'b-local-id',
    [STORAGE_KEYS.settings]: settings
  });
  installWelcomeWebSocket('b-from-server');
  globalThis.fetch = async function () {
    return {
      ok: true,
      status: 200,
      json: async function () {
        return { ok: true, browserId: 'b-from-server' };
      }
    };
  };

  const bridge = await import('../src/background/bridge.js?' + Date.now() + '-ping');
  await bridge.startBridge();
  const res = await bridge.testConnection();
  assert.equal(res.ok, true);
  assert.equal(res.browserId, 'b-from-server');
  assert.equal(res.state, 'connected');
});

test('testConnection falls back to local browserId if welcome omits it', async () => {
  const settings = normalizeSettings({
    serverOn: false,
    tosVersion: TOS_VERSION,
    faqVersion: FAQ_VERSION,
    apiKey: 'ceb_test_ping2',
    browserLabel: 'Ping Lab 2',
    host: '127.0.0.1',
    port: 8765
  });
  installChrome({
    [STORAGE_KEYS.browserId]: 'b-fallback-id',
    [STORAGE_KEYS.settings]: settings
  });
  const instances = installWelcomeWebSocket('');
  // Override send reply to omit browserId
  const Prev = globalThis.WebSocket;
  globalThis.WebSocket = class extends Prev {
    send(data) {
      this.sent.push(data);
      const self = this;
      setTimeout(function () {
        if (self.onmessage) {
          self.onmessage({
            data: JSON.stringify({ type: 'welcome', serverVersion: 'x' })
          });
        }
      }, 5);
    }
  };
  globalThis.fetch = async function () {
    return {
      ok: true,
      status: 200,
      json: async function () {
        return { ok: true };
      }
    };
  };

  const bridge = await import('../src/background/bridge.js?' + Date.now() + '-ping-fb');
  await bridge.startBridge();
  const res = await bridge.testConnection();
  assert.equal(res.ok, true);
  assert.equal(res.browserId, 'b-fallback-id');
  assert.ok(instances);
});
