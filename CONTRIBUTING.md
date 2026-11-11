# Contributing to Chat Export

Stack layout under the maintainer tree `projects/Chat Export/`:

| Repo | Path |
|------|------|
| Extension | `chat-export-extension/` |
| Server | `chat-export-server/` |
| Dashboard | `chat-export-dashboard/` |
| Shared docs | `docs/` (platforms, site-maps, acceptance) |
| Wiki (GitHub) | `chat-export-extension.wiki/` clone |

No `Co-authored-by` trailers in commits. Open PRs against `main`; use branch `test` only for CI/test work per repo policy.

Extended wiki: [Contributing](https://github.com/svergio/chat-export-extension/wiki/Contributing).

## Add a new chat platform (provider)

Pick a stable **platform id** (lowercase, hyphenated if needed, e.g. `grok-x`). The same string must appear everywhere below.

### Step-by-step

1. **Research** — capture DOM selectors and flows in `docs/site-maps/<host>.md` (see existing `grok.com.md`, `claude.ai.md`).
2. **Protocol** — add the id to `PLATFORMS` in `chat-export-server/packages/protocol/src/constants.js`; extend JSON Schema enums if needed (`schema.js`). Run server `npm run build` so `packages/protocol` is consumed.
3. **Extension content script** — implement `CE.definePlatform({ id, hosts, ops, … })` in `chat-export-extension/content/<id>.js` (mirror `content/chatgpt.js`, `content/grok-x.js`).
4. **Extension manifest** — add `host_permissions`, `content_scripts` `matches`, and `web_accessible_resources` entries in `manifest.json` (narrow patterns; avoid whole-site wildcards unless required).
5. **Shared UI** — bar/modifier CSS in `styles.css` (`data-platform` / skin class if needed); rebuild `npm run build` → updates `dist/shared.js`, `dist/popup.js`.
6. **Extension settings** — default toggle in `src/settings.js` (`PLATFORMS`, `DEFAULT_SETTINGS.platforms`) and duplicated lists in `background.js` until unified build absorbs it.
7. **Server enablement** — platform id is validated against protocol `PLATFORMS`; server `config.json` `settings.platformsEnabled` and extension bridge `platformsEnabled` must include the new id.
8. **MCP** — ops flow through existing tools (`chats_list`, `chat_ask`, …) with `platform` argument; no new MCP tool unless the surface is genuinely different.
9. **Dashboard (optional)** — if the provider gets a visual skin: extend `Skin` in `chat-export-dashboard/src/hooks/useTheme.ts`, icons in `src/components/SkinIcons.tsx`, rules in `static/skins.css`, then `npm run build` and refresh the server `dashboard/` submodule copy.
10. **Docs** — update `docs/platforms.md` status table, README platform matrix, wiki **Supported Platforms**.

### Files and hooks (platform)

| Area | Path / hook | What to change |
|------|-------------|----------------|
| Protocol id list | `chat-export-server/packages/protocol/src/constants.js` | `PLATFORMS` |
| RPC / op validation | `chat-export-server/packages/protocol/src/schema.js` | Platform enum, op args if new |
| Content implementation | `chat-export-extension/content/<platform>.js` | `CE.definePlatform`, `ops.*` |
| MV3 wiring | `chat-export-extension/manifest.json` | permissions, content_scripts |
| Export bar chrome | `chat-export-extension/styles.css` | Platform-specific layout |
| Build output | `chat-export-extension/dist/*` | Run `npm run build` after src edits |
| Bridge defaults | `chat-export-extension/src/settings.js`, `background.js` | `PLATFORMS`, `platforms.<id>` |
| Popup platform toggles | `chat-export-extension/src/popup/main.jsx` | Uses `PLATFORMS` from settings module |
| Site map notes | `projects/Chat Export/docs/site-maps/*.md` | Selectors, SPA navigation |
| Rollout tracker | `projects/Chat Export/docs/platforms.md` | Priority, hosts, shipped status |
| Server config filter | `chat-export-server/src/core/config.ts` | Uses protocol `PLATFORMS` for `platformsEnabled` |
| Hub / RPC | `chat-export-server/src/hub/browser-hub.ts`, `src/core/server-core.ts` | Platform enablement, `callOp` |
| MCP surface | `chat-export-server/src/mcp/tools.ts` | `platforms_list` reflects enabled set |
| Dashboard skin | `chat-export-dashboard/src/hooks/useTheme.ts`, `static/skins.css`, `SkinIcons.tsx` | Only if new provider theme |
| Acceptance | `projects/Chat Export/docs/acceptance.md` | Manual / MCP probes per platform |

### Platform id consistency

MCP calls use the protocol id (e.g. `grok-x`), not the hostname. `platforms_list` merges server settings with the connected browser’s `platformsEnabled` from the extension hello handshake.

## Add a new UI language (i18n)

Today: **English** and **Russian**, plus **Auto** (browser / UI language detection). Extension export bar and popup share locale packs; dashboard loads JSON over HTTP.

### Extension (popup + export bar)

| Step | Path | Action |
|------|------|--------|
| 1 | `chat-export-extension/locales/LN_<code>.json` | New string table (copy `LN_en.json`, translate values) |
| 2 | `chat-export-extension/src/i18n/index.js` | Import pack; add to `PACKS`; extend `resolveLocale()` if needed |
| 3 | `chat-export-extension/src/settings.js` | Add code to `UI_LOCALES` if it should appear in stored settings |
| 4 | `chat-export-extension/src/popup/skin-icons.jsx` | Add `{ id: '<code>' }` to `LOCALE_OPTIONS` |
| 5 | `chat-export-extension/locales/LN_en.json` (+ `LN_ru.json`) | Add `lang.<code>` label for the selector |
| 6 | `chat-export-extension/src/popup/main.jsx` | Uses `LOCALE_OPTIONS` / `t('lang.*')` (usually no code change beyond options) |
| 7 | `chat-export-extension/src/ui/ExportBar.jsx` | Uses `createTranslator(resolveLocale(...))` from shared i18n |
| 8 | Build | `npm run build` in extension repo |

Popup **theme** options (`auto` / `light` / `dark`) and **skin** options (provider icons) live in `skin-icons.jsx` (`SCHEME_OPTIONS`, `SKIN_OPTIONS`) and `src/settings.js` (`UI_SCHEMES`, `UI_SKINS`). A sibling change may extend Auto behavior; this doc only lists file locations.

### Dashboard

| Step | Path | Action |
|------|------|--------|
| 1 | `chat-export-dashboard/static/locales/<code>.json` | Full key set (mirror `en.json`) |
| 2 | `chat-export-dashboard/src/hooks/useTheme.ts` | Extend `LocaleCode` union; default / `localStorage` handling |
| 3 | `chat-export-dashboard/src/hooks/useLocale.ts` | Fetches `/dashboard/locales/${locale}.json` (no change if union extended) |
| 4 | `chat-export-dashboard/src/components/AppearanceControls.tsx` | Language menu (`localeEn` / `localeRu` labels — add keys + buttons for new code) |
| 5 | Build output | `npm run build` → `public/locales/<code>.json` via `publicDir: 'static'` in `vite.config.ts` |
| 6 | Server embed | Copy or submodule `public/` into `chat-export-server/dashboard/public/` |

Dashboard **scheme** (`SchemePref`: `dark` | `light` | `auto`) and **skin** (`Skin` type) are separate from locale; see `useTheme.ts` and `static/skins.css`.

### i18n file checklist (new locale `<code>`)

| File | Extension | Dashboard |
|------|-----------|-----------|
| Locale JSON | `locales/LN_<code>.json` | `static/locales/<code>.json` |
| Register pack | `src/i18n/index.js` | (fetch by filename) |
| Selector options | `src/popup/skin-icons.jsx` `LOCALE_OPTIONS` | `AppearanceControls.tsx` + `LocaleCode` type |
| Settings enum | `src/settings.js` `UI_LOCALES` | `useTheme.ts` `LocaleCode` |
| Label keys | `lang.<code>` in every `LN_*.json` | `localeEn` / `localeRu` pattern — add `locale<Code>` keys in all locale files |

Keep key names identical across languages so `createTranslator` and dashboard `t(key)` stay aligned.

## Development pointers

- **Build extension:** `npm run build` (popup + shared bundles).
- **Server:** Node 22.13+, `npm run build`, `chat-export-server start`.
- **Dashboard dev:** `npm run dev` (proxies `/dashboard/api`).
- **Configuration:** see README **Configuration** sections and wiki [Installation and quickstart](https://github.com/svergio/chat-export-extension/wiki/Installation-and-Quickstart).

Questions: GitHub Issues on the repo you touch; security: `SECURITY.md` on server/dashboard.
