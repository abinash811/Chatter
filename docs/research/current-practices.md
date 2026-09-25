# Current practices — living reference

Unlike the other files in `docs/research/` (a one-time research pass on a
specific question), this file is **checked before introducing any new
technical pattern** — a validation library, a testing approach, a
dependency-update tool, an API convention — the same discipline CLAUDE.md
already requires for dependency *versions* ("check real version numbers,
don't recall them"), extended to practices and conventions, not just
version numbers.

**Rule**: before adopting a new pattern not already covered below,
research it fresh (a quick web check is enough — this doesn't need a
full research-note pass every time) and add an entry here with the date
checked. If an entry gets stale (a new pattern has clearly taken over),
update it in place rather than leaving it to rot.

## Frontend

- **Form validation**: Zod is the standard approach for a form beyond
  trivial — schema-defined validation, typed on both client and server.
  Adopted 2026-09-25: `lib/schemas/auth.ts`, used by both `/login` and
  `/signup`'s server actions. Not paired with react-hook-form yet —
  Chatter's forms are plain server actions via `useActionState`, which
  doesn't need a separate form-state library at this scale; revisit if
  a form gets complex enough to need one (many fields, dynamic
  add/remove rows).
- **Component primitives**: shadcn/ui (Radix-based, copy-into-your-repo
  rather than an installed package) remains the default pairing for a
  Next.js + Tailwind admin UI. Already the direction Chatter took.
  *Checked 2026-09-23, see `docs/research/design-system-standards.md`.*

## Backend / API

- **Input validation at the API boundary**: the same schema (Zod)
  used for a form's client-side validation is typically reused
  server-side for the API route handling that submission — one schema,
  not two hand-maintained copies. *Checked 2026-09-25.*
- **Rate limiting**: in-memory works for a single-instance deployment
  (Render, Chatter's case); serverless/edge (Vercel) needs a shared
  store (Redis/Upstash) since each invocation is isolated. Adopted
  2026-09-25: in-memory sliding-window (`lib/rateLimit.ts`), applied to
  both public widget routes. Revisit if Chatter ever moves to multiple
  instances or a serverless host. *Checked 2026-09-25.*

## Database

- **Multi-tenant row-level security**: index the tenant-id column on
  every RLS-protected table — without it, every RLS-filtered query scans
  the full table. Standard advice wherever Postgres RLS is used for
  multi-tenancy. Chatter has none yet. *Checked 2026-09-25.*

## Dependency hygiene

- **Automated dependency updates**: Dependabot (built into GitHub, zero
  setup cost) or Renovate (more configurable but needs its own config)
  are the two standard choices. Adopted 2026-09-25: Dependabot
  (`.github/dependabot.yml`, weekly, npm + GitHub Actions) — Chatter's
  size doesn't need Renovate's extra configurability yet.

## Notifications / error handling

- **Toast library**: Sonner is the current shadcn/ui-recommended choice
  (also what PharmaCare uses). Adopted 2026-09-25:
  `components/ui/toaster.tsx`, mounted once in `app/layout.tsx`, close
  button always shown. *Checked 2026-09-25.*
- **Error boundaries**: Next.js App Router's `error.tsx`/
  `global-error.tsx` convention files. Adopted 2026-09-25 — plain-
  language messages, no stack trace shown to the user.

## Testing

- **E2E test runner**: `@playwright/test` (the structured test runner,
  distinct from the raw `playwright` library `scripts/canary.mjs`
  uses) is the standard choice for a Next.js app's browser-level
  regression suite. Adopted 2026-09-25: `tests/e2e/`, wired into CI
  after the canary. Real per-request DB isolation isn't needed —
  Postgres RLS already scopes each signed-up test user to their own
  org, so tests run serially against the same dev database safely.
- **Unit/component test runner**: Vitest, not Jest — the 2026 consensus
  for a new Next.js/TS project (native ESM+TS, no `ts-jest`/`babel-jest`
  config, ~5-10x faster; Next.js's own docs support both, but community
  practice has clearly shifted to Vitest for new projects, Jest only
  for existing codebases where migrating costs more than it saves).
  Confirmed via WebSearch, not recalled. Adopted 2026-09-25: `tests/
  unit/`, `vitest.config.mts`, `@testing-library/react` for future
  component tests. This is the fast, isolated layer Playwright's E2E
  suite was never meant to be — `lib/ai/` (the chat loop, model
  gateway, tool registry) had zero automated coverage of any kind
  before this, since E2E never exercises a real Claude API call
  (blocked on a real `ANTHROPIC_API_KEY`) and nothing else tested it.
  Every external dependency (the Anthropic SDK, Prisma via
  `withOrgContext`) is mocked at the module boundary — these tests
  verify the engine's own logic (iteration guards, parallel tool
  calls, traceability logging, request/response mapping), not a real
  network or database call; that's still what `tests/e2e/` and CI's
  real-Postgres steps are for.
- **Visual regression testing**: Playwright's own built-in
  `toHaveScreenshot()` (already a dependency via `@playwright/test`)
  over a third-party service (Percy, Chromatic) — zero new cost/vendor
  for a project this size, and it's the standard "you already have
  Playwright" choice. Adopted 2026-09-25: `tests/visual/`,
  `playwright.visual.config.ts` (separate from `playwright.config.ts`
  — different lifecycle, baselines get regenerated with
  `--update-snapshots`, functional E2E specs never should). Real,
  documented risk: a screenshot baseline is only trustworthy against
  the exact environment it was generated in — font rasterization and
  the rendering path can differ machine to machine. Wired into CI as
  `continue-on-error: true` until a real CI run confirms these
  baselines (generated in this project's sandboxed dev environment)
  actually match GitHub's runner — see the workflow step's own
  comment for what to do once that's confirmed either way. Verified
  the diff mechanism actually catches something, not just that it
  runs: an initial `maxDiffPixelRatio: 0.02` config silently let a
  real, intentional color change on the login page's brand icon pass
  clean (a small element is a tiny fraction of a full-page screenshot's
  pixel count) — found by deliberately breaking something and checking
  the suite actually failed, removed the ratio cap, then confirmed the
  same change now fails correctly.
