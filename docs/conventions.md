# Conventions

Naming, imports, and review expectations — kept in one lean file rather
than split into many, matching Chatter's current size (a handful of
pages, one contributor so far). Split this out into separate files if
and when any one section outgrows a skim.

## Naming

| What | Convention | Example |
|---|---|---|
| Component file | `PascalCase.tsx` | `AuthShell.tsx` |
| Page file | Next.js convention (`page.tsx`, `layout.tsx`) | `app/login/page.tsx` |
| Non-component `.ts` file | `camelCase.ts` | `systemPrompt.ts` |
| Component/function name | `PascalCase` for components, `camelCase` for functions | `AuthShell`, `getCurrentSession` |
| Prisma model | `PascalCase` singular, `@@map`-ed to `snake_case` plural for the real table | `model BotConfigVersion` → `bot_config_versions` |
| API route folder | `kebab-case`, RESTful noun | `app/api/widget/config/route.ts` |
| Design token (CSS var) | `--kebab-case`, referenced as `bg-token-name` | `--muted-foreground` → `text-muted-foreground` |

Avoid: `data`/`temp`/generic names for anything that survives past one
function scope, negated booleans (`isNotReady` → `isReady`), abbreviating
a name to save a few characters (`cfg` → `config`).

## Shared components

Every shared UI primitive lives in `components/ui/` and is re-exported
from `components/ui/index.ts` (the barrel). **Import from the barrel,
never a specific file inside it**:

```ts
// Do this
import { Button, Input } from "@/components/ui";

// Not this
import { Button } from "@/components/ui/button";
```

Enforced by `scripts/check-component-imports.mjs` (part of `check:all`).
Page-specific chrome that only one or two pages share (like
`components/auth/AuthShell.tsx`) doesn't need a barrel — that's for
truly cross-cutting primitives only.

## File size

A file over ~300 lines (`scripts/check-file-length.mjs`, part of
`check:all`) is a signal to split it — a page that's grown into an
orchestrator should import components, not contain all their JSX
inline. Not a hard law; the check exists to catch drift early, not to
force an awkward split of something genuinely simple.

## Design pass

See `docs/design/README.md` and CLAUDE.md's "Where things live" — check
`docs/design/preview/` before building any new page.

## Git workflow

- Branch per unit of work off `main`; no long-lived branches.
- Commit messages: what changed and why, not a restatement of the diff —
  see recent commits for the expected level of detail.
- A hard-to-reverse decision (data model, storage/vendor choice, auth
  model, multi-tenancy strategy) gets an ADR (`docs/adr/`, `new-adr`
  skill) in the same PR as the code, not after.

## Review checklist

Before calling a page or feature done — whether reviewing your own work
or someone else's:

- [ ] `npm run check:all` and `npx tsc --noEmit` pass
- [ ] Actually run, not just read — see CLAUDE.md's "never commit code
      that hasn't actually been run"
- [ ] New page matches an existing `docs/design/preview/` mockup, or one
      was added if this is a new pattern
- [ ] No raw `<button>`, no hardcoded color, imports through the barrel
      (all three are mechanically checked, but read the diff too — the
      checks catch the letter of the rule, not always the spirit)
- [ ] Tenant-scoped queries go through `withOrgContext` (guardrail #1)
- [ ] No vertical-specific branching in core engine code (guardrail #2)
