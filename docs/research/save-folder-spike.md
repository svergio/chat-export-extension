# Save-folder spike (A03)

Date: 2026-11-12. Chrome (user profile, unpacked extension `hhfiadhandpdamghcphoffmnldokgmec`), macOS.

## Decision

**Path A: the offscreen document writes.** `folder.html` picks the folder and stores the handle in the extension-origin IndexedDB (`chat-export-fs-ext` / `handles` / `default`). `offscreen.html` reads the handle, checks `queryPermission`, and writes files. No visible tab is needed for a write while permission is `granted`.

## Results

| Check | Result |
| --- | --- |
| Service worker exposes `FileSystemDirectoryHandle` | yes; `showDirectoryPicker` is undefined there, so the SW cannot pick folders |
| (a) offscreen sees `granted` right after the pick | yes: real folder "Тестовая" picked in `folder.html`, `folderStatus` returned `granted` |
| (c) write from offscreen | yes: pending job `pending.md` written, then two silent saves gave `ce-test.md` and `ce-test (1).md` with no dialogs |
| Uniquification | `t.md` -> `t (1).md`; subfolder `Chat A` -> `Chat A (1)` |
| `too-large` (> 8 MB base64) | returned without touching the folder |
| `folderForget` | `folderStatus.state === 'none'` afterwards |
| Deferred job (`no-folder`, `permission`, `rebind:true`) | job is stored in `chrome.storage.session` and `folder.html` is opened; after `folderPicked` the job is written and removed |
| Job cleanup | closing the `folder.html` tab removes `ce.job.<id>` (via the `ce.jobtab.<tabId>` mapping) |
| (b) after extension reload with no extension tabs open | `prompt`; the offscreen write returns `permission`. The `grant` page then restored access with one click and wrote the pending job |
| (b) after a full Chrome restart | not verified: other agents reloaded the extension repeatedly during the spike, and restarting the user's Chrome was out of scope |

## Picker under automation

- Under chrome-devtools-mcp, `showDirectoryPicker` rejects with `AbortError` right away, because the MCP intercepts file chooser dialogs. Picker flows therefore need a human click. The real-folder results above come from the user clicking in their own Chrome.
- Chrome refuses protected roots (home, Downloads, Desktop, Documents) with "contains system files". If the user then cancels, the page gets `AbortError`. The page now opens with `startIn: 'downloads'`, shows a hint to pick or create a subfolder, keeps the button enabled, and keeps the pending job so a retry still completes the export.
- An OPFS handle (`navigator.storage.getDirectory()`) stored under the same IndexedDB key was used to exercise the offscreen write path without the native dialog. OPFS is always `granted`, so it cannot test permission expiry.

## Expectations for A04 and A14

- Expect `prompt` after a browser restart or an extension reload/update. Restoring access is one click on `folder.html?mode=grant` (Chrome 122+ may offer "Allow on every visit", which keeps it `granted`).
- Content scripts should treat `pending: true` as "background took over". Fall back to `chrome.downloads` only on `too-large`, `unsupported` or `error`.
