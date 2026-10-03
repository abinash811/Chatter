# ADR 0033: Upgrade to TypeScript 7 and Next.js 16

Status: accepted

Date: 2026-10-02

## Context

Dependabot opened PRs for four framework majors back on 2026-09-26 (PR
#5 Next.js 15→16, PR #8/#4 Prisma 5→7 for `prisma`/`@prisma/client`, PR
#10 TypeScript 5→7). A dependency sweep that same day deliberately left
all four open rather than bundling them into a same-pass triage —
CLAUDE.md's "Known gaps" has carried "4 Dependabot majors deliberately
deferred" ever since, through every session, without anyone actually
picking up the migration work.

The user asked to resolve this. Each major was checked against our
actual code, not assumed from generic release notes, before deciding
anything:

- **TypeScript 7**: ships a new Go-based compiler and new defaults
  (`strict: true`, ES2022 target, drops `moduleResolution: "node"` and
  a few other pre-6.0-deprecated options to hard errors). Our
  `tsconfig.json` already has `strict: true`, `target: "ES2022"`, and
  `moduleResolution: "bundler"` — exactly what TS7 expects — and we
  only use `tsc` for type-checking (`noEmit: true`; Next's own compiler
  does the real build), so TS7's emit-target changes don't apply to us
  at all.
- **Next.js 16**: its real breaking changes are a `middleware.ts` →
  `proxy.ts` rename, `revalidateTag()` requiring a second argument,
  parallel routes needing a `default.js`, and dropped Node 18 support.
  Grepped the codebase: **no** `middleware.ts`, **no** `revalidateTag`
  calls, **no** parallel routes (`@folder`) anywhere in `app/`. None of
  Next 16's actual breaking changes touch this codebase.
- **Prisma 7** (both `prisma` and `@prisma/client`): deliberately
  **not** included here — see Consequences below.

## Decision

Upgrade `typescript` to `^7.0.2` and `next` to `^16.3.8` (installed via
`npm install`, then Next's own official codemod,
`npx @next/codemod@canary upgrade latest -y --skip-eslint-upgrade
--skip-react-upgrade`, run to catch anything the manual grep might have
missed — it reported no code transforms needed, confirming the
grep-based risk assessment above). `--skip-eslint-upgrade` because this
project has no ESLint config at all (guardrails are the custom
`scripts/check-*.mjs` suite instead); `--skip-react-upgrade` because
`react@19.0.0`/`react-dom@19.0.0` already satisfy Next 16's peer range
(`^19.0.0`).

Next's own build process made two tsconfig.json changes automatically
on the first `next build` under v16, kept as-is since Next's tooling
made them deliberately with its own stated reasons: `jsx` changed from
`"preserve"` to `"react-jsx"` (mandatory — Next 16 uses the React
automatic JSX runtime) and `.next/dev/types/**/*.ts` added to
`include` (suggested, for dev-mode generated types).

## Alternatives considered

- **Bundle all four Dependabot majors into one pass, including
  Prisma** — rejected. Prisma 7 isn't a version bump, it's an
  architecture change: the old `prisma-client-js` generator we use
  today is replaced by a new `prisma-client` generator that requires an
  explicit driver adapter (e.g. `@prisma/adapter-pg`) instead of
  Prisma's built-in engine, plus a new `prisma.config.ts` config file
  and changed generated-client import paths across 10+ files. It
  directly touches `lib/db.ts`'s `withOrgContext` — the literal
  mechanism enforcing guardrail #1 (tenant isolation via RLS). Doing
  that in the same pass as two low-risk bumps would risk rushing the
  one migration that actually needs care.
- **Keep deferring all four indefinitely** — rejected per the user's
  explicit request to close this gap; also the longer any major version
  sits unaddressed, the further behind (and the harder to eventually
  migrate) the codebase gets.

## Consequences

TypeScript and Next.js are current. Prisma 5→7 (`prisma` + `@prisma/
client`, Dependabot PRs #8 and #4) remains open and deliberately
deferred — now the only entry left in CLAUDE.md's "Dependabot majors
deferred" line — as its own dedicated future pass: the driver-adapter
rewrite, a fresh `scripts/verify-rls.mjs` run against a real Postgres
instance, and its own ADR given it changes how tenant isolation is
wired, not just a dependency version.

The grep-based risk assessment above was right that nothing broke from
Next 16's *documented* breaking changes — but the full verification
sweep (never just `tsc`+build, per CLAUDE.md's own rule) caught two
real regressions neither codemod nor grep could have found, since
neither is a documented breaking change — they're incidental rendering
differences from the new build pipeline:

1. **A real a11y regression**: the full `tests/e2e/accessibility.spec.ts`
   run (not just `tsc`/build) found 9 pages newly failing WCAG AA color
   contrast. Root-caused (not assumed) via a real in-browser contrast
   calculator against three design tokens (`--muted-foreground`,
   `--destructive`, and `AuthShell.tsx`'s `text-panel-foreground/45`) —
   each was already razor-thin (4.0-4.36:1 against the 4.5:1 minimum)
   under the old build and a small color-math rounding shift in the new
   Turbopack/Lightning CSS pipeline tipped several over the line at
   once. Confirmed via bisection (reverted to the old deps, same test
   passed) that this was genuinely new, not pre-existing and newly
   caught. Fixed at the token level with real contrast math, not
   patched per-element: `--muted-foreground` 55.6%→48% L (6.04:1),
   `--destructive` 57.7%→45% L (6.02-6.91:1 across every real usage
   site checked — badges, button text, error text), `/45`→`/60` opacity
   on the one `AuthShell.tsx` usage (7.04:1). All three land with real
   margin now, not another razor-thin pass.
2. **A real rendering regression**: 6 of `tests/e2e/`'s "seeded X appear
   in the list" specs failed with a heading-not-found error. The actual
   accessible name had changed from `"Leads 2"` to `"Leads2"` (no
   space) — every page with a `<h1>Label{count > 0 && <span>{count}
   </span>}</h1>` pattern (Bots, Leads, Data sources, Custom actions,
   Widgets, Conversations — 6 files) relied on incidental JSX
   whitespace between the label text and the conditional span, which
   the new build's JSX-to-DOM output no longer preserves the same way.
   Confirmed via the same bisection as above. Fixed by making the space
   explicit (`Label{" "}`) rather than relying on incidental
   whitespace-trimming behavior, which is the more robust fix
   regardless of the exact mechanism — not something to keep depending
   on implicitly.

Both were caught only because the full `tests/e2e/` and
`tests/e2e/accessibility.spec.ts` suites were run, not just `tsc` and
`npm run build` — exactly the class of bug CLAUDE.md's "never commit
code that hasn't actually been run" rule exists for.

Not hard to reverse: the dependency bumps themselves are a plain
`package.json` downgrade if ever needed. The two fixes above are real,
standalone improvements independent of the upgrade (the contrast debt
and the whitespace fragility were already real, just unexposed) — they
wouldn't need reverting even if the dependency bumps were.
