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

## Building a new feature

Order, not a suggestion — skipping a step is how a filter bug, a missed
guardrail, or a redesign-after-the-fact happens. Applies whether the
request came with a full spec or was just "build X" — only step 1's
"ask" is conditional, everything else runs regardless of how the
request was phrased.

1. **Understand the requirement.** What's the actual goal, who's it
   for, what does "done" look like? Ambiguous, or a real design/
   architecture decision hiding in it? Ask — don't guess silently
   (`docs/open-questions.md`'s rule).
2. **Check design.** Does a `docs/design/preview/` mockup exist? If
   this is user-facing and none exists, add one — see `docs/design/
   principles.md` for the bar to build against, and Principle #10 if
   it's a record-editing screen. For composition/polish (density,
   hierarchy, whitespace, depth), work from documented Linear/Notion/
   Stripe conventions (`docs/research/design-system-standards.md`) —
   **not** CARE: ADR 0011 dropped CARE as a visual reference entirely,
   since this environment can't actually reach its live product
   (network egress blocks its whole domain family and GitHub's image
   CDNs alike) and its GitHub source is component code, not a design
   artifact — it doesn't show what a designer decided about density or
   polish. Need a UI primitive we don't have yet (Dialog, Table,
   Sidebar, Tabs, etc.)? Build it against `@base-ui/react` directly (for
   real behavior: focus trap, keyboard nav, ARIA) and our own tokens in
   `app/globals.css`, informed by the same Linear/Notion/Stripe
   conventions for how it should look. Do **not** pull CARE's component
   source verbatim (`scripts/pull-care-component.mjs` is no longer the
   default path, per ADR 0010 — it can still be handy for `--from
   <local-checkout>` reference-reading, nothing more): the 18 primitives
   pulled that way before that ADR produced three separate silent bugs
   (dead classes assuming a version/attribute we didn't actually have),
   none caught by `tsc` or the build, all caught only by a real
   screenshot. Add the export to `components/ui/index.ts` and verify
   with a real screenshot before considering it done, same as any other
   new UI pattern — and if it has any hover/focus/active state, verify
   that state with `getComputedStyle` before/after a real interaction,
   not just a screenshot (a 1-shade border change won't show up in one;
   see the `app/globals.css` cascade-layers bug this caught).
3. **Check data/security implications.** A new table or column? It's
   tenant-scoped unless there's a specific reason it isn't (`orgId` +
   an RLS policy + an index — `docs/security.md`). Touches secrets,
   auth, or the public widget surface? Same doc.
4. **Check current practice.** A new library or pattern? Check
   `docs/research/current-practices.md` first. A real choice with
   tradeoffs? Explain why/how others do it before asking — don't
   silently pick one (CLAUDE.md's process rules). Adopting an upstream
   project's design system or component source (ADR 0008)? Also check
   *its own* tooling major versions (build tool, CSS framework, etc.)
   against ours — a silent mismatch there won't show up in `tsc` or a
   build, only in the real page (ADR 0009). And check for an open
   Dependabot PR touching the same dependency before starting — it may
   have already flagged exactly this.
5. **Build**, following this file's naming/import/file-size rules and
   the design tokens.
6. **Verify for real.** Actually run it — a migration against a real
   database, a real browser flow — not just `tsc`. CLAUDE.md's "never
   commit code that hasn't actually been run." If that verification is
   a browser flow (auth, a form, anything a user clicks through), write
   it as a spec in `tests/e2e/` rather than a throwaway script — the
   whole point is that it keeps running on every future change, not
   just this one.
7. **Ship checklist.** Run the `ship-checklist` skill before calling it
   done.

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
- [ ] Keyboard-only pass: reach and operate every interactive element
      without a mouse
- [ ] Any new color usage (including widget-appearance defaults) meets
      the contrast target — see `docs/accessibility.md`
