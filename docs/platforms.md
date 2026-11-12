# Платформы AI-чатов (для host coverage)

Цель: веб-чаты, на которых вешать export bar. Не весь Similarweb — только то, чем реально пользуются.

Сейчас в расширении: **только** `grok.com` + `chatgpt.com`.

---

## Must-have

| Платформа | Vendor | Host(s) для `matches` | Заметки |
|-----------|--------|------------------------|---------|
| ChatGPT | OpenAI | `chatgpt.com/*`, legacy `chat.openai.com/*` | Уже есть. |
| Claude | Anthropic | `claude.ai/*` | Projects / Artifacts — отдельный DOM. |
| Gemini | Google | `gemini.google.com/*` | OK. Иногда `bard.google.com` redirect. |
| DeepSeek | DeepSeek | `chat.deepseek.com/*` | OK. |
| Grok (standalone) | xAI | `grok.com/*` | Уже есть. |
| Grok (в X / Twitter) | xAI / X | `x.com/i/grok*`, `twitter.com/i/grok*` | **Отдельный UI**, не grok.com. URL: `https://x.com/i/grok`. |
| Perplexity | Perplexity | `perplexity.ai/*`, `www.perplexity.ai/*` | Sources/цитаты важны для export. |
| Qwen | Alibaba | `chat.qwen.ai/*` (+ CN mirrors по live check) | Зеркала меняются — сверять host перед matches. |
| GitHub Copilot Chat (web) | GitHub | `github.com/copilot`, `github.com/copilot/c/*` (+ agents/spaces по live) | Нативного export чата нет («Download» = desktop app). Не матчить весь `github.com/*`. Composer: `#copilot-chat-textarea`, layout `[data-testid="chat-layout"]`. |

Grok = **два продукта**:
1. Standalone — `grok.com`.
2. Чат в X — `x.com/i/grok` (+ `twitter.com`). Отдельный content script, не reuse `grok.js`.

GitHub Copilot web ≠ Bing Copilot ≠ Copilot in VS Code. Берём только chat на `github.com/copilot*`.

---

## Next (имеет смысл)

| Платформа | Host(s) | Заметки |
|-----------|---------|---------|
| Kimi | `kimi.moonshot.cn/*`, `www.kimi.com/*` | OK. Hosts менялись. |
| MiniMax | `chat.minimaxi.com/*`, `www.minimaxi.com/*`, `hailuoai.com/*` (live check) | OK. |
| Mistral Le Chat | `chat.mistral.ai/*` | Мб OK. |
| Character.ai | `character.ai/*`, `www.character.ai/*` | Consumer RP — OK. |
| JanitorAI | `janitorai.com/*`, `www.janitorai.com/*` | Рядом с Character.ai — брать вместе. |
| Poe | `poe.com/*` | Multi-bot hub; низкий приоритет. |

### Не берём (мёртвое / шум)

- Microsoft Copilot / Bing chat (`copilot.microsoft.com`, Bing) — мёртв для нашей аудитории.
- Meta AI (`meta.ai`) — тоже нет.
- You.com, Pi, Phind, HuggingChat — не в приоритете, пока P0/P1 не закрыты.
- Весь `github.com/*` (issues/PR/code) — не чат; только `github.com/copilot*`.

IDE-агенты (редакторы с встроенным ассистентом) — другой surface, не этот MV3 путь. Web Copilot Chat на github.com — **да**, см. Must-have.

---

## Приоритет внедрения

**P0 — уже / добить**
1. ChatGPT (`chatgpt.com`)
2. Grok standalone (`grok.com`)
3. Grok on X (`x.com/i/grok` + `twitter.com/i/grok`)

**P1**
4. Claude  
5. Gemini  
6. DeepSeek  
7. Perplexity  
8. Qwen  
8b. GitHub Copilot Chat (`github.com/copilot*`) — nominated; native export отсутствует  


**P2**
9. Kimi  
10. MiniMax  
11. Mistral Le Chat (мб)  
12. Character.ai + JanitorAI (парой)  
13. Poe (если останется время)

---

## Архитектура

- Shared pipeline (`shared.js`); на host — тонкий `content/<platform>.js`.
- `manifest.json` → отдельный `matches` на каждый host; Grok X ≠ Grok.com.
- Не матчить весь `x.com/*` — только `/i/grok*`.
- SPA: re-inject bar после client navigation.
- Character / Janitor — multi-character threads, role labels свои.

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
https://kimi.moonshot.cn/*
https://www.kimi.com/*
https://chat.minimaxi.com/*
https://www.minimaxi.com/*
https://chat.mistral.ai/*
https://character.ai/*
https://www.character.ai/*
https://janitorai.com/*
https://www.janitorai.com/*
https://poe.com/*
```

Qwen / Kimi / MiniMax — перед релизом перепроверить канонический URL (redirect/CDN).

---

## Статус репо

| Host | Status |
|------|--------|
| `grok.com` | shipped (`content/grok.js`) |
| `chatgpt.com` | shipped (`content/chatgpt.js`) |
| `x.com/i/grok` + `twitter.com/i/grok` | shipped (`content/grok-x.js`) — full chat |
| `x.com/*` GrokDrawer (Анализ поста) | shipped (`content/grok-x.js`) — mount only when drawer/composer present |
| `github.com/copilot*` | **нет** — DOM sniff 2026-11-09: `#copilot-chat-textarea`, no chat export |
| остальное из P1/P2 | **нет** |

Обновлять при добавлении платформы (host + статус + DOM quirks).
