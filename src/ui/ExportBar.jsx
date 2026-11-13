import { h, render, Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { createTranslator, resolveLocale } from '../i18n/index.js';
import { getPlatformSettings, onPlatformSettings } from '../platformGate.js';

function Chevron({ className }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2.25"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={className || 'chat-export-chevron'}
      width="16"
      height="16"
      aria-hidden="true"
    >
      <polyline points="4,6 8,10 12,6" />
    </svg>
  );
}

function FolderIcon({ off }) {
  if (off) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="chat-export-folder-icon"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path d="M3 3l18 18" />
        <path d="M19 19h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 1.172 -1.821m3.828 -.179h1l3 3h7a2 2 0 0 1 2 2v7" />
        <path d="M21 15.5v-2.5a2 2 0 0 0 -2 -2h-2" />
        <path d="M3 19v-9" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="chat-export-folder-icon"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
    </svg>
  );
}

function shiftModeOf(settings) {
  return settings && settings.saveFolder && settings.saveFolder.shiftMode === 'saveAs' ? 'saveAs' : 'rebind';
}

function cdsButtonParts(btn) {
  if (!btn || !btn.querySelector) return null;
  const paint = btn.querySelector('[data-cds-part="paint"]');
  if (!paint) return null;
  const paintWrap = paint.parentElement && paint.parentElement.tagName === 'SPAN' ? paint.parentElement : null;
  const content = Array.from(btn.children).find(
    (c) => c.tagName === 'SPAN' && c !== paintWrap && !c.querySelector('[data-cds-part="paint"]')
  );
  return {
    paintWrapClass: paintWrap ? String(paintWrap.className || '').trim() : '',
    paintClass: String(paint.className || '').trim(),
    contentClass: content
      ? String(content.className || '').trim()
      : 'inline-flex min-w-0 items-center gap-1'
  };
}

function CdsPaint({ parts }) {
  if (!parts || !parts.paintWrapClass) return null;
  return (
    <span aria-hidden="true" class={parts.paintWrapClass}>
      <span data-cds-part="paint" class={parts.paintClass || undefined} />
    </span>
  );
}

function FormatMenu({
  platform,
  scheme,
  open,
  formats,
  packMode,
  formatBtnRef,
  onToggleFormat,
  onPack,
  onClose,
  t
}) {
  const menuRef = useRef(null);
  const CE = window.ChatExport;

  useEffect(() => {
    if (!open) return undefined;
    const menu = menuRef.current;
    if (!menu) return undefined;

    function place() {
      const btn = formatBtnRef.current;
      if (!btn || !menu) return;
      const r = btn.getBoundingClientRect();
      const h = menu.offsetHeight || 160;
      const w = menu.offsetWidth || 220;
      const gap = 8;
      let left = r.left;
      if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
      if (left < 8) left = 8;
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const preferBelow = platform === 'claude' || spaceBelow >= h + gap || spaceBelow >= spaceAbove;
      let top;
      if (preferBelow && spaceBelow >= h + gap) {
        top = r.bottom + gap;
      } else if (spaceAbove >= h + gap) {
        top = r.top - h - gap;
      } else if (spaceBelow >= spaceAbove) {
        top = Math.min(r.bottom + gap, window.innerHeight - h - 8);
      } else {
        top = Math.max(8, r.top - h - gap);
      }
      menu.style.position = 'fixed';
      menu.style.left = left + 'px';
      menu.style.top = Math.max(8, top) + 'px';
      menu.style.bottom = 'auto';
      menu.style.zIndex = '2147483646';
    }

    place();
    requestAnimationFrame(place);

    function onDoc(ev) {
      const btn = formatBtnRef.current;
      if (menu.contains(ev.target) || (btn && btn.contains(ev.target))) return;
      onClose();
    }
    function onScroll() {
      place();
    }
    function onKeydown(ev) {
      if (ev.key !== 'Escape') return;
      ev.stopPropagation();
      onClose();
      const btn = formatBtnRef.current;
      if (btn && typeof btn.focus === 'function') btn.focus();
    }
    document.addEventListener('click', onDoc, true);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, formats, packMode, formatBtnRef, onClose, platform]);

  if (!open) return null;

  const ids = CE.FORMAT_IDS;
  const labels = CE.FORMAT_LABEL;

  return createPortal(
    <div
      ref={menuRef}
      class="chat-export-menu"
      data-chat-export-menu={platform}
      data-ce-scheme={scheme || 'dark'}
      role="menu"
    >
      {ids.map((value) => {
        const on = formats.indexOf(value) >= 0;
        return (
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={on ? 'true' : 'false'}
            class={'chat-export-menu-item' + (on ? ' is-active' : '')}
            data-format={value}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              onToggleFormat(value);
            }}
          >
            <span>{labels[value]}</span>
            {on ? <span class="chat-export-check" aria-hidden="true">✓</span> : null}
          </button>
        );
      })}
      <div>
        <div class="chat-export-menu-sep" />
        <div class="chat-export-pack" role="radiogroup" aria-label={t('bar.pack')}>
          {[
            { id: 'folder', label: t('bar.pack.folder') },
            { id: 'zip', label: t('bar.pack.zip') }
          ].map((spec) => (
            <button
              type="button"
              role="radio"
              aria-checked={packMode === spec.id ? 'true' : 'false'}
              class={'chat-export-pack-btn' + (packMode === spec.id ? ' is-active' : '')}
              data-pack={spec.id}
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                onPack(spec.id);
              }}
            >
              {spec.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ExportBarInner({ options }) {
  const CE = window.ChatExport;
  const platform = options.platform || 'chat';
  const formatBtnRef = useRef(null);
  const dlBtnRef = useRef(null);
  const [formats, setFormats] = useState(() => CE.loadFormats());
  const [packMode, setPackMode] = useState(() => CE.loadPack());
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [superLook, setSuperLook] = useState(false);
  const [scheme, setScheme] = useState(() =>
    typeof CE.detectHostScheme === 'function' ? CE.detectHostScheme(platform) : 'dark'
  );
  const [localeCode, setLocaleCode] = useState(() => resolveLocale(getPlatformSettings().ui.locale));
  const [shiftMode, setShiftMode] = useState(() => shiftModeOf(getPlatformSettings()));
  const [folderState, setFolderState] = useState({ state: 'none', name: null });
  const [pendingJobId, setPendingJobId] = useState(null);
  const folderBtnRef = useRef(null);
  const lastIntentRef = useRef(0);

  const t = useMemo(() => createTranslator(localeCode), [localeCode]);

  function refreshFolderStatus() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;
    chrome.runtime.sendMessage({ type: 'ce-bridge', action: 'folderStatus' }, function (resp) {
      if (chrome.runtime.lastError || !resp) return;
      setFolderState({ state: resp.state || 'none', name: resp.name || null });
    });
  }

  useEffect(() => {
    return onPlatformSettings((settings) => {
      setLocaleCode(resolveLocale(settings.ui.locale));
      setShiftMode(shiftModeOf(settings));
    });
  }, []);

  useEffect(() => {
    if (typeof CE.watchHostScheme !== 'function') return undefined;
    return CE.watchHostScheme(platform, setScheme);
  }, [platform]);

  useEffect(() => {
    refreshFolderStatus();
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return undefined;
    function onMsg(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ce-folder-changed') {
        setFolderState({ state: msg.state || 'none', name: msg.name || null });
        return;
      }
      if (msg.type === 'ce-regrant-folder') {
        setPendingJobId(msg.jobId || null);
        setFolderState((prev) => ({
          state: msg.mode === 'pick' ? 'none' : 'prompt',
          name: prev.name
        }));
        CE.showToast(CE.toastText('toast.regrant'));
        const btn = folderBtnRef.current;
        if (btn) {
          btn.classList.add('chat-export-folder--pulse');
          setTimeout(function () {
            btn.classList.remove('chat-export-folder--pulse');
          }, 2400);
        }
      }
    }
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  const nativeClass = options.nativeClass || CE.nativeButtonClass(options.nativeFrom);
  const nativeIconClass =
    options.nativeIconClass || CE.nativeButtonClass(options.nativeIconFrom) || nativeClass;
  const cdsFmt = cdsButtonParts(options.nativeFrom);
  const cdsIcon = cdsButtonParts(options.nativeIconFrom) || cdsFmt;
  let formatLabelClass = '';
  let formatChevronClass = '';
  let iconWrapClass = '';
  if (!cdsFmt && options.nativeFrom) {
    formatLabelClass = CE.firstChildClass(options.nativeFrom, 'SPAN') || '';
    const nativeSpans = options.nativeFrom.querySelectorAll(':scope > span');
    if (nativeSpans.length > 1) formatChevronClass = String(nativeSpans[1].className || '').trim();
  }
  if (!cdsIcon) {
    iconWrapClass = CE.firstChildClass(options.nativeIconFrom, 'SPAN') || '';
  }

  function resolveDownloadSvg() {
    if (typeof options.downloadSvg === 'function') return options.downloadSvg();
    if (typeof options.downloadSvg === 'string' && options.downloadSvg) return options.downloadSvg;
    return CE.downloadSvg();
  }

  function dlTitle() {
    const labels = formats.map((id) => CE.FORMAT_LABEL[id] || id).join(', ');
    const multi = formats.length > 1;
    const pack = CE.resolvePack(formats.length, packMode);
    const fmt = pack === 'file' ? labels : labels + ' (' + t(pack === 'folder' ? 'bar.pack.folder' : 'bar.pack.zip') + ')';
    return t(multi ? 'bar.dl.multi' : 'bar.dl.single')
      .replace('{fmt}', fmt)
      .replace('{shiftHint}', t(shiftMode === 'saveAs' ? 'bar.shift.saveAs' : 'bar.shift.rebind'));
  }

  useEffect(() => {
    const btn = dlBtnRef.current;
    if (!btn) return undefined;
    function onKey(ev) {
      if (!btn.matches(':hover')) return;
      setSuperLook(CE.wantsPathPicker(ev));
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, []);

  function toggleFormat(id) {
    let next = formats.slice();
    const idx = next.indexOf(id);
    if (idx >= 0) {
      if (next.length === 1) return;
      next.splice(idx, 1);
    } else {
      next.push(id);
      next = CE.normalizeFormats(next);
    }
    CE.saveFormats(next);
    setFormats(next);
  }

  function setPack(id) {
    const v = id === 'folder' ? 'folder' : 'zip';
    CE.savePack(v);
    setPackMode(v);
  }

  function pickFolder(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (busy) return;
    if (typeof window.showDirectoryPicker !== 'function') {
      chrome.runtime.sendMessage({ type: 'ce-bridge', action: 'folderPick', mode: 'pick' });
      return;
    }
    setBusy(true);
    window
      .showDirectoryPicker({ mode: 'readwrite', id: 'chat-export', startIn: 'downloads' })
      .then(function (handle) {
        return new Promise(function (resolve) {
          chrome.runtime.sendMessage(
            {
              type: 'ce-bridge',
              action: 'folderStore',
              handle: handle,
              jobId: pendingJobId || null,
              originTabId: null
            },
            function (res) {
              resolve(res || { ok: false });
            }
          );
        });
      })
      .then(function (res) {
        if (res && res.ok) {
          setPendingJobId(null);
          refreshFolderStatus();
          if (res.name) {
            CE.showToast(
              CE.toastText('toast.saved', {
                folder: res.name,
                name: (res.written && res.written[0]) || res.name
              })
            );
          }
          return;
        }
        if (res && res.reason === 'permission') {
          CE.showToast(CE.toastText('toast.regrant'));
          return;
        }
        if (!(res && res.reason === 'AbortError')) CE.showToast(CE.toastText('toast.failed'));
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        CE.showToast(CE.toastText('toast.failed'));
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function runDownload(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (busy) return;
    const now = Date.now();
    if (now - lastIntentRef.current < 400) return;
    lastIntentRef.current = now;

    const selected = formats.slice();
    const pack = CE.resolvePack(selected.length, packMode);
    const shift = CE.wantsPathPicker(ev);
    const mode = shiftModeOf(getPlatformSettings());
    const saveAs = shift && mode === 'saveAs';
    const rebind = shift && mode !== 'saveAs';

    // showSaveFilePicker/showDirectoryPicker need transient user activation: call before any await.
    let pickedPromise = Promise.resolve(null);
    if (saveAs) {
      const suggestedBase =
        (options.platform || 'chat') + '-' + CE.slugTitle(document.title || 'chat') + '-' + CE.dateStamp();
      try {
        pickedPromise = CE.openPathPicker(selected, suggestedBase, pack);
      } catch (err) {
        pickedPromise = Promise.reject(err);
      }
    }
    setMenuOpen(false);
    setBusy(true);
    Promise.all([pickedPromise, Promise.resolve().then(() => options.getData())])
      .then((pair) => {
        const picked = pair[0];
        const payload = pair[1];
        if (!payload || !payload.messages || !payload.messages.length) {
          CE.showToast(CE.toastText('toast.empty'));
          return;
        }
        const settings = getPlatformSettings();
        return CE.exportConversation({
          platform: options.platform,
          title: payload.title,
          chatId: payload.chatId,
          model: payload.model,
          userName: payload.userName,
          userHandle: payload.userHandle,
          userEmail: payload.userEmail,
          messages: payload.messages,
          formats: selected,
          pack: pack,
          picked: picked,
          rebind: rebind,
          exportSchemas: settings && settings.exportSchemas
        });
      })
      .then((res) => {
        if (res && res.pending) {
          if (res.reason === 'needs_regrant' || res.reason === 'permission' || res.reason === 'no-folder') {
            setPendingJobId(res.jobId || null);
            setFolderState((prev) => ({
              state: res.reason === 'no-folder' ? 'none' : 'prompt',
              name: prev.name
            }));
            CE.showToast(CE.toastText('toast.regrant'));
          }
          return;
        }
        if (res && res.ok && res.via === 'folder') refreshFolderStatus();
        if (res && !res.ok) {
          console.warn('[chat-export] save failed', res);
          CE.showToast(CE.toastText('toast.failed'));
        }
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        console.error('[chat-export]', err);
        CE.showToast(CE.toastText('toast.failed'));
      })
      .then(() => {
        setBusy(false);
      });
  }

  const mod = options.modifier || '';
  const barClass =
    'chat-export-bar' + (mod ? ' chat-export-bar--' + mod.replace(/\s+/g, ' chat-export-bar--') : '');
  const pillLabel = CE.formatPillLabel(formats);
  const iconHtml = resolveDownloadSvg();
  const formatBtnClass = (nativeClass || '') + (menuOpen ? ' is-open' : '');
  const dlClass = (nativeIconClass || '') + ' chat-export-dl' + (superLook ? ' is-super' : '');
  const folderNeeds =
    folderState.state === 'none' || folderState.state === 'prompt' || !!pendingJobId;
  const folderLabel = folderNeeds
    ? folderState.state === 'none'
      ? t('bar.folder.set')
      : t('bar.folder.regrant')
    : folderState.name
      ? folderState.name
      : t('bar.folder');
  const folderClass =
    'chat-export-folder' + (folderNeeds ? ' chat-export-folder--warn' : '');

  return (
    <div
      class={barClass}
      data-chat-export-bar={platform}
      data-chat-export-v={CE.EXT_VERSION}
      data-ce-scheme={scheme || 'dark'}
    >
      <button
        ref={formatBtnRef}
        type="button"
        class={('chat-export-fmt ' + formatBtnClass).trim()}
        aria-label={t('bar.format')}
        aria-haspopup="menu"
        aria-expanded={menuOpen ? 'true' : 'false'}
        onClick={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
      >
        <CdsPaint parts={cdsFmt} />
        {cdsFmt ? (
          <span class={cdsFmt.contentClass || 'inline-flex min-w-0 items-center gap-1'}>
            <span class="chat-export-format-text">{pillLabel}</span>
            <Chevron />
          </span>
        ) : (
          <>
            <span class={'chat-export-format-text' + (formatLabelClass ? ' ' + formatLabelClass : '')}>
              {pillLabel}
            </span>
            {formatChevronClass ? (
              <span class={formatChevronClass} aria-hidden="true">
                <Chevron />
              </span>
            ) : (
              <Chevron />
            )}
          </>
        )}
      </button>
      <button
        ref={folderBtnRef}
        type="button"
        class={folderClass}
        aria-label={folderLabel}
        title={folderLabel}
        disabled={busy}
        onClick={pickFolder}
      >
        <FolderIcon off={folderNeeds} />
      </button>
      <button
        ref={dlBtnRef}
        type="button"
        class={dlClass.trim()}
        aria-label={t('bar.download')}
        aria-busy={busy ? 'true' : undefined}
        disabled={busy}
        title={dlTitle()}
        onPointerEnter={(ev) => setSuperLook(CE.wantsPathPicker(ev))}
        onPointerMove={(ev) => setSuperLook(CE.wantsPathPicker(ev))}
        onPointerDown={(ev) => setSuperLook(CE.wantsPathPicker(ev))}
        onPointerLeave={() => setSuperLook(false)}
        onClick={runDownload}
      >
        <CdsPaint parts={cdsIcon} />
        {cdsIcon ? (
          <span
            class={cdsIcon.contentClass || 'inline-flex min-w-0 items-center gap-1'}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: iconHtml }}
          />
        ) : iconWrapClass ? (
          <span
            class={iconWrapClass}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: iconHtml }}
          />
        ) : (
          <span dangerouslySetInnerHTML={{ __html: iconHtml }} />
        )}
      </button>
      <FormatMenu
        platform={platform}
        scheme={scheme}
        open={menuOpen}
        formats={formats}
        packMode={packMode}
        formatBtnRef={formatBtnRef}
        onToggleFormat={toggleFormat}
        onPack={setPack}
        onClose={() => setMenuOpen(false)}
        t={t}
      />
    </div>
  );
}

export function injectBar(anchor, options) {
  if (!anchor) return null;
  const CE = window.ChatExport;
  const opts = options || {};
  const platform = opts.platform || 'chat';
  const existing = document.querySelector('[' + CE.BAR_ATTR + '="' + platform + '"]');
  if (existing) {
    const sameVer = existing.getAttribute('data-chat-export-v') === CE.EXT_VERSION;
    if (existing.isConnected && anchor.contains(existing) && sameVer) return existing;
    const host = existing.parentElement;
    existing.remove();
    if (host && host.getAttribute('data-ce-host') === platform) host.remove();
  }
  const staleMenu = document.querySelector('[data-chat-export-menu="' + platform + '"]');
  if (staleMenu) staleMenu.remove();

  const host = document.createElement('div');
  host.setAttribute('data-ce-host', platform);
  host.style.display = 'contents';

  if (opts.beforeChild && opts.beforeChild.parentNode && anchor.contains(opts.beforeChild)) {
    opts.beforeChild.parentNode.insertBefore(host, opts.beforeChild);
  } else if (opts.insertAfter && opts.insertAfter.parentNode) {
    opts.insertAfter.parentNode.insertBefore(host, opts.insertAfter.nextSibling);
  } else if (opts.placement === 'prepend') {
    anchor.insertBefore(host, anchor.firstChild);
  } else if (opts.placement === 'before' && anchor.parentNode) {
    anchor.parentNode.insertBefore(host, anchor);
  } else {
    anchor.appendChild(host);
  }

  render(h(ExportBarInner, { options: opts }), host);
  return host.querySelector('[' + CE.BAR_ATTR + '="' + platform + '"]') || host;
}
