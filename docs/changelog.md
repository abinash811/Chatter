# Changelog — detailed session history

The full narrative history CLAUDE.md's "Current state" used to hold
directly: what was built, the real bugs caught while verifying it, and
how each was fixed. Moved here 2026-09-26 (user's explicit call —
CLAUDE.md had grown into a multi-thousand-word log, defeating its job
as a fast-navigation entry point) so CLAUDE.md can stay short and this
file can stay as long and as detailed as the work actually was.

**How to use this file:**
- New entries go at the bottom (chronological, oldest first — matches
  the order below).
- Write it the way the entries below are written: what changed, the
  real bugs found while verifying (not hypothetical ones), what was
  actually run to confirm it. This is where that detail belongs now —
  CLAUDE.md's "Current state" should stay a short pointer, not a copy.
- `docs/features.md` is the catalog (what's built, by feature, no
  history); `docs/roadmap.md` is what's next; this file is how we got
  here and what broke along the way. Don't duplicate between them —
  a one-line summary in CLAUDE.md, the catalog entry in features.md,
  the full story here.

**Archival policy (added 2026-09-27):** this file is a *living* doc,
which means it grows forever unless capped — the same failure mode
CLAUDE.md itself had. When it crosses roughly 500 lines, move its
oldest entries verbatim into a new `docs/changelog/<label>.md` (see
`docs/changelog/2026-09-part1.md` for the first one) and leave a
one-line pointer here. Nothing is lost, the live file just stays a
size someone will actually read start-to-finish.
`scripts/check-doc-length.mjs` flags this file (and every other living
doc) once it crosses the threshold, so this isn't just a rule to
remember — it's checked at commit time.

**Earlier history**: `docs/changelog/2026-09-part1.md` — everything
from the original CARE-based design system through ADR 0016
(conversation inbox made non-technical); `docs/changelog/
2026-09-part2.md` — the CARE-to-shadcn migration (ADR 0017) through the
bot top bar's shared-across-pages rework; `docs/changelog/
2026-09-part3.md` — skeleton loading states through the /bots list's
rebuild onto the real CARE `Table` (ADR 0008); `docs/changelog/
2026-09-part4.md` — the real unit-test layer standing up, visual
regression testing, and the depth/polish passes for Knowledge,
Settings, Integrations, and the Conversations Activity rebuild (ADR
0027); `docs/changelog/2026-10-part1.md` — In-chat widgets Phase 2
(functions that call a real API, ADR 0028); `docs/changelog/
2026-10-part2.md` — Guardrails Phase 1 (ADR 0029), real multi-page site
crawling (ADR 0030), the JS-rendering fallback (ADR 0031), and the
Firecrawl last-resort fallback (ADR 0032).

---

- **TypeScript 7 + Next.js 16 upgrade, 2 of 4 deferred Dependabot
  majors resolved (2026-10-02, ADR 0033)**: user asked to resolve the
  "4 Dependabot majors deliberately deferred" line CLAUDE.md's "Known
  gaps" had carried since 2026-09-26 without anyone picking up the
  actual work. Checked each major against this codebase's real usage
  before deciding anything (not generic release notes): TypeScript 7's
  new defaults (`strict`, ES2022 target, `moduleResolution`) already
  matched our `tsconfig.json` exactly; Next 16's real breaking changes
  (`middleware.ts`→`proxy.ts`, `revalidateTag()`'s new required
  argument, parallel routes needing `default.js`) don't exist anywhere
  in this codebase (grepped, not assumed). Prisma 5→7 deliberately
  **not** included — it's an architecture change (new `prisma-client`
  generator, required driver adapters, a new `prisma.config.ts`)
  touching `lib/db.ts`'s RLS mechanism directly, staying its own
  dedicated future pass with its own ADR.
  `typescript@7.0.2` and `next@16.3.8` installed, then Next's own
  official codemod (`npx @next/codemod@canary upgrade latest -y
  --skip-eslint-upgrade --skip-react-upgrade`) run to catch anything
  grep might have missed — confirmed no code transforms were needed,
  matching the risk assessment. `--skip-eslint-upgrade` because this
  project has no ESLint config at all; `--skip-react-upgrade` because
  `react@19`/`react-dom@19` already satisfied Next 16's peer range.
  **Two real, undocumented regressions caught only by running the full
  verification sweep, not just `tsc`+build** (exactly the class of bug
  CLAUDE.md's "never commit code that hasn't actually been run" rule
  exists for):
  (1) A real WCAG AA color-contrast regression — the full
  `accessibility.spec.ts` run found 9 pages newly failing. Root-caused
  with a real in-browser contrast calculator (composited fg-over-bg on
  a canvas, read back actual sRGB bytes, computed relative luminance
  per the real WCAG formula — not oklch math by hand) rather than
  guessed: 3 design tokens (`--muted-foreground`, `--destructive`, and
  `AuthShell.tsx`'s `text-panel-foreground/45`) were already razor-thin
  (4.0-4.36:1 against the 4.5:1 minimum) before this upgrade, and a
  small color-math rounding shift in the new Turbopack/Lightning CSS
  pipeline tipped several over the line at once. Confirmed genuinely
  new (not newly-caught-but-pre-existing) by bisecting: reverted to the
  old deps, the same test passed clean. While investigating, also found
  `docs/design/design-system.md`'s own prior "4.74:1, verified" claim
  for `muted-foreground` had checked it against `--background` (white)
  instead of `--muted` (97% L) — the backdrop it's actually paired with
  at every real usage site — a methodology gap in the original
  verification, not just a stale number. Fixed at the token level with
  real contrast math against every real pairing (not patched
  per-element, not re-verified against one convenient backdrop):
  `--muted-foreground` 55.6%→48% L (6.04:1), `--destructive` 57.7%→45%
  L (6.02-6.91:1 across every usage site — badges, button text, error
  text), `/45`→`/60` opacity on `AuthShell.tsx`'s one usage (7.04:1).
  `docs/design/design-system.md` and `docs/design/audit.md` both
  corrected with the real numbers and the methodology lesson, not just
  the new values.
  (2) A real JSX-rendering regression — 6 of `tests/e2e/`'s "seeded X
  appear in the list" specs failed with a heading-not-found error. The
  rendered accessible name had silently changed from `"Leads 2"` to
  `"Leads2"` (no space) on every page using the pattern `<h1>Label
  {count > 0 && <span>{count}</span>}</h1>` (Bots, Leads, Data sources,
  Custom actions, Widgets, Conversations — 6 files, found via a
  codebase-wide grep, not assumed to be isolated to the one failing
  test first noticed). These relied on incidental JSX whitespace
  between the label text and the conditional span, which the new
  build's output no longer preserves the same way. Confirmed genuinely
  new via the same bisection as the contrast issue. Fixed by making the
  space explicit (`Label{" "}`) at all 6 sites rather than patching the
  one test or depending on the old incidental behavior again — a
  whitespace-only text node doesn't generate a visible flex item, so
  this didn't add any visual gap (confirmed via the regenerated visual
  baselines, pixel-reviewed by hand).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (231 tests, unchanged — this pass
  touched no unit-tested logic); the full `tests/e2e/` suite (117/117
  passing after both fixes, confirmed clean twice); the full
  `accessibility.spec.ts` suite (15/15, 0 serious/critical violations,
  up from 9 failing); all 19 `tests/visual/` baselines regenerated
  (13 genuinely changed pixels from the contrast fix, 6 pixel-identical)
  and manually reviewed — the spacing fix introduced no visible layout
  change, the contrast fix is visibly legible without looking washed
  out or jarring.

- **Prisma 7 upgrade, closing the last 2 deferred Dependabot majors
  (2026-10-02, ADR 0034)**: user asked to close out the "Prisma
  5→7 (client+CLI) deliberately deferred" item ADR 0033 had left. The
  highest-risk of the 4 original Dependabot majors — a real
  architecture change, not a version bump, touching `lib/db.ts`'s
  `withOrgContext` (the literal mechanism enforcing guardrail #1,
  tenant isolation via RLS) — so this got its own dedicated pass with
  real verification, not folded into the earlier TS/Next pass.
  `prisma.io`'s docs stayed network-blocked (consistent with every
  prior session), so everything below was confirmed by actually
  running the real installed CLI and reading its real errors/type
  definitions, not trusted from secondary-source summaries.
  Two real findings from that approach: (1) npm's `latest` dist-tag for
  `prisma` already points to an `8.0.0` release candidate — pinned
  explicitly to `7.10.0` (the exact version the open Dependabot PRs
  targeted, confirmed via `npm view prisma versions` as the latest real
  stable 7.x), same lesson as ADR 0024's TanStack Table pin; (2) the
  existing `prisma-client-js` generator still works completely
  unchanged under 7.10.0 (confirmed by running `prisma generate` with
  it, no deprecation warning) — every secondary source describing "the
  Prisma 7 migration" assumed the newer `prisma-client` generator
  (different output location, 11 files' import paths change), which is
  real and Prisma's recommended path, but not the only one available
  today.
  Presented this as a genuine tradeoff before building anything (per
  CLAUDE.md's process rule): keep the old generator now (3 files
  change: `lib/db.ts`, `lib/auth.ts`, `scripts/verify-rls.mjs` — the
  only 3 real `new PrismaClient()` call sites) vs. switch to the new
  one in the same pass (14 files, bigger diff in the pass already
  touching RLS). User chose the smaller, old-generator path, deferring
  the generator switch as its own future pass.
  Real, confirmed-by-running requirements, not assumed: a driver
  adapter (`@prisma/adapter-pg`) is now mandatory at runtime —
  constructing `new PrismaClient()` with no arguments throws a real
  error naming this; `schema.prisma`'s `datasource` block can no longer
  hold a connection `url` at all (hard error, confirmed before changing
  anything) — moved into a new, mandatory `prisma.config.ts`.
  Real regression caught only by running the full e2e suite, not just
  `tsc`+build: Prisma 5's engine quietly auto-loaded `.env` for any
  `PrismaClient` consumer; with the adapter, *this codebase* now reads
  `process.env.DATABASE_URL` directly, and Node doesn't auto-load
  `.env` on its own. Next.js's own server already loads `.env`, so the
  running app was fine, but `tests/e2e/helpers.ts` (Playwright's own
  Node process) and `scripts/verify-rls.mjs` don't — 31 e2e specs
  failed with "User was denied access on the database `(not
  available)`" until this was found and fixed with the same
  `process.loadEnvFile()` defensive pattern already used in
  `scripts/apply-sql-migrations.mjs`/`scripts/predev-check.mjs`, added
  to `lib/db.ts` itself (every consumer gets it for free) and
  `scripts/verify-rls.mjs`.
  Real, unrelated security finding while installing: `npm audit`
  flagged `prisma`'s own transitive `mysql2` (auth-downgrade CVE) and
  `deepmerge-ts` (stack-exhaustion CVE) — pinned via `package.json`'s
  `overrides` to patched versions, same pattern as ADR 0032's `axios`
  fix.
  Verified: `npx tsc --noEmit` clean; a production build; all 10
  `check:all` guardrails; full unit suite (231, unchanged — Prisma is
  mocked at the module boundary in every test); `node scripts/verify-
  rls.mjs` run for real against a live local Postgres instance, all 3
  tenant-isolation assertions passing (the one piece of this migration
  that genuinely couldn't be verified by reading code or `tsc` alone);
  the full `tests/e2e/` suite (117/117 after the env-loading fix,
  confirmed clean — the 1 failure before that was the pre-existing,
  already-documented toast-timeout flake, confirmed by an isolated
  re-run); the full `accessibility.spec.ts` suite (15/15, 0
  violations); `npm audit` clean of the new findings. All 4 of the
  originally-deferred Dependabot majors are now resolved.

- **Reranking via Voyage rerank-2 (2026-10-02, ADR 0035).** The next
  concrete RAG item named in `docs/roadmap.md`, unblocked once the eval
  harness existed to measure it with real numbers instead of picking a
  vendor on reputation. Explained the real tradeoff to the user before
  building (Voyage `rerank-2`, same vendor/key as embeddings, vs. Cohere
  Rerank v3.5, a third AI vendor) and confirmed the choice ("Go ahead
  and build it with Voyage") — including a direct follow-up question
  about switching cost later, answered honestly: a `RerankProvider`
  interface (`lib/ai/rerank.ts`, mirroring `ModelGateway`/
  `EmbeddingsProvider`) keeps a future Cohere swap to one new provider
  class + one new env var + a factory-line change, no caller code.
  Both `docs.voyageai.com` and `api.voyageai.com` stayed network-blocked
  in this environment — read the real, official `voyageai` npm TS SDK's
  source instead (installed temporarily via `npm install --no-save`,
  removed after reading), confirmed the real endpoint
  (`POST https://api.voyageai.com/v1/rerank`), and — a real finding —
  the wire-format request/response body is snake_case
  (`top_k`/`return_documents`/`relevance_score`) even though the SDK's
  own TS-facing types are camelCase; implemented via plain `fetch`
  matching `VoyageEmbeddingsProvider`'s existing pattern, not as a real
  SDK dependency.
  Wired into `lib/ai/retrieval.ts`: hybrid search's RRF fusion now
  returns a 25-document candidate pool (`RERANK_POOL_SIZE`) instead of
  trimming straight to `matchCount`; Voyage re-scores that pool and the
  result is cut to `matchCount`. A rerank failure falls back to RRF's
  own order rather than failing the search — reranking is a quality
  step on top of a working hybrid search, not a dependency of it.
  Real environment constraint, confirmed by actually running
  `npm run eval:retrieval` against a live local Postgres: `VOYAGE_API_KEY`
  is a placeholder here, so every real rerank call returns 403 and the
  fallback path fires every time — the eval's P@5/R@5/MRR numbers
  matched plain hybrid search exactly, as expected, proving the fallback
  works but not the actual reranking quality gain (that needs a real
  key, flagged as a real follow-up in ADR 0035, not claimed verified).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (235, 4 new —
  `tests/unit/lib/ai/rerank.test.ts`); `node scripts/verify-rls.mjs` run
  for real against a live local Postgres (all 3 tenant-isolation
  assertions passing — this change doesn't touch RLS, run anyway per
  CLAUDE.md's "never commit code that hasn't actually been run"); the
  full `tests/e2e/bot-editor.spec.ts` suite (10/10, the file that
  exercises the bot-editor surface closest to this retrieval path).

- **`--accent`-on-white contrast fix (2026-10-02).** Closed the
  cross-cutting finding flagged 2026-09-28 (`docs/design/audit.md`'s
  Knowledge row): `--accent` was only a 3-point lightness gap from
  `--background`'s pure white (97% vs. 100%), making every `ghost`
  button's hover state (`ActionsTable.tsx`, `BotTableRow.tsx`,
  `BotsTable.tsx`, `sidebar.tsx`, Knowledge's delete button) nearly
  invisible. Prompted by a design-quality review of Chatbase (confirmed
  from real screenshots captured earlier this project, not a fresh
  fetch — `chatbase.co` is network-blocked in this environment again).
  Two real choices explained to the user before building, per process
  rules: darken `--accent` app-wide vs. add a separate ghost-hover-only
  token (chose app-wide — fixes every current and future ghost button
  at once); and whether to also rebuild the bot editor's Preview into a
  persistent docked pane like Chatbase's (declined — kept the existing
  `Sheet`, out of scope for this pass).
  `--accent` (light mode only; dark mode's wasn't flagged) darkened
  from neutral-100 (`oklch(97% 0 none)`) to neutral-200
  (`oklch(92.2% 0 none)`) — reusing the same step already used for
  `border`/`strong-background`, not a new raw value. Real contrast math
  confirmed `--accent-foreground` (20.5% L) still reads ~14:1 against
  the darker background, comfortably above AA, before touching
  anything else that reads the token (dropdown/select focus states,
  the `Skeleton` loading fill, `AuthShell.tsx`'s logo chip against the
  dark `--panel` background).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails;
  full unit suite (235, unchanged — this is a CSS-only change); the
  full `accessibility.spec.ts` suite (15/15, no new violations); the
  full `tests/visual/` suite (19/19 unchanged — the hover delta isn't
  captured by resting-state screenshots, and the few static `bg-accent`
  usages, like `AuthShell.tsx`'s logo chip, stayed within the suite's
  existing pixel-diff tolerance); and a real one-off Playwright
  screenshot comparing the bots-list row action button at rest vs.
  hover, confirming the hover state now renders as a clearly visible
  gray pill instead of an imperceptible tint.

- **Accent-color/monochrome consistency audit (2026-10-02, task
  tracker #11).** A stale task predating ADR 0014's monochrome
  decision — clarified scope with the user first (consistency audit,
  not re-opening the monochrome-vs-colored-accent decision). A grep
  sweep (raw non-neutral Tailwind colors, `Badge` variant usage,
  `bg-primary`/`bg-accent`/`bg-soft-background` purpose consistency)
  plus real screenshots of 10 console screens found the monochrome
  system holding consistently everywhere — no new functional bugs.
  Fixed 2 stale code comments (`BotTableRow.tsx`, `AppSidebar.tsx`)
  still citing the pre-contrast-fix `--accent` value. Full detail:
  `docs/design/audit.md`'s System coverage table.

- **Inter typeface + page-title heading hierarchy (2026-10-02, ADR
  0036, supersedes ADR 0014's typography call).** The user reviewed
  the shipped product directly and called it "a college project" —
  immediately after the consistency audit above had found the token
  system internally sound, a real lesson that consistency-checking
  and quality-checking are different questions. Root-caused, not
  guessed: `app/globals.css` had zero `font-family` override anywhere
  (confirmed via grep) — every screen ran Tailwind's own default
  system-font stack. A second grep found zero uses of `text-xl` or
  larger anywhere in the app — every page title capped at `text-lg`
  (18px), no real heading hierarchy.
  Explained the real tradeoff to the user before building (Inter vs.
  a more distinctive typeface vs. keeping system font and fixing other
  gaps first; typography-first vs. empty-states-first vs.
  motion-first sequencing) — user chose Inter, typography-first.
  Adopted via `@fontsource-variable/inter`'s `wght.css` (self-hosted,
  zero runtime/build-time network dependency — confirmed real via
  `npm view`), not `next/font/google`, for the same network-dependency
  reason ADR 0014 originally removed CARE's Figtree import; wired as
  `--font-sans` in `app/globals.css`'s `@theme` (Tailwind v4's own
  preflight applies it to `html` automatically). The 9 genuine
  page-title headings (Bots, Leads, Actions, Widgets, Approvals, Data
  sources, Integrations, Settings, Conversations) bumped from
  `text-lg font-semibold` to `text-xl font-semibold tracking-tight` —
  a real tier above dialog/card titles, which stay at `text-lg`.
  `app/global-error.tsx`'s inline-styled fallback `h1` (deliberately
  not Tailwind-dependent, per its own header comment) and
  `BotTopBar.tsx`'s editable bot-name input (a different structural
  role, not a static heading) were deliberately left alone.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; a real computed-style check confirming
  `"Inter Variable"` actually renders (not a silent fallback) and the
  new page-title size/weight; full unit suite (235, unchanged); the
  full `tests/e2e/` suite (117/117); the full `accessibility.spec.ts`
  suite (15/15, no new violations); all 19 `tests/visual/` baselines
  regenerated and confirmed stable across two runs; a manual spot-check
  of several regenerated screenshots for layout breakage (clipping,
  overflow, misalignment from Inter's different metrics) — none found.
  Still open, by design: a full per-element typography sweep beyond
  page titles, the elevation-scale and motion-policy gaps
  `docs/design/audit.md` already tracked (next in line per this same
  feedback), and the empty-state/depth-hierarchy pass sequenced after
  this one.

