# Host dropdown motion (CDT research)

Measured on live composer-neighbor menus. CE fmt before this change: opacity 1 / transform none / getAnimations empty from first paint (instant mount). Geometry was already synced in 2.1.2.

| platform | host control | duration_ms | easing | opacity | transform | origin / notes |
| --- | --- | --- | --- | --- | --- | --- |
| perplexity | Model (Radix) | 150 | open `cubic-bezier(0.16,1,0.3,1)`; close `cubic-bezier(0.7,0,0.84,0)` | 0→1 / 1→0 | scale(0.95)↔1 | `scaleAndFadeIn/Out`; radix transform-origin |
| kimi | kimi-menu | 150 | enter `(0,0,0.2,1)`; leave `(0.4,0,1,1)` | 0→1 | scale(0.85)→1 | Vue enter classes; origin top |
| zai | Select a model | 150 | `(0,0,0.2,1)` | 0→1 | scale(0.95) + blur(2px)→0 | `zai-menu-in` |
| copilot | Model Auto | 200 | `cubic-bezier(0.33,1,0.68,1)` | 0→1 | translateX(-8px)→0 (no scale) | Primer overlay-appear |
| grok | Model | 120 | `cubic-bezier(0,0,0,1)` | + | opacity+transform transition | snappy |
| deepseek | DS tokens | 100 | `(.4,0,.2,1)` | 0→1 | scale(0.8)→1 | `.ds-cross-fade` / zoom-in-expand |
| minimax | mavis-menu-surface | 180 | `cubic-bezier(0.08,0.82,0.17,1)` | 0→1 | scaleY(0.8)→1 | `dropdown-in`; origin top-left |
| janitorai | `._menu_5u9x3_1` | 250 | `cubic-bezier(.22,1,.36,1)` | 0→1 | translateY(-4px)→0 | origin right top |
| qwen | ant-dropdown | ~200 | Ant mid | 0→1 | antZoomBigIn scale 0.8 | |
| chatgpt | + / chat actions | instant | — | — | — | no enter anim |
| claude | Haiku model menu | instant | — | — | — | `cds-um-enter` unused on this menu |
| grok-x | Быстрый mode menu | instant | — | — | — | mid-open already opacity 1 |

## CE implementation mapping

- Shared baseline: Perplexity cluster (150ms, scale 0.95, easings above).
- Overrides: see platform CSS under `.chat-export-menu[data-chat-export-menu='…']`.
- chatgpt / claude / grok-x: opacity-only 100ms (host instant; no invented spring).
- `prefers-reduced-motion: reduce`: no transform/filter.
