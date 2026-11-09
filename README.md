# Chat Export

Lightweight Manifest V3 Chrome extension. Adds an export control to Grok (`grok.com` and X: `/i/grok` + post-analysis drawer) and ChatGPT composers. Reads the conversation from the DOM and downloads Markdown, YAML, JSON, HTML, and/or PDF locally. No background worker, no network, no analytics.

## Load unpacked

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** (or **Reload** after an update)
4. Select this folder: `chat-export-extension/`
5. Open [grok.com](https://grok.com), [chatgpt.com](https://chatgpt.com), or [x.com/i/grok](https://x.com/i/grok) and **refresh the tab** after Reload (content scripts stay on the old file until the page reloads)

ChatGPT: the bar sits in the new composer footer (next to Thinking / Dictation), not the old `footer[data-ds-composer]`.

X Grok: bar mounts next to the Fast/Быстрый chip on `/i/grok` and inside `[data-testid=GrokDrawer]` (Анализ поста). It does not appear on the plain home feed.

## Usage

- Format pill opens **upward**. Check MD / YAML / JSON / HTML / PDF (several at once). There is no separate "both" item.
- Two or more formats: **Папка | Архив** toggle appears under the list (hidden when only one format is on). Default is **Архив**.
- Download icon:
  - One format: click goes to Downloads with **no Save As** (`chrome.downloads`, `saveAs: false`). Shift/Ctrl/Cmd = Save As.
  - Several + Архив: one `{name}.zip` in Downloads the same way. Shift = Save As for the zip.
  - Several + Папка: first time pick a folder; later clicks reuse it. Shift = pick another. Writes `{name}/` inside, no extra Chrome download dialog.

`<a download>` cannot skip Chrome’s “Ask where to save each file”. Silent saves go through the extension downloads API.
- File name: `{platform}-{title}-{YYYY-MM-DD}.{md|yaml|json|html|pdf}` (or `.zip` / that name as a subfolder)

## Markdown layout

System and role markers use fenced blocks (`sys`, `user`, `grok` / `chatgpt`, `sources`). Conversation bodies stay live markdown. JSON is pretty-printed with `schema: chat-export/1`. HTML is a script-free semantic article. PDF is selectable text (not a screenshot), including Cyrillic.

## Platforms

Target host list and rollout priority: [docs/platforms.md](docs/platforms.md). Grok is three surfaces: `grok.com`, X full chat `x.com/i/grok`, and X post drawer `GrokDrawer`.

## CDT note

Chrome remote debugging (`chrome://inspect/#remote-debugging`) is optional for install.

Test against the user Chrome on `:9222`, not the MCP dummy profile (`--disable-extensions`). After Reload unpacked, refresh the Grok/ChatGPT tab.
