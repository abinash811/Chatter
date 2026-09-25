# Chatter — Project Guide

## What this is

A vertical-agnostic AI chat platform — embeddable widget + admin dashboard —
in the spirit of Zipchat AI, but not restricted to ecommerce. The same core
engine should serve ecommerce, healthcare, automotive, and any other
industry, powered by Claude.

## Status: active build

Tech stack is chosen (ADR 0002) and real code exists — see README.md for
what's scaffolded. A few architecture questions are still open; check
`docs/open-questions.md` before scaffolding a component whose design is
listed there. If you're asked to build something whose design is still
open, resolve the question with the user (or write the ADR if it's
implicitly obvious) before writing code, don't guess silently.

## Current state — read this first every session

Updated at the end of each session so a new session (or a new
contributor) has zero ambiguity about what's real vs. planned. If you
make a meaningful change, update this before ending your turn.

**Done:**
- Guardrail automation: 7 static checks (`npm run check:all`), a
  browser canary, pre-commit hook, CI against real Postgres+pgvector.
- Tenant isolation (RLS, ADR 0003), model gateway + tool registry + chat
  loop, widget CORS + botKey resolution, Shopify connect flow.
- Console: bot list, bot detail/edit (draft/publish), integrations page.
- Console auth: email + password (ADR 0006, superseding ADR 0004's
  Google OAuth) — `/login` and `/signup` have a real design pass
  (`docs/design/preview/auth.html`, `components/auth/AuthShell.tsx`).
- Design-system practice: `docs/design/preview/`, `docs/design/
  principles.md` (the sharp, opinionated bar — component reuse, tokens,
  depth/polish, plain language, register mapping), a shared-component
  barrel (`components/ui/index.ts`), naming/import/review conventions
  (`docs/conventions.md`, now including a "Building a new feature"
  intake process: requirement → design → data/security → current-
  practice check → build → verify → ship checklist). `/bots` and the
  bot editor implemented and approved (`docs/design/preview/
  bots-list.html`, `bot-editor.html`) — icon avatars, relative
  timestamps, real hover/shadow depth (Card now ships `shadow-sm` by
  default, Button has a tactile active-press state), sidebar nav icons.
- Render deployment prep (ADR 0005).
- Product management docs: `docs/roadmap.md` (Now/Next/Later),
  `docs/features.md` (built vs. planned catalog), `docs/security.md`,
  `docs/accessibility.md` — informed by competitor research on Gorgias,
  Intercom Fin, and Drift/Tidio (`docs/research/competitive-
  landscape.md`), on top of the existing Zipchat research.
- Design tokens finalized (ADR 0007): primary color, a six-step type
  scale, verified contrast (caught and fixed one real dark-mode
  contrast bug in the process).
- `docs/research/current-practices.md` — a living reference checked
  before adopting any new technical pattern, not a one-time snapshot.
- Ongoing system hardening: `scripts/predev-check.mjs` (runs
  automatically before `npm run dev`, on whoever's machine runs it —
  catches a placeholder `DATABASE_URL`, Postgres not running, or a
  corrupted Prisma client install before the dev server even starts),
  `orgId` indexes added to every RLS-scoped table (was previously
  unindexed on all of them), `ship-checklist` skill updated to match
  the current 7 guardrail checks and the docs that now need checking,
  Zod validation on `/login` and `/signup` (`lib/schemas/auth.ts` —
  surfaced and fixed a real bug in the process: failed form submits were
  clearing the email field too, not just the password), Dependabot
  (`.github/dependabot.yml`, weekly npm + Actions updates), rate
  limiting on both public widget routes (`lib/rateLimit.ts`, in-memory —
  correct for Render's single-instance deployment, see `docs/
  security.md` for the multi-instance caveat), a toast system (Sonner,
  `components/ui/toaster.tsx`, close button always shown) wired into the
  bot editor's save/publish (previously silent either way — surfaced
  and fixed a real server/client serialization bug in the process), and
  error boundaries (`app/error.tsx`, `app/global-error.tsx`) with
  plain-language messages, verified against a real thrown error, and a
  component library beyond Button/Input/Badge — `Textarea`, `Label`,
  `Checkbox`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/
  `CardContent` — wired into a real screen (the bot editor now uses
  Card-per-section, matching `docs/design/preview/bot-editor.html`),
  not added speculatively.
- `tests/e2e/` — a persistent Playwright regression suite (11 specs:
  auth flows, bot-editor save/publish/toasts, the error boundary),
  replacing the prior pattern of writing a throwaway verification
  script and deleting it after one run. Wired into `ci.yml` after the
  canary. Closes the biggest gap from the 2026-09-25 "critique our
  setup" discussion — nothing previously re-checked these flows on a
  later change.
- Design system now an exact copy of CARE's (`ohcnetwork/care_fe` +
  `ohcnetwork/careui`), not our own palette — ADR 0008, superseding
  ADR 0007's violet accent. Every real Tailwind color value (emerald
  primary, neutral scale, red/amber/violet semantics, indigo ring)
  computed from `tailwindcss/colors`, not guessed. Full CARE token set
  now defined in `app/globals.css`/`tailwind.config.ts` (background/
  card/popover/secondary/sidebar-* tiers, not just the 8 we had),
  radius `0.625rem`, Figtree font (`next/font/google`). Every existing
  screen re-themed automatically — no component edits needed, since
  nothing used raw colors. Verified with a real headless-browser run
  against a production build (computed `--accent` and font both
  confirmed live) and a screenshot. `docs/design/preview/*.html`
  mockups updated to match.
- Design polish: subtle CSS-keyframe float/drift animation on the
  `/login`+`/signup` hero panel's two decorative circles
  (`prefers-reduced-motion` respected).

- 18 real CARE primitives pulled and committed permanently —
  `Dialog`, `AlertDialog`, `Tabs`, `Table`, `DropdownMenu`, `Popover`,
  `Tooltip`, `Select`, `Separator`, `Avatar`, `Skeleton`, `Sidebar`,
  `Alert`, `Switch`, `RadioGroup`, `Sheet`, `ScrollArea`, and `Button`
  itself replaced with CARE's real one (ours only had 4 variants/2
  sizes; theirs has 8 variants incl. `secondary`/`tertiary`/`link`/
  `destructive-solid` and icon-square sizes the pulled Dialog/Sheet/
  Sidebar all depend on). One-time pull — not re-fetched on every use;
  these are now ours to maintain, same as any other file in the repo.
  Added `@base-ui/react@^1.8.0` (real version checked via `npm view`,
  matches what `careui` itself pins) and a `primary` numbered emerald
  scale + `primary`/`primary-foreground` DEFAULT pair to
  `tailwind.config.ts` (CARE's components reference both the numbered
  steps and the bare semantic pair — missing the DEFAULT silently
  broke the Log In button's fill, caught by an actual screenshot, not
  by `tsc`). `check-design-tokens.mjs` now exempts verbatim-pulled
  files (marked by their `@type registry:` header) from the raw-color
  guardrail — CARE's real design vocabulary uses numbered Tailwind
  scale steps directly for hover/active shades, not just single
  semantic tokens; hand-authored app code still must use a token.
  Verified: full guardrail suite, `tsc`, production build, and all 11
  `tests/e2e/` specs (unchanged, still passing) against the real
  swapped-in Button — not just a visual check.
- `scripts/pull-care-component.mjs` itself: one-line command for
  anything still needed later, not a manual research pass each time
  (verified against a real component before the batch pull above).
  `components.json` registers the `careui` registry too, but the
  shadcn CLI itself can't actually fetch from it — its `{name}`
  URL-substitution only replaces the first occurrence (verified in
  the CLI's own bundle), and CARE serves each item at a path needing
  the name twice (`registry/care-ui/<name>/<name>.json`). Our script
  reads the same JSON directly instead, sidestepping that CLI
  limitation — and also
  the fact that this cloud session's egress policy blocks
  `careui.ohc.network` outright (`--from <local-checkout>` covers
  that case; live `fetch()` is the path for any environment with real
  network access — a contributor's machine, CI, etc.).
  `docs/conventions.md`'s "Building a new feature" step 2 points here
  before anyone hand-builds a primitive we don't have.

**Known gaps:**
- 🔲 Design system tokens/infra, the pull mechanism, and a real
  18-component primitive layer are all done (ADR 0008). Still open:
  rebuilding each remaining *screen's* layout/density against real CARE
  screens — bots list, bot editor, integrations — using these
  primitives (Table for lists, Dialog for confirmations, etc.), not
  just recoloring what already existed. That's the agreed next step.
- The console sidebar nav shell is done: `app/(console)/layout.tsx` +
  `components/console/AppSidebar.tsx` now use the real CARE `Sidebar`
  (icon-collapsible, cookie-persisted state, active-route highlighting,
  a `logoutAction` server action wired to the footer) — replacing the
  hand-rolled `<nav>`. **Tailwind upgraded to v4.3.3 (ADR 0009)** to
  build it: the pulled `Sidebar`'s CARE-authored v4 syntax
  (`w-(--sidebar-width)`) silently compiled to nothing under our old
  v3.4.19, breaking layout invisibly to `tsc`/the build — only caught
  by an actual screenshot. Migrated via the official codemod
  (`@tailwindcss/upgrade`), not a hand patch — `tailwind.config.ts` is
  gone, every token now lives in `app/globals.css`'s `@theme` block.
  Verified: full guardrail suite, a real headless-browser check that
  the sidebar's width/offset math is now correct with zero console
  errors, and all 11 `tests/e2e/` specs passing unchanged. All 15
  interactive pulled primitives also got `"use client"` added — CARE's
  source has no such concept (Vite SPA), Next.js App Router requires
  it; this was already true before the v4 upgrade, just never listed
  here explicitly until now.
- 🟡 No real end-to-end verified Claude reply yet — blocked on a real
  `ANTHROPIC_API_KEY` (everything up to that boundary is confirmed
  correct, see README's "Verified by a real run").
- 🔲 Not yet built: password reset flow, knowledge-base ingestion
  pipeline, onboarding flow (org naming/invites/multi-org switcher),
  appearance/theming editor.
- 🔲 No component-level tests — see the fuller gap list from the
  2026-09-25 product-building-process discussion (not yet its own doc;
  ask the user if this should become one).

## Where things live

- `docs/product-spec.md` — MVP scope and product decisions made so far
- `docs/glossary.md` — domain terms in plain language; add a term in the
  same PR that introduces it
- `docs/business-logic.md` — how the core flows actually work (draft/
  publish, the chat/tool-calling loop, tenant isolation in practice) —
  update in the same PR as the code it describes
- `docs/api.md` — every HTTP route, one place
- `docs/architecture.md` — system design, living doc, updated as decisions land
- `docs/roadmap.md` — Now/Next/Later feature priorities
- `docs/features.md` — every feature, one place, built vs. planned;
  update in the same PR as the code that ships or changes one
- `docs/security.md` — tenant isolation, auth, secrets, traceability,
  known gaps, in one reference instead of scattered across guardrails/ADRs
- `docs/accessibility.md` — the concrete rules for a genuinely usable
  interface (the "why" is in `docs/research/design-system-standards.md`)
- `docs/adr/` — Architecture Decision Records, one per significant,
  hard-to-reverse decision. Template at `docs/adr/template.md`.
- `docs/research/` — competitive and technical research notes
- `docs/research/current-practices.md` — a living reference, unlike the
  other research notes: checked (or updated) before introducing any new
  technical pattern, so a decision doesn't quietly rely on stale
  training-data memory of "how this is usually done."
- `docs/open-questions.md` — decisions not yet made; owner is the user
- `docs/conventions.md` — naming, shared-component import rule, file-size
  guidance, git workflow, and the review checklist.
- `tests/e2e/` — the persistent Playwright regression suite (`npm run
  test:e2e`), run in CI on every push. When you verify a browser flow
  by hand, it belongs here as a real spec, not a throwaway script
  deleted after one run.
- `docs/design/principles.md` — the sharp, opinionated design bar every
  screen is checked against (component reuse, tokens, depth/polish,
  plain language, the Linear/Notion/Stripe register mapping). Read this
  before `docs/design/preview/`.
- `docs/design/preview/` — static HTML mockups, the visual ground truth
  for a page before it's built in code. **Before writing any new page or
  UI pattern, check this folder first.** If a preview exists, match it
  exactly. If none exists, follow the token/component rules in
  `docs/architecture.md` §7 and `app/globals.css`, then add a preview
  here after shipping — don't skip the visual pass just because no
  preview exists yet. See `docs/design/README.md`.

## Non-negotiable guardrails

These hold regardless of what stack or framework we end up on.

1. **Tenant isolation is sacred.** One business's knowledge base,
   conversations, config, or analytics must never leak into another
   business's bot context, retrieval results, logs, or dashboard — no
   exceptions, no shortcuts for convenience or speed.
2. **No vertical-specific logic in the core engine.** Anything specific to
   ecommerce/healthcare/automotive/etc. goes through the template/config
   layer (see `docs/adr/0001-generic-base-with-vertical-templates.md`). If
   you find yourself writing `if industry == "healthcare"` in core code,
   stop — that belongs in a template, not the engine.
3. **Regulated verticals get explicit guardrail prompts, not vibes.**
   Healthcare/finance/legal templates must refuse diagnosis/legal/financial
   advice and say so plainly in their default system prompt. This is part
   of the template definition, not an afterthought bolted on later.
4. **Every action tool degrades gracefully.** If a business hasn't wired up
   a real integration (order lookup, booking system, inventory API, etc.),
   the tool falls back to "collect info, hand off to a human" — it never
   fails silently and never hallucinates an answer it can't back up.
5. **Secrets never ship to widget client code.** The embeddable widget only
   ever talks to our backend over its own API; it never holds a Claude API
   key, DB credential, or any other secret.
6. **Every AI answer is traceable.** Log what was retrieved and which tools
   were called for a given response, so debugging and trust don't rely on
   guesswork.

## Process rules

- Record every hard-to-reverse decision (data model shape, storage choice,
  auth model, multi-tenancy strategy, vendor choice) as an ADR using the
  `new-adr` skill and `docs/adr/template.md`.
- Capture non-trivial research (competitor analysis, library evaluation,
  architecture pattern comparison) in `docs/research/` using the
  `research-note` skill — it needs to survive context compaction and be
  usable by a future session, not just live in chat scrollback.
- Don't scaffold code for a component whose design is still listed in
  `docs/open-questions.md`. Resolve it or explicitly flag the assumption
  you're making first.
- The standard engineering rules already in the system prompt still apply
  in full (no speculative abstraction, no unnecessary error handling,
  minimal comments, etc.) — this file adds project-specific rules on top,
  it does not replace those.
- **Never commit code that hasn't actually been run.** `npx tsc --noEmit`
  catches TypeScript boundary mismatches; it does not catch a broken SQL
  migration, a stale dependency version, or whether RLS policies even got
  created — none of those are visible from reading code. This isn't
  theoretical: a real test run (README.md's "Verified by a real run")
  found three such bugs in already-committed code, including every RLS
  policy silently failing to create. `.github/workflows/ci.yml` now runs
  `scripts/verify-rls.mjs` and a full build against a real Postgres+
  pgvector instance on every push — but CI catching it after the fact is
  the backstop, not the plan. When touching a migration, the gateway, or
  anything RLS-adjacent, actually run it (or `scripts/verify-rls.mjs`)
  before committing, in the same pass, not as a separate later step.
- **Check real version numbers, don't recall them.** A dependency version
  pinned from training-data memory can be a full major version stale (this
  happened with `@anthropic-ai/sdk`, silently missing a GA feature already
  in use). Run `npm view <package> version` before pinning anything new.
- **Check current practice, don't recall it.** Same failure mode as
  above, applied to patterns instead of version numbers — see
  `docs/research/current-practices.md`.
- **When a new technical pattern needs a real choice** (a library, a
  tool, an approach with tradeoffs) — not something with one obviously
  correct answer — explain it to the user before asking: what it is in
  plain terms, why it's needed, and how other companies/projects
  typically do it. Then ask. Don't silently pick one, and don't ask
  without the explanation first.
