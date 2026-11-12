# Contributing to Chat Export

Stack layout under the maintainer tree `projects/Chat Export/`:

| Repo | Path |
|------|------|
| Extension | `chat-export-extension/` |
| Server | `chat-export-server/` |
| Dashboard | `chat-export-dashboard/` |
| Shared docs | `docs/` (platforms, site-maps, acceptance) |
| Wiki (GitHub) | `chat-export-extension.wiki/` clone |

No `Co-authored-by` trailers in commits. Open PRs against `main` for product changes; open test-hardening PRs against `test` (see **Tests** and **CI and promotion** below).

After changing `package.json` dependencies or vendored files under `vendor/`, run `npm run licenses` and commit [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) if the table changed. Uses one-shot `npx license-checker` (not a repo dependency).

Extended wiki: [Contributing](https://github.com/svergio/chat-export-extension/wiki/Contributing).

## Provider research (before code)

Do **not** edit `content/<id>.js`, manifest matches, or protocol enums until reconnaissance is written down.

| Step | Action |
|------|--------|
| 1 | Logged-in tab: Chrome DevTools snapshot/DOM map (`docs/site-maps/` workflow; max 2 screenshots per task). |
| 2 | Write `projects/Chat Export/docs/site-maps/<host>.md` — composer, chat list, `chatId` URL regex, model toggles, internal list/get/delete APIs, fragility notes (mirror `chatgpt.com.md`, `claude.ai.md`). |
| 3 | Choose API-first vs DOM fallback per op (`list`, `get`, `exportData`, `delete` vs `create`, `send`). |
| 4 | Pick stable platform id; wire the same id through protocol, manifest, settings, and `docs/platforms.md`. |

Static marketing pages (no session): HTTP/site-map only — not full-page HTML dumps. Live MCP smoke uses **`[ce-test]`** chats only; no mass deletes on real threads.

Maintainer workspace rule (NodeRed): `.cursor/rules/chat-export-provider-research.mdc`.

## Add a new chat platform (provider)

Pick a stable **platform id** (lowercase, hyphenated if needed, e.g. `grok-x`). The same string must appear everywhere below.

### Step-by-step

1. **Research** — complete [Provider research (before code)](#provider-research-before-code); then implement from the site map.
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

## Add a new export schema

Schema id: `{name}/{version}` (e.g. `sharegpt/1`). Display: `{name} — {version}`. Default remains `chat-export/1`.

Folder slug = id with `/` → `-` (e.g. `schemas/sharegpt-1/`). Renderers live under `src/schemas/` and register in `src/schemas/index.js` (bundled into `dist/shared.js`). Publish rules: [`schemas/README.md`](schemas/README.md).

| Step | Path | Action |
|------|------|--------|
| 1 | `schemas/<slug>/manifest.json` | `id`, `name`, `version`, `title{en,ru}`, `formats[]`, `wikiSlug`, `description{en,ru}` |
| 2 | `src/schemas/<slug>/render.js` | `render(format, meta, messages, ce)` for all of `md\|yaml\|json\|html\|pdf` |
| 3 | `src/schemas/index.js` | Add to `SCHEMA_IDS` / manifests map; wire in `renderWithSchema` |
| 4 | `src/settings.js` + protocol | `EXPORT_SCHEMA_IDS`; server `EXPORT_SCHEMAS` / `DEFAULT_EXPORT_SCHEMA` |
| 5 | `locales/LN_en.json` + `LN_ru.json` | `schema.<id>` labels (popup only) |
| 6 | Wiki | Mini EN+RU (`Export-Schema-<slug>`) linked from [Export-Formats](https://github.com/svergio/chat-export-extension/wiki/Export-Formats) hub |
| 7 | `test/test-export-schemas.js` | Fixture parse asserts — **no schema without a parse test** |

UX: schema picks live in the **popup** (default + per-format). The export bar stays format-only. MCP may pass `schema` on `chats_export`; server default is `settings.exportSchema`.

## Tests (`test` branch)

New or strengthened tests land on branch **`test`** first. Feature PRs target `main`; after merge, sync `main` → `test` and extend coverage there. Promote `test` → `main` only when CI is green on `test` (see **CI and promotion**).

### Adversarial testing (extension)

Goal: hostile but realistic inputs — parsers, settings normalization, export-bar DOM, provider contract fixtures — without multi-minute fuzz or destructive sweeps on real chats.

| Area | Examples |
|------|----------|
| `htmlToMarkdown` / `DOMParser` | Unclosed tags, script/style stripping, nested code fences, broken tables |
| Settings | Corrupt storage, stale `tosVersion` / `faqVersion`, bad ports, bogus UI enums, `exportSchemas` normalize |
| DOM harness | Missing nodes, busy overlay races (deterministic waits only) |
| Providers | Bridge start URLs and `ops` shape for all eight `PLATFORMS` ids |
| Export schemas | Fixture chats → each schema × md/json/yaml structural asserts (`test/test-export-schemas.js`) |

Keep `npm test` deterministic and **under ~15s** per job. Prefer `test/test-html-to-markdown.js`, `test/test-settings.js`, `test/test-i18n.js`, `test/test-providers-contract.js`, `test/test-export-schemas.js` on `test`.

### Extension commands

```bash
git fetch origin test
git checkout test
npm test                 # test:unit + test:dom (see package.json)
npm run test:unit        # options / files
npm run test:dom         # menu / busy via test/dom-harness.js
```

Baseline `test/` on `main`: settings/options, file helpers, export-bar menu, busy overlay. Additional adversarial files may exist only on `test` until promotion.

### Server (related)

On `chat-export-server` branch `test`:

```bash
npm test                 # unit + protocol
npm run test:contract    # contract suite
npm run test:all         # unit + contract + protocol
```

Protocol capability fixtures for shipped platforms live under `packages/protocol/fixtures/`. Extension content-script contract polish for newer providers (qwen / deepseek / perplexity) may still need work — see open issues.

Workspace rule: `.cursor/rules/chat-export-test-branch-adversarial.mdc`.

## CI and promotion (`test` → `main`)

GitHub Actions: `.github/workflows/build-extension.yml` on **push** and **pull_request** to `main` and `test`.

| Step | Command | Purpose |
|------|---------|---------|
| Install | `npm ci` | Reproducible deps |
| Test | `npm test` when `test/*.js` or `test/*.test.js` exist | Gate before pack (unit + DOM + adversarial + i18n parity) |
| Audit | `npm audit --audit-level=high` | Block high/critical dependency vulnerabilities |
| Build | `npm run build` | `dist/shared.js`, `dist/popup.js`, `background.js` |
| Pack & Verify | `npm run pack` | `dist-pack/chat-export-extension-<version>.zip` verified (`manifest.json`, `background.js`, `dist/*`, `locales/*`), uploaded as workflow artifact, and attached to GitHub Releases on `v*` tags |

`dist-pack/` is gitignored locally; CI still runs `pack` so missing manifest paths or bundles fail the job. After a green `test` branch, merge `test` into `main` for release-aligned promotion.

## Two-tier ToS checklist (contributors)

Legal copy lives in `LEGAL.md` and wiki **Dashboard and Security** — do not rewrite ToS/SKU text in drive-by PRs. When you touch consent UI, storage, or bridge gates, verify code matches the two tiers:

| Tier | Storage / API | Enforced by | Blocks without consent |
|------|---------------|-------------|------------------------|
| 1 — General legal / export | `tosVersion` === `TOS_VERSION` | `hasTosConsent()` (`PrimaryTosConsent` gate + `canEnableBridge()`) | Main popup controls, `serverOn`, WebSocket bridge |
| 2 — Advanced MCP / bridge | `faqVersion` === `FAQ_VERSION` | `hasFaqConsent()`; `canEnableBridge()` requires `hasTosConsent() && hasFaqConsent() && !!apiKey.trim()` | `serverOn`, WebSocket bridge, automation flags |

Popup and background clear `serverOn` when either tier 1 or tier 2 consent is missing (`src/popup/main.jsx`, `src/background/main.js`, `src/background/bridge.js`). Bump `TOS_VERSION` / `FAQ_VERSION` in `src/settings.js` only together with maintainer `LEGAL.md` and locale string updates (`tos.title`, `tos.lead`, `tos.1`..`tos.4`, `tos.agree`, `btn.acceptTos`, `label.tos`, `faq.lead`, `faq.1`..`faq.6`, `faq.agree`, `label.faq` in `locales/LN_en.json` and `locales/LN_ru.json`).

Regression tests (on `test`): `test/test-settings.js` (tier order), `test/test-i18n.js` (EN/RU key parity for legal strings).

## MR and CI failure reports

Failed GitHub Actions checks or MR/PR review **must** include a structured report — not “tests failed” without context. Use all four headings:

1. **What broke** — workflow job/step, command, failing test name, key assertion lines.
2. **Why it broke** — diff hunk, trace, contract drift, fixture, or environment (branch `test` vs `main`).
3. **Impact** — which gate (unit, pack, platform id, ToS tier) and release risk.
4. **Fix direction** — one concrete next file/command, or what log/SHA is still needed.

NodeRed workspace rule: `.cursor/rules/chat-export-mr-review-after-tests.mdc`.

## Development pointers

- **Build extension:** `npm run build` (popup + shared bundles).
- **Server:** Node 22.13+, `npm run build`, `chat-export-server start`.
- **Dashboard dev:** `npm run dev` (proxies `/dashboard/api`).
- **Platform roadmap:** extension [`docs/platforms.md`](docs/platforms.md) and workspace `projects/Chat Export/docs/platforms.md`.
- **Configuration:** see README **Configuration** sections and wiki [Installation and quickstart](https://github.com/svergio/chat-export-extension/wiki/Installation-and-Quickstart).

Questions: GitHub Issues on the repo you touch; security: `SECURITY.md` on server/dashboard.
