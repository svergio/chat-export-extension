# Tech stack

- Chrome Extension Manifest V3 (unpacked load; no npm build for the extension itself)
- Vanilla JS IIFEs (no bundler/TS for content/background/shared)
- CSS single file; X Atomic CSS classes cloned from native chips where possible, overridden with `!important` for grok-x soft look
- Vendored: `vendor/pdf-lib.min.js`, `vendor/fontkit.umd.min.js`, `vendor/NotoSans-Regular.ttf`
- Optional `scripts/` Node (commonjs): `puppeteer-core`, `sharp` for bulk ops + toolbar PNG render only
- Verify UI via user Chrome CDP / chrome-devtools-mcp on real profile (`:9222`), not extension-disabled dummy
