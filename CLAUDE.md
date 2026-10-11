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

Keep entries here **short — a line or two, with a pointer**, not a
narrative. The full story (bugs caught, what was verified, why a
decision was made) goes in `docs/changelog.md`; this section is an
index into it, `docs/features.md`, and `docs/roadmap.md`, not a copy of
any of them. (This section itself used to be the multi-thousand-line
narrative — moved to `docs/changelog.md` on 2026-09-26 for exactly this
reason.)

**Built** (detail: `docs/features.md`, full history: `docs/changelog.md`):
- Core engine: tenant isolation (RLS, ADR 0003), model gateway + tool
  registry + chat loop, widget CORS/botKey resolution, Shopify connect.
- Console: auth (email+password, ADR 0006), onboarding + BYOA + secrets
  encryption (ADR 0012), bots list (search/sort/rename/duplicate/archive
  — archive not delete, ADR 0018) + editor (draft/publish), a bot
  switcher + per-bot page nav in the sidebar (ADR 0037), knowledge base
  ingestion (Q&A/file/URL, ADR 0013), an org-wide integrations page
  (ADR 0038), conversation inbox with plain-language issue detection
  (ADR 0015/0016), settings.
- Design system: shadcn/ui official source for all 26 primitives, no
  CARE dependency left (ADR 0017/0025); monochrome tokens; sidebar
  (including bot-scoped nav, moved in from the since-deleted
  `BotTopBar`, ADR 0037) built against real Chatbase/Claude Console
  screenshots; depth/polish pass (principles.md #5/#9) done on the bot
  editor, bots list, and login/signup; Skeleton loading states on
  12 routes.
  `docs/design/audit.md` tracks per-screen compliance against the bar —
  check there before assuming a screen is finished.
- Testing/guardrails: 17 static guardrail checks (`npm run check:all`),
  250 unit tests, 146 `tests/e2e/` tests across 18 spec files, 24
  `tests/visual/` baselines, gitleaks + a CI coverage floor, all wired
  into CI (counts as of 2026-10-11 — check for real via `npm run
  check:all`/`npx vitest run`/`npx playwright test --list` rather than
  trusting this number to stay current). Known, tracked
  flake: a toast-timeout resource-contention issue on CI's 2-vCPU
  runner (`retries: 1` under CI mitigates but doesn't eliminate it) —
  full history in `docs/changelog.md`. Don't chase it further locally;
  run scoped test files during a session, not the full suite repeatedly.
- Suggested-reply buttons, test-your-bot preview, and a Chatbase-style
  card-gallery redesign for Tools/Knowledge (2026-09-27) —
  `components/console/OptionCard.tsx` is the shared new component.
- Demo data: one-click "Load sample data" seeds a fully populated
  example bot (2026-09-27, `lib/demoData.ts`).
- Leads (`collect_lead`) and custom webhook actions (ADR 0022) — the
  3rd and 4th action tools (2026-09-27).
- `request_order_cancellation` (ADR 0023) — first write-capable tool;
  queues a `PendingAction` for human approval at `/approvals` rather
  than calling Shopify directly (2026-09-28).
- `@tanstack/react-table` + `nuqs` piloted on the bots list (ADR 0024,
  2026-09-28); shadcn-only primitives mechanically enforced (ADR 0025,
  2026-09-28, closed a real gap — 7 of 25 `components/ui/` files
  weren't actually pulled from shadcn's source).
- Conversation-bubble color collision and a keyboard-nav gap fixed on
  Conversations list (2026-09-28); depth/polish passes on Knowledge/
  Integrations/Settings (2026-09-28, superseded/absorbed by later
  rebuilds below).
- `chatbase.co` network-block corrected — it's reachable now, several
  stale docs claims fixed (2026-09-28).
- Model tier + temperature picker (ADR 0026, 2026-09-28).
- Data sources rebuild, Phase 1: renamed from "Knowledge base," 4th
  entry point (text snippet), search/filter/sort/bulk-select
  (2026-09-29).
- Custom Actions "Test this action" — fires a real request before
  saving (2026-09-29).
- Conversations Activity rebuild into a split-pane layout, real pause/
  resume, Widget-vs-Playground tracking (ADR 0027, 2026-09-29).
- In-chat widgets (ADR 0028): schema-driven forms (Phase 1, 2026-09-29)
  + an optional real API call on submit, write-capable ones approval-
  gated (Phase 2, 2026-09-30). States/multi-view still deferred,
  `docs/open-questions.md` #9.
- RAG hardening: HNSW index (was a dead IVFFlat), batched embeddings,
  query rewriting, hybrid search via RRF (ADR 0021), a hand-rolled eval
  harness (2026-09-27); reranking via Voyage `rerank-2` (ADR 0035,
  2026-10-02).
- Deploy target: AWS confirmed, DB is AWS RDS for PostgreSQL (ADR
  0021); app compute platform still open, `docs/open-questions.md` #8.
- Guardrails Phase 1 — rate limiting + spam detection, opt-in (ADR
  0029, 2026-09-30). Country/IP blocking deferred, `docs/open-
  questions.md` #10.
- Real multi-page site crawling (ADR 0030, 2026-09-30), a self-hosted
  JS-rendering fallback (ADR 0031, 2026-10-02), and a Firecrawl last-
  resort fallback (ADR 0032, 2026-10-02) for URL/crawl ingestion.
- TypeScript 7 + Next.js 16 (ADR 0033) and Prisma 7 (ADR 0034) upgrades
  — both 2026-10-02, both closed real undocumented regressions found
  only by the full verification sweep, not just `tsc`/build.
- Monochrome-system consistency pass: `--accent`-on-white contrast fix,
  an app-wide audit, Inter typeface + heading hierarchy (ADR 0036),
  documented elevation/motion scales, table-header consistency, a
  hover-elevation rollout, and per-item grayscale avatar distinction —
  all 2026-10-02/03, prompted by the user calling the console "a
  college project."
- Sidebar/top-bar depth/polish + a11y pass (2026-10-03); bot-scoped nav
  moved from `BotTopBar` into the sidebar (ADR 0037, 2026-10-04); Leads/
  Approvals/Integrations became org-wide, Integrations gaining a real
  org-level schema migration (ADR 0038, 2026-10-04).
- Ready-made Custom Action templates (2026-10-04/05); a full-app design
  audit (2026-10-05); `request_refund` as a 6th action tool, reusing
  the order-cancellation approval pattern (2026-10-05).
- `withOrgContext`'s transaction timeout widened for pooled/remote
  Postgres connections (2026-10-06).
- Design-system pass: `--success` accent color + `Badge`'s
  default-variant fix (2026-10-08), 5 new design-drift/error-copy/
  register-assignment guardrails (2026-10-08), an `OptionCard` hover
  bug fixed (2026-10-08), and a dev-only `/design-system` reference
  page across 3 phases — tokens, components, page templates
  (2026-10-08/09) — **must be removed before production launch**, see
  `docs/roadmap.md`.
- Real keyboard-only pass made permanent across every screen
  (2026-10-09); a bots-list stat row closing the "feels thin" gap
  (2026-10-09).
- Dark mode removed completely, explicit user directive (2026-10-11);
  restore-from-archive UI for bots (ADR 0018's other half, 2026-10-11);
  sidebar brand chip fixed to show the product name, not the
  workspace's (2026-10-11).
- Resolved: hosted-SaaS-only hosting model (ADR 0039, 2026-10-11) — no
  self-hosted product option.
- Design-discipline root-cause fix (2026-10-11): a new
  `check-audit-coverage.mjs` guardrail (17th) mechanically requires
  every console route to have a `docs/design/audit.md` row — found and
  fixed a real, live gap on first run (Archived bots never had one).
  `.claude/rules/console-frontend.md` item 8 now requires writing the
  screenshot critique's actual findings into the response, not a
  silent "looks clean." Full detail: `docs/changelog.md`.
- Product docs: `docs/north-star.md`, `docs/roadmap.md`,
  `docs/features.md`, `docs/ai-tech-radar.md`, `docs/security.md`,
  `docs/accessibility.md`.

**Known gaps** (detail: `docs/changelog.md`, design gaps:
`docs/design/audit.md`):
- Depth/polish pass not yet done on: integrations content, settings,
  knowledge, conversations, the sidebar itself. Bots list still has
  open polish findings (status-badge contrast, avatar variety) — see
  `docs/design/audit.md`.
- No real end-to-end verified Claude reply yet — blocked on a real
  `ANTHROPIC_API_KEY`.
- Not built: password reset, teammate invites/multi-org switcher,
  scheduled re-crawling for Data sources (ADR 0030).
- `scripts/canary.mjs` can't run in this container as-is (Playwright
  browser version mismatch) — `tests/e2e/`/`tests/visual/` already
  work around it, only the standalone script is affected.
- React component render tests not yet added (infra ready, unblocked).
- Switching Prisma's `prisma-client-js` generator to the newer
  `prisma-client` one deliberately deferred (ADR 0034, 2026-10-02) — the
  old generator still works unchanged under Prisma 7, this is a
  lower-stakes future pass (11 files' import paths), not urgent.
- CI verifying an actual deploy is explicitly out of scope (user
  decision), not just deferred.
- No deploy target chosen — Render dropped (ADR 0020, 2026-09-27,
  supersedes ADR 0005): building on a host whose extension support
  (real BM25 for hybrid search — `docs/ai-tech-radar.md`) couldn't be
  confirmed was the wrong call. See `docs/open-questions.md` #8.

## Where things live

- `docs/north-star.md` — long-term product direction (the "why")
- `docs/changelog.md` — detailed session-by-session build history (real
  bugs caught, what was verified). New detailed entries go here, not
  back into this file's "Current state." Archives its oldest entries
  into `docs/changelog/` once it crosses ~500 lines — check there for
  older history this file's own pointer doesn't cover.
- `docs/product-spec.md` — MVP scope and product decisions so far
- `docs/glossary.md` — domain terms; add a term in the same PR that
  introduces it
- `docs/business-logic.md` — how core flows actually work; update in the
  same PR as the code it describes
- `docs/api.md` — every HTTP route, one place
- `docs/architecture.md` — system design, living doc
- `docs/roadmap.md` — Now/Next/Later priorities
- `docs/ai-tech-radar.md` — adopt/trial/assess/hold tracker for AI/RAG
  tech specifically (what's true about our stack now, not what's next)
- `docs/features.md` — every feature, built vs. planned; update in the
  same PR that ships or changes one
- `docs/security.md` — tenant isolation, auth, secrets, traceability
- `docs/accessibility.md` — concrete usability rules
- `docs/adr/` — Architecture Decision Records; template at
  `docs/adr/template.md`. **Check `docs/adr/README.md` first** — a
  one-line-per-ADR index of current vs. superseded status, so you don't
  have to open all 39 files to know which third are dead.
- `docs/research/` — competitive/technical research;
  `current-practices.md` is checked before adopting any new pattern
- `docs/open-questions.md` — decisions not yet made; owner is the user
- `docs/conventions.md` — naming, imports, file size, git workflow,
  review checklist, the "Building a new feature" intake process
- `tests/e2e/` — the persistent Playwright suite (CI on every push); a
  hand-verified browser flow becomes a spec here, not a throwaway script
- `docs/design/principles.md` — the design bar every screen is checked
  against; read before `docs/design/preview/`
- `docs/design/component-checklist.md` — per-component completeness bar
  (states, elevation, motion, color-independent signaling, error/empty
  copy structure, keyboard+ARIA), derived from Apple HIG/Material
  Design 3/Ant Design/Radix's own documented standards — check before
  adding a primitive or touching a screen's interactive components
- `docs/design/audit.md` — living per-screen scoreboard against that
  bar; update a screen's row the same turn you touch or audit it
- `docs/design/design-system.md` — current token values + component
  provenance; if it and `app/globals.css` disagree, the CSS is correct
- `docs/design/preview/` — static HTML mockups, the visual ground truth
  for a page **before** it's built in code. **Before writing any new
  page or UI pattern, check this folder first.** Every file in it today
  has already shipped and is frozen/historical (2026-10-11 policy,
  `docs/design/README.md`) — don't treat any of them as a current
  reference. If a *new, unshipped* screen's preview exists, match it
  exactly; if none exists, follow the token/component rules in
  `docs/architecture.md` §7 and `app/globals.css`, then add a preview
  here before shipping — don't skip the visual pass just because no
  preview exists yet. See `docs/design/README.md`.

## Non-negotiable guardrails

These hold regardless of what stack or framework we end up on.

1. **Tenant isolation is sacred.** One business's knowledge base,
   conversations, config, or analytics must never leak into another
   business's bot context, retrieval results, logs, or dashboard — no
   exceptions, no shortcuts for convenience or speed.
2. **No vertical-specific logic in the core engine.** Anything specific to
   ecommerce/healthcare/automotive/etc. is that bot's own config, not a
   shared-code branch — there is no template layer (ADR 0019 dropped it;
   ADR 0001 is superseded, see `docs/adr/README.md`). If you find
   yourself writing `if industry == "healthcare"` in core code, stop —
   that belongs in config, not the engine.
3. **Regulated verticals get explicit guardrail prompts, not vibes.**
   Healthcare/finance/legal bots must refuse diagnosis/legal/financial
   advice and say so plainly in their default system prompt. This is part
   of that vertical's own default config from the start (ADR 0019 — no
   template layer, see guardrail #2), not an afterthought bolted on later.
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

- **Any "is this well-designed / what's missing" question reads
  `docs/design/audit.md`'s open findings first, then answers.** A chat
  question isn't a file touch, so `.claude/rules/console-frontend.md`
  doesn't auto-load for it — don't critique from visual impression alone
  when a documented findings list already exists; check it before
  answering, not just when writing code.
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
- **When a decision reverses or retires a concept that's already
  referenced elsewhere** (an ADR superseding another, a term like
  "vertical template" going away, a question in `docs/open-
  questions.md` getting resolved and removed), grep the whole repo for
  that concept/term/number in the same PR — not just the one doc that
  owns the decision. A 2026-10-11 sweep found the same dead "vertical
  template" phrase still live in CLAUDE.md, `architecture.md`,
  `roadmap.md`, a research note, and an ADR, over a month after ADR
  0019 killed it — nobody had grepped for it once, in any of those
  PRs.
- **A doc's own opening summary/status line and its closing sections
  can quietly disagree** once enough time passes between editing one
  and the other — `architecture.md`'s top said "concrete tech choices
  are mostly still open" while its own bottom section correctly said
  they're "all resolved by now." When editing any section of a living
  doc, skim the rest of the same file for a claim the edit might now
  contradict, not just the section being touched.
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
- **For any RAG/AI work — embeddings, retrieval, ranking, chunking,
  prompting, evals — read the primary source before writing
  implementation code, not just a search-result summary of it.** A
  WebSearch result or third-party blog post is a pointer to go find the
  real source (the vendor's own docs, the maintainer's reference
  implementation, the paper) — never the final thing to build against.
  This isn't theoretical: the hybrid-search RRF query
  (`lib/ai/tools/searchKnowledgeBase.ts`) was first built from WebSearch
  summaries of Supabase's guide, and only differed from Supabase's real
  reference implementation in 3 concrete ways (wrong ranking function,
  wrong candidate-pool formula, a less efficient join) once someone
  asked whether the primary source had actually been read — it hadn't.
  Read primary/official sources before building, every time, not as a
  fallback when something looks off.
- **When a new technical pattern needs a real choice** (a library, a
  tool, an approach with tradeoffs) — not something with one obviously
  correct answer — explain it to the user before asking: what it is in
  plain terms, why it's needed, and how other companies/projects
  typically do it. Then ask. Don't silently pick one, and don't ask
  without the explanation first.
