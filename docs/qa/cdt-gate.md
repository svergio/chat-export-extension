# CDT release gate

Live Chrome DevTools checks against the user's logged-in Chrome. Not unit/happy-dom. Run before Chrome Web Store / zip publish when ExportBar, folder pill, or silent save changed.

## Prerequisites

1. Chrome with remote debugging enabled (`chrome://inspect/#remote-debugging`).
2. Unpacked Chat Export loaded (id default `hhfiadhandpdamghcphoffmnldokgmec`).
3. Folder granted (ExportBar shows folder name, not regrant warn).
4. CDT CLI on user Chrome (not headless). Stop any leftover headless daemon first:

```bash
chrome-devtools stop
chrome-devtools start --autoConnect --categoryExtensions --no-usage-statistics
```

5. Provider tabs open (or pass `--open-missing`). For silent-save rows, open a chat that has messages (defaults: `zai`, `deepseek`).
6. If saves toast `Скачано` / `Downloaded` while the pill still shows a folder name, reload the extension once (`chrome-devtools reload_extension <id>`), reload provider tabs, re-grant folder if prompted, then re-run. Stale content-script ↔ SW after long CDT sessions causes quiet Downloads fallback.

## Run

```bash
cd chat-export-extension
npm run test:cdt
npm run test:cdt -- --open-missing
npm run test:cdt -- --save=zai,deepseek
npm run test:cdt -- --no-save
```

Env:

- `CE_EXT_ID` — extension id if not the default unpacked id
- `CE_FOLDER_DIR` — directory used to verify new files (default `~/Downloads/Тестовая/Гитахаб`)
- `CHROME_DEVTOOLS_BIN` — path to `chrome-devtools` if not on `PATH`

Exit codes: `0` all PASS/SKIP, `1` any FAIL, `2` tooling/setup error.

Report: `docs/qa/<version>-cdt-gate.md`.

## What it asserts

| Check | Pass means |
| --- | --- |
| `extension/sw` | Service worker manifest version matches `manifest.json` |
| `<provider>/bar` | ExportBar present, `data-chat-export-v` == version, fmt+dl+folder pill, folder not warn, format menu opens |
| `<provider>/save` | Plain download click → toast «Сохранено в …», no `folder.html` tab, new file under `CE_FOLDER_DIR` |

Native pickers (first grant / Shift rebind / saveAs) stay manual — CDT cannot complete `showDirectoryPicker`.
