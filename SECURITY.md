# Security Policy

Chrome MV3 extension (chat export plus optional bridge to a local server).

## Supported versions

Only the latest release on the `main` branch receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub private vulnerability reporting:
https://github.com/svergio/chat-export-extension/security/advisories/new

Include affected version or commit, reproduction steps, and impact. You can expect an acknowledgement within 7 days and a fix or mitigation plan within 30 days for confirmed issues.

## Scope and hardening notes

- The gateway token (`ceb_...`) lives in `chrome.storage.local`; do not share exported profile data.
- Keep the server host set to a loopback address; the bridge uses plain `ws://` and `http://`.
- Destructive operations are off by default and gated in the extension independently of the server.

## Secrets

Never commit bearer tokens (`cem_...`, `ceb_...`, legacy `cek_...`), `mcp.json` files that contain them, or `~/.chat-export` contents. If a token leaks, rotate it immediately and report the exposure through the channel above.
