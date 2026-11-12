# Third-party notices

Chat Export Extension is licensed under the [MIT License](./LICENSE).

This file lists **direct runtime** npm dependencies and **vendored** assets shipped in the packed extension (no `node_modules` in release zips). Dev-only build tools (`esbuild`, `happy-dom`, `sharp`) are omitted.

Regenerate: `npm run licenses` (uses `npx license-checker`; not added as a repo dependency).

## npm runtime dependencies

| Package | License | Notes |
| --- | --- | --- |
| `preact` | MIT | npm runtime |

## Vendored in `vendor/` (PDF export)

| Component | License | Location |
| --- | --- | --- |
| pdf-lib (bundled UMD) | Apache-2.0 | `vendor/pdf-lib.min.js` (shipped in extension zip) |
| fontkit (bundled UMD) | MIT | `vendor/fontkit.umd.min.js` (shipped in extension zip) |
| Noto Sans (font) | OFL-1.1 | `vendor/NotoSans-Regular.ttf` (shipped in extension zip) |

## Optional integrations (not dependencies)

Cursor, Claude Desktop, Open WebUI, local LLM stacks (e.g. Bonsai-27B), BibLLMsteak, and the NodeRed maintainer workspace are **optional** MCP clients or docs only. The extension runs standalone in Chrome without them.

---

_Generated for chat-export-extension@2.0.3. Product license: MIT._
