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
3. **`npm run test:unit`** (`tests/unit/`, Vitest) — always, it's fast
   (~3s). Touched `lib/ai/` (the chat loop, gateway, tool registry,
   system prompt), a Zod schema, or any other pure/mockable logic?
   Add or update a spec, don't just eyeball it — this suite exists
   specifically because the engine itself had zero automated coverage
   of any kind before it was added.
4. **`node scripts/verify-rls.mjs`** if anything RLS-adjacent changed
   (a new tenant-scoped table, a new query path, a new index).
5. **`npm run build`** — the strict production build, not just `dev`
   compiling.
6. **`npm run canary`** (against a running build) if any route, layout,
   or auth-adjacent code changed.
7. **`npm run test:e2e`** (`tests/e2e/`, against a running build) if
   auth, the bot editor, or error-boundary behavior changed. This is
   the persistent regression suite — when you verify something new by
   hand with a throwaway script, that verification belongs in
   `tests/e2e/` as a real spec, not deleted after one run. A bug a
   manual script caught once is a bug that can silently come back;
   a spec file in the suite is the only thing that actually prevents
   that.
8. **`npm run test:visual`** (`tests/visual/`, against a running build)
   if any UI page/pattern actually changed on purpose. A failure here
   is expected and correct when you meant to change the look — update
   the baseline with `npm run test:visual:update` and say so in the
   commit; a failure you didn't expect is a real regression. Don't add
   a new visual spec for every screen reflexively — the existing ones
   (login, signup, bots empty/with-data, bot editor, sidebar) cover the
   shared chrome; add one when a genuinely new page/pattern ships (same
   bar as `docs/design/preview/`).
9. **Docs still accurate?** — CLAUDE.md's "Current state" section
   (update it — this is the one most likely to silently go stale),
   README.md's "What's scaffolded so far" list, `docs/open-questions.md`
   (resolve or add an entry for anything newly discovered),
   `docs/features.md` if a feature shipped or changed, `docs/roadmap.md`
   if something moved out of Next/Later, `docs/architecture.md` if a
   design decision landed, `docs/business-logic.md` if a core flow
   changed, `docs/api.md` if a route was added or its shape changed,
   `docs/glossary.md` if a new term was introduced.
10. **A new UI page or pattern** — does a `docs/design/preview/` mockup
   exist for it? If not, one should be added (see CLAUDE.md's design
   rule).
11. **A new technical pattern** (library, tool, approach) — checked
   against `docs/research/current-practices.md`, or added there if it
   wasn't already covered?
12. **Any new gap deliberately deferred?** Say so explicitly — don't let
   a known limitation go unmentioned. See CLAUDE.md's guardrails: a
   feature that silently degrades below what a guardrail requires
   (tenant isolation, traceability, graceful tool fallback) is not done
   even if it compiles and runs.
13. **Open Dependabot PRs relevant to what you touched.** ADR 0009: the
   Tailwind v3/v4 mismatch wasn't a detection gap — Dependabot had
   already opened a PR for it — it was a triage gap, nobody looked.
   Applies to any dependency (a framework, a UI library, a build tool),
   not just this one case. `list_pull_requests`/`search_pull_requests`
   (github MCP), filter to `dependabot[bot]`. A minor/patch bump
   touching a file you're already changing: fine to fold in. A major
   bump: triage it — mechanical and low-risk (a types package, a CI
   action, something the upstream project you're matching already
   requires) can be verified and merged in the same pass; a real
   framework major (Next.js, Prisma, TypeScript) needs its own
   dedicated migration effort — say so and leave it open, don't bundle
   it in silently and don't silently ignore it either.

None of this replaces actually running the thing — see CLAUDE.md's
"never commit code that hasn't actually been run." This checklist is
what to run, not a substitute for running it.
