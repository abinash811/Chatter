# ADR 0034: Upgrade to Prisma 7

Status: accepted

Date: 2026-10-02

## Context

ADR 0033 resolved 2 of the 4 Dependabot majors deliberately deferred
since 2026-09-26 (Next.js 16, TypeScript 7), deliberately leaving
Prisma 5→7 (`prisma` + `@prisma/client`, Dependabot PRs #8/#4) for its
own pass — it's not a version bump, it's an architecture change that
touches `lib/db.ts`'s `withOrgContext`, the literal mechanism enforcing
guardrail #1 (tenant isolation via Postgres RLS). Getting that wrong is
a tenant-isolation bug, not a cosmetic one, so this needed its own
careful pass with real verification against a real Postgres instance,
not a speculative one.

`prisma.io`'s docs site stayed network-blocked throughout (consistent
with every prior session this environment has run in) — every claim
below was confirmed by actually running the real installed CLI and
reading its real error messages and type definitions, not by trusting
secondary-source summaries (WebSearch results, blog posts) at face
value. Two real findings only surfaced this way:

- **npm's `latest` dist-tag for `prisma` already points to an `8.0.0`
  release candidate**, not 7.x — `npm view prisma version` returns
  `8.0.0-rc.19`. Pinned explicitly to `7.10.0` (the exact version the
  open Dependabot PRs targeted, confirmed the latest real stable 7.x
  release via `npm view prisma versions`), not `latest` — same lesson
  as ADR 0024's TanStack Table pin.
- **The old `prisma-client-js` generator (what this codebase already
  uses) still works, unchanged, under Prisma 7.10.0** — confirmed by
  actually running `prisma generate` with it, no deprecation warning
  shown. Every secondary source describing "the Prisma 7 migration"
  assumed the new `prisma-client` generator (a different output
  location, every `@prisma/client`-importing file's import path
  changes), which is real and Prisma's recommended long-term path, but
  is not the only option today.

## Decision

**Keep the existing `prisma-client-js` generator**, not the new
`prisma-client` one — confirmed via the user's own explicit choice
after the tradeoff was explained (fewer files touched now, a second
real migration to the new generator stays available as its own later,
lower-stakes pass, vs. a bigger diff in the same pass that's already
touching RLS). Concretely, this meant:

- `prisma`/`@prisma/client` bumped to `7.10.0`; `@prisma/adapter-pg`
  (`7.10.0`, matching) added as a new real dependency — `pg` was
  already a dependency (`scripts/apply-sql-migrations.mjs` uses it
  directly), so no new driver library.
- **A driver adapter is now mandatory at runtime** — confirmed by
  constructing `new PrismaClient()` with no arguments and reading the
  real thrown error, not assumed from docs. Every real
  `new PrismaClient()` call site in this codebase (exactly 3:
  `lib/db.ts`, `lib/auth.ts`, `scripts/verify-rls.mjs`) now passes
  `{ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) }`.
  No other file changes — every other `@prisma/client` import in this
  codebase is type-only (`import type { Prisma }`), unaffected by
  keeping the old generator's output location unchanged.
- **`schema.prisma`'s `datasource` block can no longer hold a
  connection `url` at all** — confirmed as a hard error by running
  `prisma generate` against the old shape before changing anything.
  Moved to a new `prisma.config.ts` (now mandatory for `prisma
  generate`/`migrate`), read via Prisma's own `env()` helper.
- **A real, undocumented regression caught only by running the full
  e2e suite, not just `tsc`+build**: Prisma 5's engine quietly
  auto-loaded `.env` for any consumer needing the schema's `url =
  env(...)`. With the adapter, *we* read `process.env.DATABASE_URL`
  ourselves — and Node doesn't auto-load `.env`. Next.js's own server
  already loads `.env` itself, so the running app was fine, but
  `tests/e2e/helpers.ts` (Playwright's own Node process, not Next) and
  `scripts/verify-rls.mjs` don't — 31 e2e specs failed with "User was
  denied access on the database `(not available)`" until this was
  found and fixed. Fixed with the same `process.loadEnvFile()`
  defensive pattern already used in `scripts/apply-sql-
  migrations.mjs`/`scripts/predev-check.mjs`, added to `lib/db.ts`
  itself (so every consumer gets it for free) and `scripts/verify-
  rls.mjs`.
- **A real, unrelated security finding** while installing: `npm audit`
  flagged `prisma`'s own transitive `mysql2` (auth-downgrade CVE) and
  `deepmerge-ts` (stack-exhaustion CVE) — pinned via `package.json`'s
  `overrides` to patched versions (`mysql2@^3.24.5`,
  `deepmerge-ts@^8.0.2`), same pattern as ADR 0032's `axios` fix.

## Alternatives considered

- **Switch to the new `prisma-client` generator in this same pass** —
  Prisma's own recommended long-term path, but touches the 11 files
  that import from `@prisma/client` (mostly type-only imports, low
  individual risk, but more surface area in the one pass already
  touching the RLS-critical client-construction code). Explained to
  the user as a real tradeoff, not silently decided — deferred as its
  own future pass, not ruled out.
- **Install `prisma@latest`** — would have silently landed on an
  `8.0.0` release candidate, not the stable `7.10.0` the actual
  deferred Dependabot PRs targeted. Rejected per `npm view`, not
  assumed.

## Consequences

All 4 of the originally-deferred Dependabot majors are now resolved
(ADR 0033 + this one). RLS/tenant isolation re-verified for real against
a live local Postgres instance (`node scripts/verify-rls.mjs`, all 3
assertions passing) — the one piece of this migration that genuinely
could not be verified by reading code or `tsc` alone, matching
CLAUDE.md's "never commit code that hasn't actually been run" rule
exactly.

The new `prisma-client` generator migration is now a real, separate,
future item (not urgent — the old generator works today, no
deprecation warning), to be done as its own pass when it comes up,
touching the 11 `@prisma/client`-importing files this pass deliberately
left alone.

Not hard to reverse on its own: the adapter wiring is 3 files, `
prisma.config.ts` is one new file, `schema.prisma`'s change is one
line. The genuinely hard-to-reverse part is downstream of any schema
migration in general (not specific to this upgrade) — standard
caution for any future Prisma-schema change applies as it always has.
