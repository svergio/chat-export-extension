# AGENTS.md — chat-export-extension

Guidance for AI agents and humans working in this repo. Human detail: [CONTRIBUTING.md](./CONTRIBUTING.md). Sibling repos: `chat-export-server`, `chat-export-dashboard`.

## Branch policy (hard)

```
origin/test
  └─ feature/<name>  or  fix/<name>          ← product
        └─ test/<name>  or  <feature>-tests  ← tests for THAT change
              → merge tests into feature/fix
              → merge feature/fix into long-lived test
              → release: test → main + version tag
```

### If you want to test a feature

1. Use the existing **feature** / **fix** branch (product).
2. **Create a tests branch from it** (`test/<name>` or `<feature>-tests`).
3. Put adversarial / contract cases on the tests branch.
4. Merge tests → feature/fix, then feature/fix → long-lived **`test`**.
5. Never “ship product to `main`, tests later”. Never open ordinary feature PRs against `main`.

- After a release, sync `main` back into `test` if needed.
- Hotfix: still through `test`, with a tests branch on top when coverage is needed.
- **Cleanup:** delete short-lived `feature/*`, `fix/*`, `test/<name>` / `*-tests` after merge into long-lived `test` (local + remote). After release, delete leftovers that already landed. **Keep** long-lived `test`, `main`, and version tags.

### Commits / co-authors (Chat Export only)

**Allowed:** `Co-authored-by:` for the **AI agent** that did the work.

```
Co-authored-by: Cursor Agent <cursoragent@cursor.com>
```

Do not invent fake human co-authors. Outside Chat Export repos, co-author trailers stay forbidden.

## How to do a feature

1. Branch `feature/<name>` or `fix/<name>` from long-lived `test`.
2. Implement product change on that branch.
3. To validate: branch **tests** off the feature/fix branch; add adversarial coverage there; merge back.
4. Run local gates below on the combined tip; fix until green.
5. Open PR **into long-lived `test`**. Link related server/dashboard PRs if cross-repo.
6. Release is a separate maintainer step: `test` → `main` + tag. Do not bump/release unless asked.

New or changed **providers**: research-first — site map under `projects/Chat Export/docs/site-maps/<host>.md` before editing `content/<provider>.js`, protocol ids, or bridge matches. Prefer host API for list/get/delete; DOM hybrid for create/send. Same lowercase platform id everywhere (protocol, manifest, settings, bridge).

## Adversarial testing (break it, without fanaticism)

Goal: expose real failures in parsers, settings, export-bar DOM, and provider contracts with hostile but realistic inputs — on a **tests branch rooted in the feature/fix branch**, not on a random base.

| Area | Exercise |
|------|----------|
| `htmlToMarkdown` / `DOMParser` | Unclosed tags, script/style/iframe strip, nested fences, broken tables |
| Settings | Corrupt storage, stale `tosVersion` / `faqVersion`, bad ports, bogus enums |
| DOM harness | Missing nodes, busy overlay races (deterministic waits only) |
| Providers | Bridge start URLs + ops shape for all shipped platform ids |
| Export schemas | Fixture chats → each schema × md/json/yaml |

**Boundaries:** no 10k-iteration fuzz, no multi-minute sleeps in default CI, no destructive sweeps on real user chats. Keep `npm test` deterministic and **under ~15s**.

Live E2E / MCP (server side): **`[ce-test]`**-prefixed chats only.

## Commands

```bash
npm test              # unit + DOM
npm run test:unit
npm run test:dom
npm run build         # before pack / release paths
npm run pack          # release / CI pack verify
```

## Failed CI / MR review

Before proposing fixes, post a four-part report:

1. **What broke** — job/command, test name, key assertion lines
2. **Why it broke** — cited diff, log, or fixture line (no free speculation)
3. **Impact** — which gate / platforms / release risk
4. **Fix direction** — concrete file/command next

## Workspace rules (Cursor maintainer tree)

When working from the NodeRed monorepo checkout, also honor:

- `.cursor/rules/chat-export-test-branch-adversarial.mdc`
- `.cursor/rules/chat-export-provider-research.mdc`
- `.cursor/rules/chat-export-mr-review-after-tests.mdc`
- `.cursor/rules/no-git-coauthors.mdc` (agent Co-authored-by **only** in Chat Export)
