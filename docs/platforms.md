# Платформы AI-чатов (для host coverage)

Цель: веб-чаты, на которых вешать export bar. Не весь Similarweb — только то, чем реально пользуются.

Сейчас в расширении (v2.0.3+, **12** платформ): `chatgpt` + `grok` + `grok-x` + `copilot` + `claude` + `qwen` + `deepseek` + `perplexity` + `kimi` + `zai` + `minimax` + `janitorai` (bar-only). MCP / protocol: **11** ids (без `janitorai`).

---

## Must-have

| Платформа | Vendor | Host(s) для `matches` | Заметки |
|-----------|--------|------------------------|---------|
| ChatGPT (`chatgpt`) | OpenAI | `chatgpt.com/*`, legacy `chat.openai.com/*` | Shipped (v2.0.3+). |
| Claude (`claude`) | Anthropic | `claude.ai/*` | Shipped (v2.0.3+). Projects / Artifacts — отдельный DOM. |
| Gemini | Google | `gemini.google.com/*` | Out of scope for v2. |
| DeepSeek (`deepseek`) | DeepSeek | `chat.deepseek.com/*` | Shipped (v2.0.3+). |
| Grok (standalone, `grok`) | xAI | `grok.com/*` | Shipped (v2.0.3+). |
| Grok (в X / Twitter, `grok-x`) | xAI / X | `x.com/i/grok*`, `twitter.com/i/grok*` | Shipped (v2.0.3+). **Отдельный UI**, не grok.com. URL: `https://x.com/i/grok`. |
| Perplexity (`perplexity`) | Perplexity | `perplexity.ai/*`, `www.perplexity.ai/*` | Shipped (v2.0.3+). Sources/цитаты важны для export. |
| Qwen (`qwen`) | Alibaba | `chat.qwen.ai/*` (+ CN mirrors по live check) | Shipped (v2.0.3+). |
| GitHub Copilot Chat (`copilot`) | GitHub | `github.com/copilot`, `github.com/copilot/c/*` (+ agents/spaces по live) | Shipped (v2.0.3+). Нативного export чата нет («Download» = desktop app). Не матчить весь `github.com/*`. Composer: `#copilot-chat-textarea`, layout `[data-testid="chat-layout"]`. |
| Kimi (`kimi`) | Moonshot | `kimi.com/*`, `www.kimi.com/*` | Shipped. Канон — `kimi.com` / `www.kimi.com` (не `kimi.moonshot.cn`). |
| Z.ai (`zai`) | Zhipu | `chat.z.ai/*` | Shipped. Full export + MCP. |
| MiniMax (`minimax`) | MiniMax | `agent.minimax.io/*` | Shipped. Agent UI; не Hailuo / `chat.minimaxi.com`. |
| JanitorAI (`janitorai`) | JanitorAI | `janitorai.com/*`, `www.janitorai.com/*` | Shipped **extension-only** (export bar). Нет в protocol / MCP. |

Grok = **два продукта**:
1. Standalone — `grok.com`.
2. Чат в X — `x.com/i/grok` (+ `twitter.com`). Отдельный content script, не reuse `grok.js`.

GitHub Copilot web ≠ Bing Copilot ≠ Copilot in VS Code. Берём только chat на `github.com/copilot*`.

---

## Next (имеет смысл)

| Платформа | Host(s) | Заметки |
|-----------|---------|---------|
| Mistral Le Chat | `chat.mistral.ai/*` | Мб OK. |
| Character.ai | `character.ai/*`, `www.character.ai/*` | Consumer RP — OK. |
| Poe | `poe.com/*` | Multi-bot hub; низкий приоритет. |

### Не берём (мёртвое / шум)

- Microsoft Copilot / Bing chat (`copilot.microsoft.com`, Bing) — мёртв для нашей аудитории.
- Meta AI (`meta.ai`) — тоже нет.
- You.com, Pi, Phind, HuggingChat — не в приоритете, пока P0/P1 не закрыты.
- Весь `github.com/*` (issues/PR/code) — не чат; только `github.com/copilot*`.
- Legacy MiniMax / Hailuo hosts (`chat.minimaxi.com`, `hailuoai.com`) — не shipped; канон `agent.minimax.io`.

IDE-агенты (Cursor, Copilot in VS Code, Windsurf) — другой surface, не этот MV3 путь. Web Copilot Chat на github.com — **да**, см. Must-have.

---

## Приоритет внедрения

**P0 — закрыто (v2.0.3+)**
1. ChatGPT (`chatgpt.com`) — **shipped** (`content/chatgpt.js`)
2. Grok standalone (`grok.com`) — **shipped** (`content/grok.js`)
3. Grok on X (`x.com/i/grok` + `twitter.com/i/grok`) — **shipped** (`content/grok-x.js`)

**P1 — закрыто (v2.0.3+, кроме Gemini)**
4. Claude (`claude.ai`) — **shipped** (`content/claude.js`)
5. Gemini — **out of scope for v2**
6. DeepSeek (`chat.deepseek.com`) — **shipped** (`content/deepseek.js`)
7. Perplexity (`perplexity.ai`, `www.perplexity.ai`) — **shipped** (`content/perplexity.js`)
8. Qwen (`chat.qwen.ai`) — **shipped** (`content/qwen.js`)
8b. GitHub Copilot Chat (`github.com/copilot*`) — **shipped** (`content/copilot.js`)

**P2 — закрыто (bar + MCP, кроме JanitorAI)**
9. Kimi (`kimi.com`, `www.kimi.com`) — **shipped** (`content/kimi.js`) + MCP
10. Z.ai (`chat.z.ai`) — **shipped** (`content/zai.js`) + MCP
11. MiniMax (`agent.minimax.io`) — **shipped** (`content/minimax.js`) + MCP
12. JanitorAI (`janitorai.com`) — **shipped extension-only** (`content/janitorai.js`); не в protocol

**P2 Next**
13. Mistral Le Chat (мб)
14. Character.ai
15. Poe (если останется время)

---

## Архитектура

- Shared pipeline: `dist/shared.js` (Preact bar + export/PDF/zip + `CE.definePlatform`).
- Новый host = один `CE.definePlatform({…})` в `content/<id>.js` + `matches` в `manifest.json` + CSS modifier в `styles/<id>.css`.
- `manifest.json` → отдельный `matches` на каждый host; Grok X ≠ Grok.com.
- Не матчить весь `x.com/*` — только `/i/grok*`.
- SPA: re-inject bar после client navigation (`definePlatform` + `CE.observe`).
- Character / Janitor — multi-character threads, role labels свои; JanitorAI без MCP ops.

---

## Checklist hosts

```text
https://chatgpt.com/*
https://chat.openai.com/*
https://grok.com/*
https://x.com/i/grok*
https://twitter.com/i/grok*
https://claude.ai/*
https://gemini.google.com/*
https://chat.deepseek.com/*
https://www.perplexity.ai/*
https://perplexity.ai/*
https://chat.qwen.ai/*
https://github.com/copilot
https://github.com/copilot/*
https://kimi.com/*
https://www.kimi.com/*
https://chat.z.ai/*
https://agent.minimax.io/*
https://janitorai.com/*
https://www.janitorai.com/*
https://chat.mistral.ai/*
https://character.ai/*
https://www.character.ai/*
https://poe.com/*
```

Qwen / Kimi / Z.ai / MiniMax — перед релизом перепроверить канонический URL (redirect/CDN).

---

## Статус репо (12 extension / 11 MCP)

| Host | Platform ID | Status |
|------|-------------|--------|
| `chatgpt.com`, `chat.openai.com` | `chatgpt` | shipped (`content/chatgpt.js`) — full export + MCP |
| `grok.com` | `grok` | shipped (`content/grok.js`) — full export + MCP |
| `x.com/i/grok` + `twitter.com/i/grok` | `grok-x` | shipped (`content/grok-x.js`) — full chat + GrokDrawer |
| `github.com/copilot*` + home `/` composer | `copilot` | shipped (`content/copilot.js`) — mount when `#copilot-chat-textarea` visible |
| `claude.ai` | `claude` | shipped (`content/claude.js`) — full export + MCP + projects |
| `chat.qwen.ai` | `qwen` | shipped (`content/qwen.js`) — full export + MCP + reasoning blocks |
| `chat.deepseek.com` | `deepseek` | shipped (`content/deepseek.js`) — full export + MCP + DeepThink/Search |
| `perplexity.ai`, `www.perplexity.ai` | `perplexity` | shipped (`content/perplexity.js`) — full export + MCP + sources |
| `kimi.com`, `www.kimi.com` | `kimi` | shipped (`content/kimi.js`) — full export + MCP |
| `chat.z.ai` | `zai` | shipped (`content/zai.js`) — full export + MCP |
| `agent.minimax.io` | `minimax` | shipped (`content/minimax.js`) — full export + MCP |
| `janitorai.com`, `www.janitorai.com` | `janitorai` | shipped extension-only (`content/janitorai.js`) — export bar; **not** in protocol/MCP |
| Gemini + remaining Next hosts | — | **out of scope / not shipped** |

Обновлять при добавлении платформы (host + статус + DOM quirks).
