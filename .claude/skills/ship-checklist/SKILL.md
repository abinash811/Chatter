---
name: ship-checklist
description: Final gate before calling any slice of Chatter "done" — run before telling the user a feature/fix is complete, not just before committing. Checks the things that are easy to skip under time pressure.
---

# Ship checklist

Before saying a piece of work is done:

1. **`npm run check:all`** — the seven guardrail checks (tenant
   isolation, no vertical logic, no client secrets, design tokens, no
   raw `<button>`, barrel-only component imports, no file over 300
   lines).
2. **`npx tsc --noEmit`**.
3. **`node scripts/verify-rls.mjs`** if anything RLS-adjacent changed
   (a new tenant-scoped table, a new query path, a new index).
4. **`npm run build`** — the strict production build, not just `dev`
   compiling.
5. **`npm run canary`** (against a running build) if any route, layout,
   or auth-adjacent code changed.
6. **Docs still accurate?** — CLAUDE.md's "Current state" section
   (update it — this is the one most likely to silently go stale),
   README.md's "What's scaffolded so far" list, `docs/open-questions.md`
   (resolve or add an entry for anything newly discovered),
   `docs/features.md` if a feature shipped or changed, `docs/roadmap.md`
   if something moved out of Next/Later, `docs/architecture.md` if a
   design decision landed.
7. **A new UI page or pattern** — does a `docs/design/preview/` mockup
   exist for it? If not, one should be added (see CLAUDE.md's design
   rule).
8. **A new technical pattern** (library, tool, approach) — checked
   against `docs/research/current-practices.md`, or added there if it
   wasn't already covered?
9. **Any new gap deliberately deferred?** Say so explicitly — don't let
   a known limitation go unmentioned. See CLAUDE.md's guardrails: a
   feature that silently degrades below what a guardrail requires
   (tenant isolation, traceability, graceful tool fallback) is not done
   even if it compiles and runs.

None of this replaces actually running the thing — see CLAUDE.md's
"never commit code that hasn't actually been run." This checklist is
what to run, not a substitute for running it.
