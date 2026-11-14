() => {
  return new Promise((resolve) => {
    const fails = [];
    const FAKE_KEY = 'ceb_cdt_gateway_mask_test_key_abcdef0123456789';

    function openAdvanced() {
      Array.from(document.querySelectorAll('.ce-advanced-toggle')).forEach((t) => {
        if (!t.classList.contains('is-open')) t.click();
      });
    }

    function byAria(re) {
      return Array.from(document.querySelectorAll('button.ce-icon-btn')).find((b) =>
        re.test(b.getAttribute('aria-label') || '')
      );
    }

    function readGateway() {
      openAdvanced();
      const host = document.getElementById('ce-host');
      const port = document.getElementById('ce-port');
      const label = document.getElementById('ce-browser-label');
      const id = document.getElementById('ce-browser-id');
      const token = document.getElementById('ce-gateway-token');
      const tokenBox = document.querySelector('.ce-token-box');
      const updateBtn = byAria(/обновить конфигурацию|update configuration/i);
      const pingBtn = byAria(/^ping$/i);
      const rotateBtn = byAria(/rotate|сменить|generate|создать/i);
      const copyBtn = byAria(/copy|копир/i);
      return { host, port, label, id, token, tokenBox, updateBtn, pingBtn, rotateBtn, copyBtn };
    }

    function assertStructure(g) {
      if (!g.host) fails.push('missing #ce-host');
      if (!g.port) fails.push('missing #ce-port');
      if (!g.label) fails.push('missing #ce-browser-label');
      if (!g.id) fails.push('missing #ce-browser-id');
      if (!g.token) fails.push('missing #ce-gateway-token');
      if (!g.tokenBox) fails.push('missing .ce-token-box');
      if (!g.updateBtn) fails.push('missing Update configuration icon');
      if (!g.pingBtn) fails.push('missing Ping icon');
      if (!g.rotateBtn) fails.push('missing rotate icon button');
      if (!g.copyBtn) fails.push('missing copy icon button');
      if (g.updateBtn && !g.updateBtn.closest('.ce-gateway-controls')) {
        fails.push('Update config icon not beside gateway switch');
      }
      if (g.pingBtn && !g.pingBtn.closest('.ce-gateway-controls')) {
        fails.push('Ping icon not beside gateway switch');
      }
      if (g.rotateBtn && !g.rotateBtn.closest('.ce-token-box')) {
        fails.push('rotate icon not inside token box');
      }
      if (g.copyBtn && !g.copyBtn.closest('.ce-token-box')) {
        fails.push('copy icon not inside token box');
      }

      if (g.token) {
        if (!g.token.classList.contains('ce-token-mask')) fails.push('token missing ce-token-mask');
        if (g.token.tagName === 'INPUT') fails.push('token must not be an input');
        const shown = String(g.token.textContent || g.token.value || '').trim();
        if (!shown) fails.push('token preview empty');
        if (shown.indexOf('…') < 0 && /ceb_[0-9a-f]{20,}/i.test(shown)) {
          fails.push('token shows full-looking key');
        }
        if (!/^ceb_/i.test(shown) && shown.indexOf('…') < 0) {
          fails.push('token preview should show ceb_ head or ellipsis');
        }
      }

      if (g.id) {
        if (g.id.tagName === 'INPUT') fails.push('browser id must not be an input');
        if (!g.id.classList.contains('ce-readonly-value')) fails.push('browser id missing ce-readonly-value');
      }

      const legacyText = Array.from(document.querySelectorAll('button')).some((b) => {
        const t = (b.textContent || '').trim();
        return /проверить соединение|test connection|обновить конфигурацию|update configuration|^ping$/i.test(
          t
        );
      });
      if (legacyText) fails.push('legacy text gateway action buttons still present');
    }

    function assertUnlocked(g) {
      if (g.host && g.host.disabled) fails.push('host disabled while gateway off');
      if (g.port && g.port.disabled) fails.push('port disabled while gateway off');
      if (g.label && g.label.disabled) fails.push('label disabled while gateway off');
      if (g.updateBtn && g.updateBtn.disabled) fails.push('Update config disabled while gateway off');
      if (g.pingBtn && g.pingBtn.disabled) fails.push('Ping disabled while gateway off');
      if (g.rotateBtn && g.rotateBtn.disabled) fails.push('rotate disabled while gateway off');
      if (g.copyBtn && g.copyBtn.disabled) fails.push('copy disabled while gateway off (unexpected)');
    }

    function assertLocked(g) {
      if (g.host && !g.host.disabled) fails.push('host editable while gateway on');
      if (g.port && !g.port.disabled) fails.push('port editable while gateway on');
      if (g.label && !g.label.disabled) fails.push('label editable while gateway on');
      if (g.updateBtn && !g.updateBtn.disabled) fails.push('Update config enabled while gateway on');
      if (g.pingBtn && !g.pingBtn.disabled) fails.push('Ping enabled while gateway on');
      if (g.rotateBtn && !g.rotateBtn.disabled) fails.push('rotate enabled while gateway on');
      if (g.copyBtn && g.copyBtn.disabled) fails.push('copy must stay enabled while gateway on');
      if (g.host) {
        const op = Number(getComputedStyle(g.host).opacity);
        if (!(op < 0.75)) fails.push('host opacity not visually inactive when locked (' + op + ')');
      }
    }

    function patchSettings(patch, done) {
      chrome.storage.local.get(['ce.settings'], (got) => {
        const cur = (got && got['ce.settings']) || {};
        const next = Object.assign({}, cur, patch);
        chrome.storage.local.set({ 'ce.settings': next }, done);
      });
    }

    chrome.storage.local.get(['ce.settings'], (got) => {
      const cur = (got && got['ce.settings']) || {};
      const seeded = Object.assign({}, cur, {
        tosVersion: Math.max(Number(cur.tosVersion) || 0, 1),
        faqVersion: Math.max(Number(cur.faqVersion) || 0, 2),
        apiKey: typeof cur.apiKey === 'string' && cur.apiKey.trim() ? cur.apiKey : FAKE_KEY,
        serverOn: false,
        host: cur.host || '127.0.0.1',
        port: cur.port || 8765,
        browserLabel: cur.browserLabel || 'CDT Gateway'
      });
      chrome.storage.local.set({ 'ce.settings': seeded }, () => {
        setTimeout(() => {
          openAdvanced();
          setTimeout(() => {
            const unlocked = readGateway();
            assertStructure(unlocked);
            assertUnlocked(unlocked);

            patchSettings({ serverOn: true }, () => {
              setTimeout(() => {
                openAdvanced();
                const locked = readGateway();
                assertStructure(locked);
                assertLocked(locked);
                const hostDisabledOn = locked.host ? !!locked.host.disabled : null;
                const copyEnabledOn = locked.copyBtn ? !locked.copyBtn.disabled : null;
                const tokenShown = locked.token
                  ? String(locked.token.textContent || '').trim()
                  : '';
                const tokenMasked =
                  !!tokenShown && tokenShown.includes('…') && !tokenShown.includes('ceb_b8bfc5d4383f88');
                const hostOpacity = locked.host ? Number(getComputedStyle(locked.host).opacity) : null;

                patchSettings({ serverOn: false }, () => {
                  setTimeout(() => {
                    openAdvanced();
                    const restored = readGateway();
                    assertUnlocked(restored);
                    resolve({
                      ok: fails.length === 0,
                      fails: fails.slice(0, 12),
                      hasPing: !!restored.pingBtn,
                      hasUpdate: !!restored.updateBtn,
                      tokenMasked: tokenMasked,
                      hostDisabledOn: hostDisabledOn,
                      copyEnabledOn: copyEnabledOn,
                      hostOpacity: hostOpacity
                    });
                  }, 280);
                });
              }, 280);
            });
          }, 180);
        }, 180);
      });
    });
  });
}
