# Suggested commands

## Extension load
- Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `projects/chat-export-extension/`
- After code change: Reload extension card, then refresh grok.com / chatgpt.com / x.com/i/grok tab

## Toolbar icons
```bash
cd projects/chat-export-extension
node scripts/render-toolbar-icons.mjs
```
Requires `scripts/node_modules/sharp` (`npm install` inside `scripts/` once).

## Optional bulk scripts (scripts/)
- `node scripts/bulk-export-grok.mjs` / `bulk-export-chatgpt.mjs`
- `node scripts/bulk-delete-grok.mjs` / `bulk-delete-chatgpt.mjs`
(puppeteer-core; not part of normal UI ship path)

## Serena
```bash
cd projects/chat-export-extension && serena memories check
```
