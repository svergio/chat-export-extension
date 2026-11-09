# Conventions

- No emojis in code/logs/comments; comments rare, English, WHY only
- Content adapters: IIFE, `var CE = window.ChatExport`, early return if missing
- Mount via `CE.injectBar` + `CE.observe(mount)`; pass `nativeFrom`/`nativeClass` from the chip to clone (X Fast), `nativeIconFrom` outline attach — never filled white voice chip for format/dl
- Platform CSS modifier: `chat-export-bar--{modifier}`; X format label must force `flex-direction:row`, TwitterChirp stack, non-zero label height (X `css-g5y9jx` is column)
- Toolbar: Grok mark = official circle+slash from grok.com PNG (`icons/grok-mark-black.png`), not Fast lightning path
- Prefer Serena symbolic/fs tools over whole-file reads when navigating this repo
