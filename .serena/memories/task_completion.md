# Task completion

No automated test suite / linter in-repo.

Before handing off:
1. `manifest.json` version == `shared.js` EXT_VERSION
2. If icons/SVG masters changed → `node scripts/render-toolbar-icons.mjs`
3. Reload unpacked extension + hard-refresh target tab
4. Smoke: bar mounts; format pill text visible (Chirp on X); download arrow (not composite); export one format
5. X `/i/grok`: bar between Fast wrap and voice; format chip transparent (not white blob)
6. Toolbar: grok.com → grok composite; x.com/i/grok → X composite; other → idle
7. Optional: `serena memories check` from project root if memories touched
