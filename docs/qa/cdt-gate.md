# CDT gate

Live Chrome DevTools. **Not** unit/happy-dom.

## Sections vs `--full`

`--full` only **orchestrates** modules (no popup exhaust / 108× options):

| Section | What it does |
| --- | --- |
| `styles` | Skin×scheme×locale sample; drawers; `data-skin` / `data-scheme`; fmtParity hook (Agent B) |
| `ui-random` | Seeded CE-popup allowlist clicks + ExportBar **fmt-menu only** (never Скачать / host Download) |
| `usage` | All providers bar+ver; **export fidelity** (`chats.get` vs DOM); Folder\|Zip; Download toast; mode2/rebind; 1 platform toggle |
| `console` | FAIL (or explicit SKIP) on `[chat-export] unauthorized` / Token expired / save failed |

Debug only (not in `--full`): `--section=popup` exhaust.

Legacy aliases still accepted: `buttons` → `ui-random`; `providers` / `save` / `scenarios` for staged debug.

## Commands

| Use | Command |
| --- | --- |
| Default (usage) | `npm run test:cdt` |
| Usage | `npm run test:cdt -- --section=usage --open-missing --save=all` |
| Styles | `npm run test:cdt -- --section=styles` |
| UI random | `npm run test:cdt -- --section=ui-random --seed=42 --random-clicks=20` |
| Console | `npm run test:cdt -- --section=console` |
| Popup exhaust | `npm run test:cdt -- --section=popup` |
| **Once before release** | `npm run test:cdt:full` |

`test:cdt:full` = `--full --open-missing --save=all` → `styles` + `ui-random` + `usage` + `console`.

### Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `--full` | off | Orchestrate styles + ui-random + usage + console |
| `--section=` | `usage` | Comma list of sections |
| `--open-missing` | off | `new_page` provider start URLs when tab missing |
| `--save=` | usage/full → all; else zai,deepseek | Provider ids or `all` |
| `--no-save` | off | Skip download/save asserts |
| `--seed=` / `CE_CDT_SEED` | timestamp | Reproducible random (reported) |
| `--random-clicks=` | `40` | Max remaining popup allowlist clicks after structured samples |
| `--random-clicks-bar=` | `8` | Fmt-menu item/pack clicks per provider with bar |
| `--styles-sample=` | `12` | UI combos for styles |
| `--report=` | `docs/qa/<ver>-cdt-gate.md` | Report path |

## ui-random allowlist (CE popup only)

Hard-coded in `scripts/cdt-gate.mjs` as `UI_RANDOM_ALLOW` + blacklist. Host model menus / site Download — **never**.

### May random (sample)

| UI | Random? |
| --- | --- |
| Style (`ce-select`, ChatGPT…) | yes — open + 1 option |
| Theme (Dark/Light/Auto) | yes |
| Language (EN/RU/Auto) | yes |
| Platform toggles | yes — **1 seed-picked** off→on (not all 12) |
| Shift + click select | yes — option sample |
| Default schema select | yes |
| Per format Markdown/YAML/JSON/HTML/PDF schema | yes — sample 1–2 |
| Automation permission toggles | yes — sample 1 + restore |
| Advanced / Export settings drawers | yes — open-close |
| FAQ DisclosureTriangles | yes |

### Must not random (blacklist)

| UI | Why |
| --- | --- |
| Choose folder / Change folder | native picker |
| Forget folder | destructive |
| Rotate / Сменить token | destructive |
| Donate / external links | leave page |
| Скачать / Download chat | usage only (not ui-random) |
| Host Download / model dropdown | not CE |

### Export fidelity (`usage/*/fidelity`)

After bar PASS, before Download:

- RPC `chats.get` via extension SW (content-script world)
- DOM counts from `scripts/cdt-probes/export-fidelity.js`
- **FAIL** if: empty export on long body (MiniMax), Z.ai `domUserN > exportUserN`, Janitor first/last order reversed vs page top/bottom
- **SKIP** (not PASS) on landing / no chatId / content script not ready

### ExportBar

Fmt menu (MD…PDF) and Folder\|Zip are **mandatory in usage**, not replaced by random. Extra random **only** inside an already open CE fmt-menu (item/pack) — no Скачать, no folder-pill native.

## Prerequisites

```bash
chrome-devtools start --autoConnect --categoryExtensions --no-usage-statistics
```

Folder granted; chats with messages for save.

## Exit

`0` PASS/SKIP · `1` FAIL · `2` tooling
