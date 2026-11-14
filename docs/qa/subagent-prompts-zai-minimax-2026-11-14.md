# Subagent prompts — Z.ai / MiniMax (CDT recon 2026-11-14)

Repos:
- Extension: https://github.com/svergio/chat-export-extension
- Server (MCP only if needed): https://github.com/svergio/chat-export-server
- Site maps: `projects/Chat Export/docs/site-maps/chat.z.ai.md`, `agent.minimax.io.md`
- Matrix RED: `chat-export-server/docs/qa/mcp-live-matrix-FINAL-20261114T165255Z.md` (`HOST_ERROR:Z.ai chatId timeout` ×3; minimax `-32001`)

Live CDT (two Chrome profiles):
- Guest / CEC: `chat.z.ai` Free, empty list; create OK → `/c/{uuid}`; reply OK; **no QuotaExhausted modal**
- Logged Free: `svwergio_mel Free`, `GLM-5.3-Flash`, `last_mode=agent`; create OK with native fill
- MiniMax guest after Skip: create OK → `/mavis?id=…` but banner **“Fewer than 1,000 Credits remain / Buy Credits / Subscribe”** + **Upgrade plan** — soft warning, **not** a hard block
- MiniMax logged-in: Upgrade / Subscribe always visible

Rule: guest “no hard limit” ≠ “no Upgrade UI”. Do **not** map Upgrade/Credits banner → `RATE_LIMIT` while send still works.

---

## Z.ai — Prompt 1 / Bug 1: `chats_create` → `HOST_ERROR:Z.ai chatId timeout`

```text
Repo: https://github.com/svergio/chat-export-extension
Branch: fix from current main/test policy in AGENTS.md (feature branch, no product edits outside zai path unless Ops helper is shared).

BUG (one): platform `zai` op `create` fails MCP live matrix with
  HOST_ERROR:Z.ai chatId timeout
(see chat-export-server docs/qa mcp-live-matrix-FINAL-20261114T165255Z.md — root fails 319/342/345).

EVIDENCE (CDT 2026-11-14):
- Guest https://chat.z.ai/ AND logged Free both CREATE SUCCESS when #chat-input is filled via HTMLTextAreaElement native value setter + InputEvent('input'), then #send-message-button click.
- URL becomes https://chat.z.ai/c/{uuid} in ~1s; POST https://chat.z.ai/api/v1/chats/new → 200.
- Naive `textarea.value = text` + Event('input') leaves Send **disabled** → never navigates → matches 120s wait in content/zai.js create().
- content/zai.js submitComposer uses Ops.fillEditable (src/ops/helpers.js setNativeValue) — still times out in matrix → harden beyond “assume fill worked”.

SCOPE:
- content/zai.js (create / submitComposer / ensureNewChat / currentChatId)
- shared Ops only if zai-specific fix is insufficient (document why)
- Update docs/site-maps/chat.z.ai.md quirks: create must wait for /c/{id} OR chats/new response id; Send disabled = fill failed
- Unit/CDT probe if present under test/ or scripts/cdt-probes

DO NOT:
- Treat Free badge / Upgrade marketing as RATE_LIMIT
- Rewrite unrelated providers
- Mass-delete real chats; only [ce-test] titles

ACCEPTANCE:
1. After fill, assert send enabled OR verified native value before click/Enter.
2. create() resolves chatId from location `/c/([^/?#]+)` OR from POST /api/v1/chats/new JSON within timeout; fail fast with clear HOST_ERROR if Send never enables.
3. Manual CDT: guest + logged Free new chat from `/` → chatId < 15s.
4. npm test / targeted zai tests green.

Deliver: PR description with before/after CDT notes; no secrets.
```

---

## Z.ai — Prompt 2 / Bug 2: false paywall / quota (`RATE_LIMIT` vs Free)

```text
Repo: https://github.com/svergio/chat-export-extension

BUG (one): Z.ai Free / guest sessions must NOT be classified as RATE_LIMIT / paywall when the host still accepts create/send.
Matrix did not show RATE_LIMIT for zai, but product ships QuotaExhaustedModal chunk (z-cdn …/QuotaExhaustedModal-*.js) and UI label “Free” on Open User Menu. Wrong gating would recreate false RED.

EVIDENCE (CDT 2026-11-14):
- Guest CEC “Free”: list=[], create+reply OK, no quota dialog, bodyHit only Projects/Free — no exhaust modal.
- Logged “svwergio_mel Free”: same create OK, no quota dialog.
- failFromResponse in content/zai.js maps only HTTP 429 → RATE_LIMIT (good). Ensure no DOM heuristic maps “Free” / generic “Upgrade” / loaded QuotaExhaustedModal asset → RATE_LIMIT.
- detectUsage() scrapes usage/credit text — must not invent exhausted quota from Free badge.

SCOPE:
- content/zai.js hostState.usage / detectUsage / any paywall helpers
- shared Ops.parseUsageFromText only if it false-positives on “Free”
- docs/site-maps/chat.z.ai.md: Free vs QuotaExhaustedModal (real block only when modal/API says exhausted)

ACCEPTANCE:
1. Document exact condition for RATE_LIMIT on zai: HTTP 429 and/or visible QuotaExhaustedModal (or API body), not “Free” label.
2. CDT guest Free create/send → never rpc RATE_LIMIT.
3. If quota modal can be forced in UI, prove RATE_LIMIT only then; else note “unobserved, code path only”.
4. No change that blocks Free create.

Deliver: small PR + site-map quirk update.
```

---

## Z.ai — Prompt 3 / Bug 3: Chat / Agent / ZCode modes break create path

```text
Repo: https://github.com/svergio/chat-export-extension

BUG (one): Z.ai landing exposes ZCode + API tabs and last_mode=agent (localStorage). capabilities() hardcodes modes Chat|Agent. create/ensureNewChat may start on Agent/ZCode home where composer semantics or navigation differ → contributes to chatId timeout / wrong chat type.

EVIDENCE (CDT 2026-11-14):
- Snapshot Home: buttons ZCode, API; composer “Send a Message”; model Select a model (guest GLM-5.2, logged GLM-5.3-Flash).
- localStorage last_mode="agent"; last_selected_agent_model guest ["glm-5.2"], logged ["x-preview-l"].
- POST /api/v1/chats/new creates type general_agent / channel zai-web (list payload).
- Site map: modes Chat vs Agent best-effort.

SCOPE:
- content/zai.js ensureNewChat, detectCapabilities, currentMode, create
- Prefer: before create, land on chat composer route that yields /c/{id} (Home chat, not stuck ZCode workspace)
- capabilities must report real selected model + mode from UI/localStorage without inventing paywalls
- Update docs/site-maps/chat.z.ai.md modes/ZCode

ACCEPTANCE:
1. From cold `/`, create([ce-test]…) works whether last_mode was agent or chat.
2. If ZCode view hides #chat-input, ensureNewChat returns to chat composer before fill.
3. platforms_capabilities zai returns models/modes matching visible selector; no RATE_LIMIT.
4. CDT notes for guest + logged.

Deliver: PR + site-map section Modes (Chat / Agent / ZCode).
```

---

## Z.ai — Prompt 4 / Bug 4: Aliyun captcha during create → opaque timeout

```text
Repo: https://github.com/svergio/chat-export-extension

BUG (one): During guest create, network showed captcha endpoints
  POST …captcha-open-southeast.aliyuncs.com /
  cloudauth-device-dualstack…
while chat still completed. Under MCP headless/heavy load captcha may block navigation → same “Z.ai chatId timeout” without captchaWidget in error.

EVIDENCE:
- content/zai.js has detectCaptcha / hostState.captchaWidget
- create() waitFor chatId does not surface captcha when wait fails

SCOPE:
- content/zai.js create/send error path: on chatId timeout, if captcha visible → rpc code that matrix can classify (HOST_ERROR with captcha detail or existing captcha field), not silent 120s timeout only
- Do not auto-solve captcha

ACCEPTANCE:
1. Timeout error message/detail mentions captcha when detectCaptcha() true.
2. hostState.captchaWidget true when challenge visible.
3. No false captcha when challenge absent (guest successful create).

Deliver: minimal PR.
```

---

## MiniMax (context for later — not Z.ai prompts)

Guest after onboarding Skip: send works (`/mavis?id=`), but UI shows Credits low + Upgrade/Subscribe. Logged-in always Upgrade plan.

Subagent theme (single bug when you schedule it):
**Do not map Credits/Upgrade banner → RATE_LIMIT / UNAUTHORIZED while TipTap send creates a session.** Matrix `-32001` on minimax create is likely onboarding wall / RPC timeout, not paywall. Repo: https://github.com/svergio/chat-export-extension `content/minimax.js` + `docs/site-maps/agent.minimax.io.md`.

---

## Spawn order

1. Prompt 1 (create timeout) — highest impact on RED  
2. Prompt 3 (modes/ZCode) — often unblocks create  
3. Prompt 2 (false RATE_LIMIT) — guardrail  
4. Prompt 4 (captcha signal) — observability  
Then MiniMax credits-banner vs hard block.
