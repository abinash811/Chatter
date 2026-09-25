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
- Design-system practice: `docs/design/preview/`, a shared-component
  barrel (`components/ui/index.ts`), naming/import/review conventions
  (`docs/conventions.md`). Draft previews for `/bots` and the bot editor
  exist (`docs/design/preview/bots-list.html`, `bot-editor.html`) —
  sent to the user for feedback, not yet approved or implemented.
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
  the current 7 guardrail checks and the docs that now need checking.

**Known gaps:**
- 🟡 `/bots` and `/bots/[botId]` haven't had a design pass implemented
  yet — draft previews exist and are awaiting user feedback (see above).
- 🟡 No real end-to-end verified Claude reply yet — blocked on a real
  `ANTHROPIC_API_KEY` (everything up to that boundary is confirmed
  correct, see README's "Verified by a real run").
- 🔲 Not yet built: password reset flow, knowledge-base ingestion
  pipeline, onboarding flow (org naming/invites/multi-org switcher),
  appearance/theming editor.
- 🔲 No schema-validation library (zod or similar) for forms/API input —
  currently raw `String(formData.get(...))` with manual inline checks.
  Awaiting the user's go-ahead (a real decision, not a mechanical fix).
- 🔲 No automated dependency-update tool (Dependabot/Renovate) wired up
  yet — same, awaiting a choice between the two.
- 🔲 No rate limiting on any API route, no toast/notification system, no
  error boundary, no component-level tests — see the fuller gap list
  from the 2026-09-25 product-building-process discussion (not yet its
  own doc; ask the user if this should become one).

## Where things live

- `docs/product-spec.md` — MVP scope and product decisions made so far
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
