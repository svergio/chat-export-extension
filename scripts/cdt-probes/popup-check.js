() => {
  return new Promise((resolve) => {
    const skin = window.__cePopupSkin || 'chatgpt';
    const scheme = window.__cePopupScheme || 'dark';
    const locale = window.__cePopupLocale || 'en';

    function parseRgb(s) {
      if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
      const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    function lum(rgb) {
      const a = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function contrast(fg, bg) {
      const L1 = lum(fg);
      const L2 = lum(bg);
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    }
    function effectiveBg(el) {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = parseRgb(getComputedStyle(n).backgroundColor);
        if (bg) return bg;
        n = n.parentElement;
      }
      return [255, 255, 255];
    }

    chrome.storage.local.get(['ce.settings'], (got) => {
      const cur = (got && got['ce.settings']) || {};
      const ui = Object.assign({}, cur.ui || {}, { skin: skin, scheme: scheme, locale: locale });
      const next = Object.assign({}, cur, { ui: ui });
      chrome.storage.local.set({ 'ce.settings': next }, () => {
        function waitReady(attempt, done) {
          const html = document.documentElement;
          const dataSkin = html.getAttribute('data-skin');
          const dataScheme = html.getAttribute('data-scheme');
          const skinOk = skin === 'auto' || dataSkin === skin;
          const schemeOk = scheme === 'auto' ? !!dataScheme : dataScheme === scheme;
          if ((skinOk && schemeOk) || attempt >= 20) done();
          else setTimeout(() => waitReady(attempt + 1, done), 50);
        }
        waitReady(0, () => {
          const html = document.documentElement;
          const fails = [];
          const dataSkin = html.getAttribute('data-skin');
          const dataScheme = html.getAttribute('data-scheme');
          if (skin !== 'auto' && dataSkin !== skin) fails.push('data-skin=' + dataSkin + ' want ' + skin);
          if (scheme !== 'auto' && dataScheme !== scheme) fails.push('data-scheme=' + dataScheme + ' want ' + scheme);
          if (scheme === 'auto' && !dataScheme) fails.push('auto scheme unresolved');

          const toggles = Array.from(document.querySelectorAll('.ce-advanced-toggle'));
          if (toggles.length < 2) fails.push('expected 2 advanced toggles, got ' + toggles.length);
          const t0 = (toggles[0] && toggles[0].textContent) || '';
          const exportOk =
            /настройки экспорта|export settings|скрыть настройки|hide export/i.test(t0);
          if (!exportOk) fails.push('first toggle not export settings: ' + t0.slice(0, 40));

          const panel = document.querySelector('.ce-export-panel');
          if (panel && toggles[1] && !(panel.compareDocumentPosition(toggles[1]) & Node.DOCUMENT_POSITION_FOLLOWING)) {
            fails.push('export panel should precede advanced toggle');
          }

          function openDrawers() {
            Array.from(document.querySelectorAll('.ce-advanced-toggle')).forEach((t) => {
              if (!t.classList.contains('is-open')) t.click();
            });
          }
          openDrawers();

          setTimeout(() => {
            openDrawers();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            const selects = Array.from(document.querySelectorAll('.ce-select-btn')).filter(
              (b) => !b.disabled && b.getBoundingClientRect().height > 0
            );
            if (selects.length < 3) fails.push('expected >=3 selects, got ' + selects.length);
            let openCountMax = 0;
            for (let i = 0; i < selects.length; i++) {
              let open = 0;
              let menu = null;
              for (let attempt = 0; attempt < 3; attempt++) {
                const btn = document.querySelectorAll('.ce-select-btn')[i];
                if (!btn || btn.disabled) break;
                document.querySelectorAll('.ce-select.is-open').forEach((el) => {
                  const b = el.querySelector('.ce-select-btn');
                  if (b && b !== btn) b.click();
                });
                btn.click();
                open = document.querySelectorAll('.ce-select.is-open').length;
                menu = document.querySelector('.ce-select.is-open .ce-select-menu');
                if (open === 1 && menu && menu.querySelectorAll('.ce-select-item').length) break;
              }
              if (open > openCountMax) openCountMax = open;
              if (open !== 1) fails.push('select open count ' + open + ' at idx ' + i);
              if (!menu || !menu.querySelectorAll('.ce-select-item').length) {
                fails.push('empty select menu at idx ' + i);
              }
            }
            if (selects.length) {
              const last = document.querySelectorAll('.ce-select-btn')[selects.length - 1];
              if (last) last.click();
              const still = document.querySelectorAll('.ce-select.is-open').length;
              if (still > 1) fails.push('re-click did not collapse');
            }

            const bodyText = document.body ? document.body.innerText || '' : '';
            if (
              /\b(label\.|btn\.|saveFolder\.|schema\.|shiftMode\.|hint\.|section\.|skin\.|lang\.|format\.|bar\.|toast\.|folderPage\.)[a-z0-9_.]+/i.test(
                bodyText
              )
            ) {
              fails.push('raw i18n keys in body');
            }

            const scrollOverflow =
              document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
            if (scrollOverflow) fails.push('horizontal scroll');

            let minContrast = 99;
            const buttons = Array.from(document.querySelectorAll('button:not([disabled])')).filter((b) => {
              const r = b.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
            for (const b of buttons) {
              const fg = parseRgb(getComputedStyle(b).color);
              const bg = effectiveBg(b);
              if (!fg) continue;
              const c = contrast(fg, bg);
              if (c < minContrast) minContrast = c;
              if (c <= 1.05) {
                fails.push(
                  'contrast fail ' + c.toFixed(2) + ' on ' + (b.textContent || '').trim().slice(0, 24)
                );
              }
            }

            resolve({
              ok: fails.length === 0,
              fails: fails.slice(0, 8),
              skin: skin,
              scheme: scheme,
              locale: locale,
              dataSkin: dataSkin,
              dataScheme: dataScheme,
              selects: selects.length,
              openCountMax: openCountMax,
              minContrast: Math.round(minContrast * 100) / 100
            });
          }, 250);
        });
      });
    });
  });
}
