# chat-export-extension

MV3 Chrome unpacked extension: export AI chat DOM → MD/YAML/JSON/HTML/PDF locally.

## Source map
- `manifest.json` — hosts, content_scripts, action icons, perms (`downloads`, `tabs`)
- `shared.js` — `window.ChatExport` (export builders, `injectBar`, hydrate, zip, EXT_VERSION)
- `background.js` — downloads API + `chrome.action.setIcon` by tab URL
- `styles.css` — bar/menu; platform modifiers `--grok`, `--grok-x`, `--chatgpt`
- `content/page-harvest.js` — MAIN world harvest (all hosts)
- `content/grok.js` — grok.com composer mount/parse
- `content/grok-x.js` — x.com/twitter: `/i/grok` + `GrokDrawer` only (not home feed)
- `content/chatgpt.js` — chatgpt.com / chat.openai.com
- `icons/` — toolbar composites (idle/grok/x/chatgpt); Grok mark from grok.com brand PNG not Fast lightning
- `docs/platforms.md` — host coverage / rollout priority
- `scripts/render-toolbar-icons.mjs` — rebuild toolbar PNGs (needs `scripts` sharp)

## Invariants
- Bump **both** `manifest.json` version and `shared.js` `EXT_VERSION` together; bar remounts when `data-chat-export-v` mismatches.
- After Reload unpacked, **refresh the chat tab** or content scripts stay stale.
- In-chat download control = soft native chip + default download arrow. Toolbar icons = service mark + pencil-share; idle light/muted, active via shadow/glow, transparent bg.
- Grok on X ≠ grok.com: separate adapter `grok-x.js`; mount in Fast/voice actions row, never nest inside Fast wrap.
- PDF uses vendored `pdf-lib` + `fontkit` + `NotoSans-Regular.ttf` (web_accessible).

## Further
- Stack/tools: `mem:tech_stack`
- Commands: `mem:suggested_commands`
- Style: `mem:conventions`
- Done checklist: `mem:task_completion`
