# Chrome Web Store Listing — Chat Export

> Last Updated: 2026-11-16

## Store Listing

**Extension Name** [REQUIRED]
Chat Export

**Short Description** [REQUIRED]
Export the current AI chat to Markdown, PDF, JSON, HTML, or YAML — files stay on your computer.

**Detailed Description** [REQUIRED]
Chat Export adds a small export control on supported AI chat sites so you can save the current conversation locally — no bulk account dump, no waiting for an archive email.

FEATURES
• One-click export of the chat you are viewing
• Formats: Markdown, YAML, JSON, HTML, and PDF
• Folder or ZIP download, with a remembered save folder when you grant access
• Works on the AI chat sites listed in the extension popup (and on the project page)
• Optional Advanced mode: connect a local gateway on your machine for automation (loopback only)
• Local gateway source: https://github.com/svergio/chat-export-server

HOW TO USE
1. Install the extension and open a supported chat site while signed in
2. Use the Chat Export control on the page (or the toolbar popup)
3. Pick format(s) and save — files stay on your computer

PRIVACY
Exports are built in your browser and downloaded locally. The extension does not send chat contents to our servers. Optional Advanced mode talks only to a server you run on 127.0.0.1.

SUPPORT
Extension: https://github.com/svergio/chat-export-extension
Local server (Advanced mode): https://github.com/svergio/chat-export-server
Issues: https://github.com/svergio/chat-export-extension/issues

Version 2.1.6 — Soft Free banners no longer look like hard rate limits; delete/export reliability improvements on several providers.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Export the current AI chat conversation from supported provider websites to local files.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ White mark from Logo.png | docs/cws/assets/store-icon-128.png (alt: store-icon-128-on-dark.png) |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ From wiki GIF | docs/cws/assets/screenshots/01-chatgpt-formats.png |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ From wiki GIF | docs/cws/assets/screenshots/02-claude-formats.png |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ✅ From wiki GIF | docs/cws/assets/screenshots/03-grok-formats.png |
| Screenshot 4 | 1280×800 | ✅ From wiki GIF | docs/cws/assets/screenshots/04-perplexity-formats.png |
| Screenshot 5 | 1280×800 | ✅ From wiki GIF | docs/cws/assets/screenshots/05-copilot-formats.png |
| Small Promo Tile [RECOMMENDED] | 440×280 | ✅ Draft | docs/cws/assets/promo-small-440x280.png |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
Frames extracted from `docs/media/demo-export.gif` + wiki `providers/*/demo.gif`, letterboxed to 1280×800.
Show export format menu (MD/YAML/JSON/HTML/PDF) + Folder/Zip toggles.
Note: GIF UI locale is mostly RU (`Папка`/`Архив`); format names stay EN. Re-shoot EN later if review cares.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| downloads | permissions | Save exported Markdown/YAML/JSON/HTML/PDF (and ZIP) files to the user’s Downloads or chosen folder |
| tabs | permissions | Detect which supported chat tab is active and coordinate content-script work with the toolbar popup |
| storage | permissions | Remember format choices, save-folder handle metadata, locale, and optional local gateway token |
| alarms | permissions | Keep optional local gateway reconnect / heartbeat without relying on ephemeral service-worker timers |
| scripting | permissions | Inject/update content scripts on supported host pages when needed for export UI and page reads |
| offscreen | permissions | Build PDF and some archive work off the visible page without blocking the chat UI |
| https://chatgpt.com/* | host_permissions | Show export UI and read the open ChatGPT conversation for local export |
| https://chat.openai.com/* | host_permissions | Legacy ChatGPT host still used by some sessions |
| https://grok.com/* | host_permissions | Export UI and conversation read on Grok |
| https://x.com/* | host_permissions | X Grok chats on x.com |
| https://twitter.com/* | host_permissions | Legacy X host |
| https://claude.ai/* | host_permissions | Claude chat export |
| https://github.com/* | host_permissions | GitHub Copilot Chat pages |
| https://api.individual.githubcopilot.com/* | host_permissions | Copilot chat API used by the page session for complete export when DOM alone is insufficient |
| https://api.business.githubcopilot.com/* | host_permissions | Business Copilot chat API (same purpose) |
| https://api.enterprise.githubcopilot.com/* | host_permissions | Enterprise Copilot chat API (same purpose) |
| https://chat.qwen.ai/* | host_permissions | Qwen chat export |
| https://www.perplexity.ai/* | host_permissions | Perplexity chat export |
| https://perplexity.ai/* | host_permissions | Perplexity apex host |
| https://chat.deepseek.com/* | host_permissions | DeepSeek chat export |
| https://www.kimi.com/* | host_permissions | Kimi chat export |
| https://kimi.com/* | host_permissions | Kimi apex host |
| https://chat.z.ai/* | host_permissions | Z.ai chat export |
| https://agent.minimax.io/* | host_permissions | MiniMax agent chat export |
| https://janitorai.com/* | host_permissions | JanitorAI chat export |
| https://www.janitorai.com/* | host_permissions | JanitorAI www host |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No (no developer-operated backend). Optional local loopback to a user-run server does not send data to the publisher.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No* | No* | *Chat text is read in-page only to build a local export file; not sent to publisher | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | No | No | — | No |
| Website content | No* | No* | *Same as communications: in-page read for local file only | No |

If CWS forces a “reads website content” checkbox because of content scripts: declare it, purpose = “export the current chat to a local file”, not sold, not used for ads.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
Prefer a stable public URL. Draft source in-repo: `LEGAL.md` (section “Privacy & Local-Only Data Policy”).
Candidate until Pages is set: https://github.com/svergio/chat-export-extension/blob/main/LEGAL.md
(If review rejects blob URLs, publish `LEGAL.md` via GitHub Pages or wiki and update this field.)

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]
(fill — match CWS publisher profile)

**Contact Email** [REQUIRED]
6457364@gmail.com

**Support URL / Email** [RECOMMENDED]
https://github.com/svergio/chat-export-extension/issues

**Homepage URL** [RECOMMENDED]
https://github.com/svergio/chat-export-extension

## Package

| Item | Path |
|------|------|
| Upload ZIP | `dist-pack/chat-export-extension-2.1.6.zip` (~1.3MB) |
| Build | `npm run build && npm run pack` |

Do not upload `CHROMEWEBSTORE.md`, `docs/cws/assets/`, or `node_modules` inside the zip — `scripts/pack.mjs` already excludes them.

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.1.6 | 2026-11-16 | Keyword list removed; server GitHub link added; published | Published |

**Store URL:** https://chromewebstore.google.com/detail/chat-export/ecnkhadaajiodlaoflkjjnaclhloejgg

## Review Notes

### Known Issues / Limitations
- Optional Advanced / MCP gateway is local-only; reviewers should leave it off unless they run chat-export-server.
- Provider UIs change; export can break until an update — disclosed in LEGAL.md.
- Soft Free/Upgrade banners are not treated as hard rate limits.
- CN/FR provider accounts and paid Pro plans not claimed in listing claims.
- Do not list many provider brand names in store short/long description (CWS Yellow Argon / keyword stuffing).

### Rejection History
- 2026-11-16 — Yellow Argon (spam): excess keywords in detailed description brand list. Fixed by removing provider name list from listing + package short description.
