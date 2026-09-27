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
  — archive not delete, ADR 0018) + editor (draft/publish), a bot-scoped
  top bar with a bot switcher, knowledge base ingestion (Q&A/file/URL,
  ADR 0013), integrations page, conversation inbox with plain-language
  issue detection (ADR 0015/0016), settings.
- Design system: shadcn/ui official source for all 18 primitives, no
  CARE dependency left (ADR 0017); monochrome tokens; sidebar + top bar
  built against real Chatbase/Claude Console screenshots; depth/polish
  pass (principles.md #5/#9) done on the bot editor, bots list, and
  login/signup; Skeleton loading states on 7 routes.
  `docs/design/audit.md` tracks per-screen compliance against the bar —
  check there before assuming a screen is finished.
- Testing/guardrails: 9 static guardrail checks (`npm run check:all`,
  runs in one process now — `scripts/check-all.mjs`), 152 unit tests, 83
  `tests/e2e/` specs, 18 `tests/visual/` baselines, gitleaks secret
  scanning + a CI coverage floor, all wired into CI. A few e2e specs
  around publishing intermittently fail under sustained local single-
  worker runs in this dev container (confirmed 2026-09-27: different
  tests fail each run, all pass instantly alone, a fresh server restart
  didn't help) — real resource contention from running the whole suite
  back-to-back for hours, not a product bug; don't chase it further
  locally, and don't assume it reproduces in CI's fresh container. Run
  scoped test files during a session, not the full suite repeatedly.
- Suggested-reply buttons (2026-09-27): up to 3 chip buttons, configured
  in the Appearance tab (`MAX_SUGGESTED_REPLIES`,
  `lib/ai/appearanceOptions.ts`), shown once under the widget's first
  message (`public/widget.js`) — tapping one sends it exactly like
  typing it. Matches Chatbase's own reference UI, confirmed from real
  screenshots. Verified end-to-end against the real embedded widget, not
  just the console form.
- Test-your-bot preview (2026-09-27): a "Preview" button in the bot
  editor opens a slide-over chat (`PreviewSheet.tsx`) wired to the real
  chat loop (`sendMessage`) via `sendPreviewMessageAction` — degrades to
  a plain-language message if the bot isn't published or no Claude key
  is configured. Matches Chatbase's own docked preview, confirmed from
  real screenshots.
- Card-gallery redesign (2026-09-27): the bot editor's Tools tab
  (checkbox list → `OptionCard` grid + `Switch`) and Knowledge's ingestion
  picker (DropdownMenu → 3 always-visible `OptionCard`s) both redesigned
  to match Chatbase's own card-gallery pattern (icon/title/description/
  action), confirmed real via user-supplied screenshots — see `docs/
  research/competitive-landscape.md`. New shared component:
  `components/console/OptionCard.tsx`. Real bug caught and fixed before
  shipping: tool descriptions are model-facing instructions of varying
  length, so cards had wildly uneven heights until `line-clamp-2` was
  added. `www.chatbase.co` itself stays blocked by this environment's
  network egress policy — everything here is grounded in the user's own
- Card-gallery redesign (2026-09-27): the bot editor's Tools tab
  (checkbox list → `OptionCard` grid + `Switch`) and Knowledge's ingestion
  picker (DropdownMenu → 3 always-visible `OptionCard`s) both redesigned
  to match Chatbase's own card-gallery pattern (icon/title/description/
  action), confirmed real via user-supplied screenshots — see `docs/
  research/competitive-landscape.md`. New shared component:
  `components/console/OptionCard.tsx`. Real bug caught and fixed before
  shipping: tool descriptions are model-facing instructions of varying
  length, so cards had wildly uneven heights until `line-clamp-2` was
  added. `www.chatbase.co` itself stays blocked by this environment's
  network egress policy — everything here is grounded in the user's own
  screenshots, not a live fetch.
- Demo data (2026-09-27): a one-click "Load sample data" button on
  `/bots` (`lib/demoData.ts`) creates a fully populated example bot —
  persona, published config, 3 knowledge Q&A entries, 2 leads, one
  (disabled-by-default) custom action, 2 sample conversations — so any
  user sees every screen with real content without a live Claude/Voyage
  key. Resolves the "how broad should seeding be" open item from the
  2026-09-27 directive.
- Leads (2026-09-27): third action tool, `collect_lead` — generic
  contact-info capture (name/email/phone/note), matches Chatbase's
  "Collect Leads." New per-bot `/bots/[botId]/leads` console page.
- Custom actions (2026-09-27, ADR 0022): fourth action tool — a
  business-defined webhook (URL/method/headers/what to collect), per bot,
  its own `/bots/[botId]/actions` page with an independent enable/disable
  toggle per action (not the Tools tab, since each is its own object, not
  a fixed checkbox list). Dynamic, not a `lib/ai/tools/registry.ts` entry
  — `lib/ai/chat.ts` merges each bot's enabled custom actions with the
  static registry's tools per turn. SSRF-guarded (https-only, blocks
  private/loopback/link-local + the cloud metadata IP), headers encrypted
  at rest. Every tool added from here on is industry-agnostic by default
  — `check_order_status` stays the one deliberate ecommerce exception
  (2026-09-27 scoping decision, see `docs/roadmap.md`). Both tools from
  the 2026-09-27 directive are now built.
- Self-serve config (roadmap "Self-serve configurability"): widget
  appearance editor (greeting/accent/avatar/position) and a 3-template
  persona picker (Support/Sales/Lead-gen), both in the bot editor.
- RAG hardening pass (2026-09-27): fixed a real dead pgvector index
  (IVFFlat built on an empty table — now HNSW), batched ingestion
  embeddings, query rewriting via the retrieval tool's own instructions,
  hybrid search (tsvector + pgvector via RRF, ADR 0021 — deliberately not
  BM25), and a hand-rolled RAG eval harness (`npm run eval:retrieval` —
  RAGAS/DeepEval/TruLens/LangSmith all ruled out after checking their
  real repos, see `docs/ai-tech-radar.md`). Reranking is next, now
  unblocked.
- Deploy target: AWS confirmed; database is AWS RDS for PostgreSQL (ADR
  0021); app compute (App Runner/ECS/EC2) still open, `docs/open-
  questions.md` #8.
- Product docs: `docs/north-star.md`, `docs/roadmap.md`,
  `docs/features.md`, `docs/ai-tech-radar.md`, `docs/security.md`,
  `docs/accessibility.md`.

**Known gaps** (detail: `docs/changelog.md`, design gaps:
`docs/design/audit.md`):
- Depth/polish pass not yet done on: integrations content, settings,
  knowledge, conversations, the sidebar itself. Bots list still has
  open polish findings (status-badge contrast, avatar variety) — see
  `docs/design/audit.md`. No restore-from-archive UI for bots yet.
- No real end-to-end verified Claude reply yet — blocked on a real
  `ANTHROPIC_API_KEY`.
- Not built: password reset, site crawling for ingestion
  (`docs/open-questions.md` #3), teammate invites/multi-org switcher.
- `scripts/canary.mjs` can't run in this container as-is (Playwright
  browser version mismatch) — `tests/e2e/`/`tests/visual/` already
  work around it, only the standalone script is affected.
- React component render tests not yet added (infra ready, unblocked).
- 4 Dependabot majors deliberately deferred: Next.js 15→16, Prisma 5→7
  (client+CLI), TypeScript 5→7 — each needs its own migration pass.
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
  `docs/adr/template.md`
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
