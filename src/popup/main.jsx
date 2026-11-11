import { h, render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  FAQ_VERSION,
  PLATFORMS,
  DEFAULT_SETTINGS,
  hasFaqConsent,
  normalizeSettings,
  resolveUiScheme
} from '../settings.js';
import { createTranslator, faqKeys, resolveLocale } from '../i18n/index.js';
import {
  SKIN_OPTIONS,
  SCHEME_OPTIONS,
  LOCALE_OPTIONS,
  PLATFORM_ICONS,
  IconChevron
} from './skin-icons.jsx';

function statusState(status) {
  return (status && status.state) || 'offline';
}

function statusTone(status) {
  const state = statusState(status);
  if (state === 'connected') return 'ok';
  if (state === 'connecting') return 'warn';
  if (state === 'auth_failed') return 'danger';
  return 'muted';
}

function sendBridge(action, extra) {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage(Object.assign({ type: 'ce-bridge', action: action }, extra || {}), function (res) {
      void chrome.runtime.lastError;
      resolve(res || { ok: false });
    });
  });
}

function usePrefersDark() {
  const [dark, setDark] = useState(function () {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(function () {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange(ev) {
      setDark(!!ev.matches);
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    setDark(!!mq.matches);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return dark;
}

function applyDocumentTheme(skin, scheme, prefersDark) {
  const resolved = resolveUiScheme(scheme, prefersDark);
  const root = document.documentElement;
  root.dataset.skin = skin || 'chatgpt';
  root.dataset.scheme = resolved;
  root.style.colorScheme = resolved;
}

function Switch({ on, disabled, onClick, label, onLabel, offLabel }) {
  return (
    <button
      type="button"
      class={'ce-switch' + (on ? ' is-on' : '')}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
    >
      <span class="ce-switch-track" aria-hidden="true">
        <span class="ce-switch-knob" />
      </span>
      <span class="ce-switch-label">{on ? onLabel : offLabel}</span>
    </button>
  );
}

function SelectMenu({ label, valueLabel, leading, open, setOpen, disabled, children, ariaLabel }) {
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function onDoc(ev) {
      if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
    }
    function onKey(ev) {
      if (ev.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, setOpen]);

  return (
    <div class="ce-row ce-select-row" ref={rootRef}>
      <span>{label}</span>
      <div class={'ce-select' + (open ? ' is-open' : '')}>
        <button
          type="button"
          class="ce-select-btn"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open ? 'true' : 'false'}
          aria-label={ariaLabel || label}
          onClick={() => setOpen(!open)}
        >
          {leading ? <span class="ce-select-leading">{leading}</span> : null}
          <span class="ce-select-value">{valueLabel}</span>
          <IconChevron size={12} />
        </button>
        {open ? (
          <div class="ce-select-menu" role="listbox" aria-label={ariaLabel || label}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusDot({ status, label }) {
  const tone = statusTone(status);
  const detail = status && status.detail ? String(status.detail) : '';
  const title = detail ? label + ' — ' + detail : label;
  return (
    <span
      class={'ce-dot ce-dot--' + tone}
      role="status"
      aria-label={label}
      title={title}
    />
  );
}

function ToneLine({ tone, text }) {
  if (!text) return null;
  return <p class={'ce-tone ce-tone--' + (tone || 'muted')}>{text}</p>;
}

function AdvancedFaqConsent({ consented, onConsent, busy, t }) {
  const [checked, setChecked] = useState(false);
  if (consented) return null;
  return (
    <div class="ce-faq-compact">
      <p class="ce-lead">{t('faq.lead')}</p>
      <ul>
        {faqKeys().map(function (key) {
          return <li key={key}>{t(key)}</li>;
        })}
      </ul>
      <label class="ce-check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
        <span>{t('faq.agree')}</span>
      </label>
      <button
        type="button"
        class="ce-btn ce-btn--primary"
        disabled={!checked || busy}
        onClick={() => onConsent()}
      >
        {t('btn.continue')}
      </button>
    </div>
  );
}

function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(normalizeSettings(DEFAULT_SETTINGS));
  const [status, setStatus] = useState({ state: 'offline', detail: '' });
  const [browserId, setBrowserId] = useState('');
  const [tone, setTone] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [skinOpen, setSkinOpen] = useState(false);
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const prefersDark = usePrefersDark();

  const ui = settings.ui || { skin: 'chatgpt', scheme: 'auto', locale: 'auto' };
  const localeCode = resolveLocale(ui.locale);
  const t = useMemo(() => createTranslator(localeCode), [localeCode]);

  const refresh = useCallback(async () => {
    const res = await sendBridge('getState');
    if (res && res.ok) {
      setSettings(normalizeSettings(res.settings));
      setStatus(res.status || { state: 'offline' });
      setBrowserId(res.browserId || '');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onChanged = (changes, area) => {
      if (area !== 'local') return;
      if (changes['ce.bridgeStatus'] && changes['ce.bridgeStatus'].newValue) {
        setStatus(changes['ce.bridgeStatus'].newValue);
      }
      if (changes['ce.settings'] && changes['ce.settings'].newValue) {
        setSettings(normalizeSettings(changes['ce.settings'].newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  useEffect(() => {
    applyDocumentTheme(ui.skin, ui.scheme, prefersDark);
  }, [ui.skin, ui.scheme, prefersDark]);

  async function persist(next) {
    const normalized = normalizeSettings(next);
    if (normalized.serverOn && !hasFaqConsent(normalized)) normalized.serverOn = false;
    setSettings(normalized);
    setBusy(true);
    await sendBridge('saveSettings', { settings: normalized });
    setBusy(false);
    const st = await sendBridge('getState');
    if (st && st.status) setStatus(st.status);
  }

  async function onConsent() {
    setBusy(true);
    const ensured = await sendBridge('ensureKey');
    const base = Object.assign({}, settings, {
      faqVersion: FAQ_VERSION,
      apiKey: (ensured && ensured.settings && ensured.settings.apiKey) || settings.apiKey
    });
    await persist(base);
    setBusy(false);
  }

  async function onGenerateKey() {
    setBusy(true);
    setTone({ kind: 'muted', text: '' });
    const res = await sendBridge('rotateKey');
    setBusy(false);
    if (res && res.ok) {
      setSettings(normalizeSettings(res.settings));
      setTone({ kind: 'ok', text: t('key.generated') });
    } else {
      setTone({ kind: 'danger', text: (res && res.detail) || t('key.generateFailed') });
    }
  }

  async function onCopyKey() {
    const key = (settings.apiKey || '').trim();
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setTone({ kind: 'ok', text: t('key.copied') });
    } catch (e) {
      setTone({ kind: 'danger', text: t('key.copyFailed') });
    }
  }

  async function onTest() {
    setTone({ kind: 'muted', text: t('test.testing') });
    setBusy(true);
    await sendBridge('ensureKey');
    const res = await sendBridge('testConnection');
    setBusy(false);
    if (res && res.ok) setTone({ kind: 'ok', text: t('test.ok') });
    else setTone({ kind: 'danger', text: (res && res.detail) || t('test.fail') });
    await refresh();
  }

  function setUi(patch) {
    const nextUi = Object.assign({}, settings.ui || {}, patch);
    persist(Object.assign({}, settings, { ui: nextUi }));
  }

  function closeMenusExcept(which) {
    setSkinOpen(which === 'skin');
    setSchemeOpen(which === 'scheme');
    setLocaleOpen(which === 'locale');
  }

  if (!ready) {
    return <div class="ce-wrap">{t('app.loading')}</div>;
  }

  const consented = hasFaqConsent(settings);
  const statusLabel = t('status.' + statusState(status));
  const skinOpt = SKIN_OPTIONS.find((o) => o.id === ui.skin) || SKIN_OPTIONS[0];
  const SkinIcon = skinOpt.Icon;
  const gatewayOn = !!settings.serverOn;

  return (
    <div class="ce-wrap">
      <section class="ce-card">
        <header class="ce-head">
          <h1>{t('app.title')}</h1>
          {gatewayOn ? <StatusDot status={status} label={statusLabel} /> : null}
        </header>

        <h2>{t('label.platforms')}</h2>
        <div class="ce-platforms">
          {PLATFORMS.map(function (id) {
            const on = settings.platforms[id] !== false;
            const label = t('platform.' + id);
            const PlatIcon = PLATFORM_ICONS[id];
            return (
              <label key={id} class="ce-row">
                <span class="ce-platform-label">
                  {PlatIcon ? <PlatIcon size={14} /> : null}
                  {label}
                </span>
                <Switch
                  on={on}
                  disabled={busy}
                  label={label}
                  onLabel={t('label.on')}
                  offLabel={t('label.off')}
                  onClick={() => {
                    const platforms = Object.assign({}, settings.platforms, { [id]: !on });
                    persist(Object.assign({}, settings, { platforms: platforms }));
                  }}
                />
              </label>
            );
          })}
        </div>

        <div class="ce-appearance">
          <SelectMenu
            label={t('label.style')}
            ariaLabel={t('label.style')}
            disabled={busy}
            open={skinOpen}
            setOpen={(v) => (v ? closeMenusExcept('skin') : setSkinOpen(false))}
            leading={<SkinIcon size={15} />}
            valueLabel={t('skin.' + skinOpt.id)}
          >
            {SKIN_OPTIONS.map(function (opt) {
              const active = ui.skin === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active ? 'true' : 'false'}
                  class={'ce-select-item' + (active ? ' is-active' : '')}
                  onClick={() => {
                    setUi({ skin: opt.id });
                    setSkinOpen(false);
                  }}
                >
                  <opt.Icon size={15} />
                  <span>{t('skin.' + opt.id)}</span>
                </button>
              );
            })}
          </SelectMenu>

          <SelectMenu
            label={t('label.theme')}
            ariaLabel={t('label.theme')}
            disabled={busy}
            open={schemeOpen}
            setOpen={(v) => (v ? closeMenusExcept('scheme') : setSchemeOpen(false))}
            valueLabel={t('theme.' + (ui.scheme || 'auto'))}
          >
            {SCHEME_OPTIONS.map(function (opt) {
              const active = ui.scheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active ? 'true' : 'false'}
                  class={'ce-select-item' + (active ? ' is-active' : '')}
                  onClick={() => {
                    setUi({ scheme: opt.id });
                    setSchemeOpen(false);
                  }}
                >
                  <span>{t('theme.' + opt.id)}</span>
                </button>
              );
            })}
          </SelectMenu>

          <SelectMenu
            label={t('label.language')}
            ariaLabel={t('label.language')}
            disabled={busy}
            open={localeOpen}
            setOpen={(v) => (v ? closeMenusExcept('locale') : setLocaleOpen(false))}
            valueLabel={t('lang.' + (ui.locale || 'auto'))}
          >
            {LOCALE_OPTIONS.map(function (opt) {
              const active = (ui.locale || 'auto') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active ? 'true' : 'false'}
                  class={'ce-select-item' + (active ? ' is-active' : '')}
                  onClick={() => {
                    setUi({ locale: opt.id });
                    setLocaleOpen(false);
                  }}
                >
                  <span>{t('lang.' + opt.id)}</span>
                </button>
              );
            })}
          </SelectMenu>
        </div>

        <button
          type="button"
          class={'ce-advanced-toggle' + (advancedOpen ? ' is-open' : '')}
          aria-expanded={advancedOpen ? 'true' : 'false'}
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          <IconChevron size={12} />
          <span>{advancedOpen ? t('btn.hideAdvanced') : t('btn.showAdvanced')}</span>
        </button>

        {advancedOpen ? (
          <div class="ce-advanced-panel">
            <AdvancedFaqConsent consented={consented} onConsent={onConsent} busy={busy} t={t} />

            <label class="ce-row">
              <span>{t('label.gateway')}</span>
              <Switch
                on={settings.serverOn}
                disabled={busy || !consented}
                label={t('label.gateway')}
                onLabel={t('label.on')}
                offLabel={t('label.off')}
                onClick={async () => {
                  if (!consented) return;
                  const turningOn = !settings.serverOn;
                  let next = Object.assign({}, settings, { serverOn: turningOn });
                  if (turningOn) {
                    const ensured = await sendBridge('ensureKey');
                    if (ensured && ensured.settings) {
                      next = Object.assign({}, next, ensured.settings, { serverOn: true });
                    }
                  }
                  await persist(next);
                }}
              />
            </label>

            <div class="ce-host-port">
              <label class="ce-field">
                <span>{t('label.host')}</span>
                <input
                  type="text"
                  spellcheck={false}
                  value={settings.host}
                  placeholder="127.0.0.1"
                  onChange={(e) =>
                    setSettings(Object.assign({}, settings, { host: e.currentTarget.value }))
                  }
                  onBlur={() => persist(settings)}
                />
              </label>
              <label class="ce-field">
                <span>{t('label.port')}</span>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={settings.port}
                  placeholder="8765"
                  onChange={(e) =>
                    setSettings(
                      normalizeSettings(
                        Object.assign({}, settings, { port: Number(e.currentTarget.value) })
                      )
                    )
                  }
                  onBlur={() => persist(settings)}
                />
              </label>
            </div>

            <label class="ce-field">
              <span>{t('label.browserLabel')}</span>
              <input
                type="text"
                value={settings.browserLabel}
                onChange={(e) =>
                  setSettings(Object.assign({}, settings, { browserLabel: e.currentTarget.value }))
                }
                onBlur={() => persist(settings)}
              />
            </label>

            <label class="ce-field">
              <span>{t('label.browserId')}</span>
              <input type="text" readOnly spellcheck={false} value={browserId || '—'} />
              <p class="ce-hint">{t('browser.hint')}</p>
            </label>

            <div class="ce-field">
              <span>{t('label.gatewayToken')}</span>
              <input
                type="text"
                autocomplete="off"
                spellcheck={false}
                readOnly
                value={settings.apiKey}
                placeholder={t('key.placeholder')}
              />
              <div class="ce-actions ce-actions--tight">
                <button type="button" class="ce-btn" disabled={busy || !consented} onClick={onGenerateKey}>
                  {settings.apiKey ? t('btn.rotate') : t('btn.generate')}
                </button>
                <button
                  type="button"
                  class="ce-btn"
                  disabled={busy || !settings.apiKey.trim()}
                  onClick={onCopyKey}
                >
                  {t('btn.copy')}
                </button>
              </div>
              <p class="ce-hint">
                {t('key.hint')}
                {browserId ? ' ' + t('key.hintId') + ' ' + browserId : ''}
              </p>
            </div>

            <div class="ce-test-row">
              <button
                type="button"
                class="ce-btn ce-btn--solid"
                disabled={busy || !consented}
                onClick={onTest}
              >
                {t('test.connection')}
              </button>
              <ToneLine tone={tone.kind} text={tone.text} />
            </div>

            <h2>{t('label.permissions')}</h2>

            <label class="ce-row">
              <span>{t('label.allowCreate')}</span>
              <Switch
                on={settings.allowCreate}
                disabled={busy}
                label={t('label.allowCreate')}
                onLabel={t('label.on')}
                offLabel={t('label.off')}
                onClick={() =>
                  persist(Object.assign({}, settings, { allowCreate: !settings.allowCreate }))
                }
              />
            </label>

            <label class="ce-row">
              <span>{t('label.allowProjects')}</span>
              <Switch
                on={settings.allowProjects}
                disabled={busy}
                label={t('label.allowProjects')}
                onLabel={t('label.on')}
                offLabel={t('label.off')}
                onClick={() =>
                  persist(Object.assign({}, settings, { allowProjects: !settings.allowProjects }))
                }
              />
            </label>

            <label class="ce-row">
              <span>{t('label.destructive')}</span>
              <Switch
                on={settings.allowDestructive}
                disabled={busy}
                label={t('label.destructive')}
                onLabel={t('label.on')}
                offLabel={t('label.off')}
                onClick={() =>
                  persist(Object.assign({}, settings, { allowDestructive: !settings.allowDestructive }))
                }
              />
            </label>

            <label class="ce-field">
              <span>{t('label.rpcTimeout')}</span>
              <input
                type="number"
                min="5"
                max="600"
                value={settings.rpcTimeoutS}
                onChange={(e) =>
                  setSettings(
                    normalizeSettings(
                      Object.assign({}, settings, { rpcTimeoutS: Number(e.currentTarget.value) })
                    )
                  )
                }
                onBlur={() => persist(settings)}
              />
            </label>

            <details class="ce-more">
              <summary>{t('label.faq')}</summary>
              <ul>
                {faqKeys().map(function (key) {
                  return <li key={key}>{t(key)}</li>;
                })}
              </ul>
            </details>

          </div>
        ) : null}
      </section>
    </div>
  );
}

render(<App />, document.getElementById('app'));
