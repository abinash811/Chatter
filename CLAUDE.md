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
- Testing/guardrails: 10 static guardrail checks (`npm run check:all`),
  166 unit tests, 87+ `tests/e2e/` specs, 20+ `tests/visual/` baselines,
  gitleaks + a CI coverage floor, all wired into CI. Known, tracked
  flake: a toast-timeout resource-contention issue on CI's 2-vCPU
  runner (`retries: 1` under CI mitigates but doesn't eliminate it) —
  full history in `docs/changelog.md`. Don't chase it further locally;
  run scoped test files during a session, not the full suite repeatedly.
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
  added. This was grounded in the user's own screenshots at the time,
  not a live fetch, because `www.chatbase.co` was blocked by this
  environment's network egress policy then — **that's since changed
  (2026-09-28): `chatbase.co` access now works**, see the dated entry
  below and `docs/research/competitive-landscape.md`'s 2026-09-28
  update.
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
  — `check_order_status` and `request_order_cancellation` stay the two
  deliberate ecommerce exceptions (2026-09-27 scoping decision, see
  `docs/roadmap.md`). Both tools from the 2026-09-27 directive are now
  built.
- Order cancellation / write-capable action tools (2026-09-28, ADR
  0023): fifth action tool, `request_order_cancellation` — the first
  write-capable one, and a new risk category the user chose the safe
  option for directly ("Okay let's have 2" — human approval, not
  automatic execution). It never calls Shopify itself: it validates the
  order and queues a `PendingAction` (`lib/pendingActions.ts`, generic,
  no knowledge of any specific tool — avoids a circular import with the
  tool's own `handle()`), telling the visitor a human will review it,
  never that it's done. New `/bots/[botId]/approvals` console page lists
  queued requests; approving (behind its own confirm dialog — the one
  moment a real external write happens) calls the real `orderCancel`
  GraphQL mutation via the separately-exported `executeOrderCancellation`;
  rejecting needs no confirmation. Requires the `write_orders` Shopify
  OAuth scope — a store connected before this change must reconnect.
  Verified end-to-end with real screenshots: empty state, a queued
  request, the confirm dialog, and the graceful "no Shopify integration"
  failure outcome on the resolved row (no real Shopify store is
  connectable in this environment). `shopify.dev` stayed blocked by this
  environment's network egress policy for the `orderCancel` mutation
  shape — pieced together via WebSearch instead of the primary source,
  flagged as unverified against a live store in ADR 0023.
- Table library pilot (2026-09-28, ADR 0024): `@tanstack/react-table`
  (row-model logic only, not rendering) + `nuqs` (URL-persisted state)
  adopted on the bots list first, before any wider rollout to leads/
  conversations/actions/approvals — sourced from a user-requested review
  of popular Next.js/shadcn starter templates. Real finding worth
  remembering: npm's `latest` tag now points to TanStack Table v9, a
  genuinely different, barely-documented API (`ReactTable`/
  `createCoreRowModel`) — deliberately pinned to v8.21.3 instead, since
  shadcn's own documented Data Table pattern and every mainstream
  tutorial/starter are still written against v8, and the whole point of
  this adoption was matching a proven pattern, not chasing `latest`.
  Real, measured cost: `/bots`'s First Load JS grew ~4.9kB → ~23.6kB
  (confirmed via a real build). Verified: `tsc` clean, all 9
  `check:all` guardrails (9 at the time — see the shadcn-primitives
  entry below for the 10th), full unit suite, a new real e2e test proving
  sort order changes and survives a page reload (`tests/e2e/
  bots-list.spec.ts`), all 8 existing bots-list specs pass unmodified,
  a11y scan clean, and all 18 `tests/visual/` baselines pixel-identical
  to before — confirms this changed only the state-management layer,
  not the rendered UI. Also evaluated and explicitly declined adopting
  Clerk/Supabase for auth from the same template review — Chatter's own
  RLS-backed multi-tenancy (ADR 0003) + custom auth (ADR 0006) is
  already stronger and a costly reversal for no gain.
- Shadcn-only primitives, mechanically enforced (2026-09-28, ADR 0025):
  found and closed a real gap — 7 of 25 `components/ui/` files (`Input`,
  `Textarea`, `Label`, `Checkbox`, `Card`, `Badge`, `Toaster`) were
  hand-authored *imitating* shadcn's style but never actually pulled
  from its real source (unlike the other 18, ADR 0014/0017). User
  directive: "There shouldn't be any hand rolled in the product... how
  do we make sure in future we don't miss this." All 7 rebased onto
  shadcn's real source with deliberate customizations kept as
  documented deltas, never a blind overwrite (`Card`'s Notion-register
  tuning, `Badge`'s app-wide variant names, etc.) — `Checkbox` is a real
  behavior change too, now radix-ui's real primitive
  (`onChange`→`onCheckedChange` at its 2 call sites). New guardrail,
  `scripts/check-shadcn-only-primitives.mjs` (`check:all` is now 10
  checks), backed by `scripts/shadcn-manifest.json` — an explicit,
  human-verified list, not header-sniffing (shadcn's own `@type
  registry:` header turned out absent from most of its real source,
  confirmed by pulling 7 files for real — a check built on it would
  have missed this exact gap). Real bug caught only by an actual
  screenshot, not any test: the generic `rounded` utility resolves to
  this app's 10px `--radius`, which on a 16px checkbox rendered as a
  full circle indistinguishable from a radio button — fixed to match
  shadcn's real `rounded-[4px]`. Verified: `tsc` clean, all 10
  `check:all` guardrails, full unit suite, the complete `tests/e2e/`
  suite (isolated every ambiguous failure — all were the pre-existing
  toast-timeout flake, no real regressions), full a11y scan, all 18
  visual baselines regenerated and stable across two runs.
- `--muted`/`--accent` conversation-bubble collision fixed (2026-09-28):
  a real, previously-flagged bug (`docs/design/audit.md`'s "System
  coverage" table) — `ConversationThread.tsx`'s visitor and bot message
  bubbles used `bg-muted`/`bg-accent`, which are the literal same
  monochrome token value, so the two speakers were visually
  indistinguishable. Fixed with a real decision, not a mechanical
  token swap: the bot/business voice now gets `bg-primary` (solid
  black), matching the same high-contrast/active pairing already
  established for `Badge`'s `default` vs `muted` variants; the visitor
  keeps the existing muted gray. Verified via a real screenshot and the
  `conversation-detail.png` visual baseline regenerated + confirmed
  stable across two runs; e2e and a11y suites for both conversation
  screens re-run clean.
- Conversations list depth/polish pass (2026-09-28): `docs/design/
  audit.md`'s row for this screen upgraded from mostly 🔲 to all ✅. Two
  real bugs caught only via an actual screenshot: (1) `ConversationsTable.tsx`'s
  row had only `onClick` — no `tabIndex`/`role`/`onKeyDown` — so it
  wasn't keyboard-reachable at all, the same gap `BotTableRow.tsx`
  already fixed elsewhere but never applied here when this screen
  shipped (ADR 0015); fixed by copying that established accessible
  whole-row-navigates pattern verbatim, now locked in by a permanent
  e2e test (`tests/e2e/conversations.spec.ts`); (2) the row's
  `ChevronRight` used `text-border` (the row-border color, near-white)
  as its icon color, making it nearly invisible — fixed to
  `text-muted-foreground`. Hover was already free from shadcn's real
  `Table` (`hover:bg-muted/50`); Depth was already earned (same
  `rounded-lg border border-border shadow-xs` wrap as Knowledge/Leads/
  Actions) but had never been credited in the audit table. Focus ring
  verified genuinely applying via `getComputedStyle()`/`:focus-visible`
  inspection, not just a visually-ambiguous screenshot. Verified: `tsc`
  clean, all 10 `check:all` guardrails, full unit suite (166 tests),
  the full `conversations.spec.ts` file (7/7, including the new test —
  caught and fixed its own bug: `[data-slot="table-row"]` also matches
  the header row, so the new test had to scope to `tbody`), the
  conversations a11y scan, and all 18 visual baselines confirmed
  unchanged (the new focus/active classes only apply on interaction,
  not the resting state the visual suite captures).
- Knowledge depth/polish pass (2026-09-28): full history moved to
  `docs/changelog.md` — superseded 2026-09-29 by the Data sources
  rebuild below. The one still-open finding (a cross-cutting `--accent`-
  on-white `ghost`-button contrast question, affecting 5 files) is still
  not committed to.
- Integrations depth/polish pass (2026-09-28): full history moved to
  `docs/changelog.md` — 2 real code-level bugs fixed (an unlabeled
  input, a missing rounded-border/shadow wrap), all states ✅ except
  Active 🟡.
- Settings depth/polish pass (2026-09-28): full history moved to
  `docs/changelog.md` — audit-only, no code changed, all states ✅
  except Active 🟡 (no bespoke active state, same as other list
  screens).
- `chatbase.co` network-block correction (2026-09-28): every prior
  session's docs claimed `www.chatbase.co`/`chatbase.co` was blocked by
  this environment's egress policy (`docs/research/competitive-
  landscape.md`, `docs/research/persona-template-ux.md`, this file) —
  re-tested directly via `WebFetch` and confirmed it now works (the
  homepage, several `/docs/user-guides/...` pages, and their public
  docs index all fetched real content). Verified this is specific to
  `chatbase.co`, not a general policy change — `ui.shadcn.com`,
  `docs.langchain.com`, and `shopify.dev` were each re-tested too and
  are all still genuinely blocked, so those docs' claims were left
  alone. Corrected the stale claims in both research docs above and
  this file. Used the new access proactively, not just to fix docs:
  re-fetched the two `persona-template-ux.md` sources directly (the
  decoupled persona/tools-steps finding holds up; the specific
  "instruction-template dropdown" detail didn't re-confirm, flagged as
  unconfirmed not retracted) and found two previously-unexplored
  features with real public docs — **Guardrails** (rate limiting, spam
  detection, country/IP blocking — we have none of this today, a real
  open question, not yet in `docs/open-questions.md`) and **Procedures**
  (a named trigger+ordered-steps workflow for high-stakes multi-step
  interactions like refunds — a real middle ground between our flat
  tool registry and the already-deferred visual-flow-builder idea, not
  the same thing at smaller scale). Full detail in `docs/research/
  competitive-landscape.md`'s 2026-09-28 update. Also deduplicated an
  accidental verbatim-repeated paragraph in this file's own card-
  gallery-redesign entry, found while fixing its stale claim.
- Model tier + temperature picker (2026-09-28, ADR 0026): first of
  Chatbase's "Build" section's 5 sub-areas tackled — a "Model" card in
  the bot editor's Persona tab (Sonnet/Haiku/Opus, Claude-only per ADR
  0002) + a temperature slider genuinely adjustable only for Haiku.
  Real finding mid-build, verified against the Anthropic SDK's own
  types: temperature is deprecated (locked to 1.0, else a 400) for
  every model released after Claude Opus 4.6 — covers Sonnet/Opus, not
  Haiku. UI disables + resets the slider for a locked tier (guardrail
  #4); the server (`actions.ts`) independently re-enforces the same
  lock. `BotConfigVersion.model`/`.temperature` migration applied and
  verified against a real local Postgres, RLS re-verified clean. Real,
  unrelated a11y bug also caught and fixed via a genuine axe-core
  failure: shadcn's default `Slider` forwards `aria-label` to `Root`
  instead of the actual `role="slider"` `Thumb` — fixed in
  `components/ui/slider.tsx`, documented as a delta per ADR 0025.
  Verified: `tsc` clean, all 10 guardrails, full unit suite, a new
  permanent e2e test, the full `bot-editor`/`accessibility`/`demo-data`
  e2e suites, and all 19 visual baselines (4 regenerated, stable across
  two runs). Guardrails and Procedures (the other two real gaps from
  the 2026-09-28 Chatbase research) are separate, larger follow-ups.
- Data sources rebuild (2026-09-29, Phase 1): Knowledge page renamed
  "Knowledge base" → "Data sources" and rebuilt to match Chatbase's own
  page — a 4th entry point (**text snippet**, `createTextEntry`, no
  file/URL round trip) plus search/type-filter/sort/bulk-select-delete
  on the table (`@tanstack/react-table` + `nuqs`, ADR 0024's pattern)
  and an informational total-size indicator (no cap — `docs/open-
  questions.md` #6 is unresolved). Real bug caught by a screenshot
  before shipping: `OptionCard`'s `line-clamp-2` truncated mid-word once
  the grid went 3→4 columns — fixed by shortening copy, not widening
  layout. **Deliberately out of scope, discussed with the user first**:
  real multi-page site crawling (`docs/open-questions.md` #3, still
  unresolved) and Notion-page/ticket sources (Notion needs a full OAuth
  connector; Tickets is Chatbase's own paywalled helpdesk integration).
  Verified: `tsc` clean, all 10 guardrails, full unit suite, 17
  `knowledge.spec.ts` tests (6 new), the knowledge a11y scan, both
  `knowledge-empty.png`/`knowledge-add-dialog.png` visual baselines
  regenerated + stable across two runs, full 19-baseline visual suite
  otherwise unchanged.
- Custom actions "Test this action" (2026-09-29): closed the biggest
  gap found comparing our existing Custom Actions (ADR 0022, already
  self-serve, no developer needed) against Chatbase's real docs — no
  way to test an endpoint before saving. Added a Test button to the
  Add-action dialog, sharing `performActionRequest` (new shared helper,
  `lib/ai/tools/customAction.ts`) with the live bot tool call, so a
  passing test is a real guarantee. Verified end-to-end against a real
  endpoint (api.github.com). Real layout finding caught by screenshot:
  a same-row test-value input cramped the field grid — fixed to a
  two-line stacked row, confirmed via `scrollWidth`/`clientWidth`.
  Still-open gaps vs. Chatbase, flagged not deferred silently: no typed
  inputs, no separate query-param section, no JSON body templating.
  Verified: `tsc` clean, all 10 guardrails, full unit suite, 2 new
  `actions.spec.ts` tests + a11y scan (22/22), visual suite unchanged.
- Conversations Activity rebuild (2026-09-29, ADR 0027): `/conversations`
  rebuilt into a split-pane layout (list left, Chat/Details panel right)
  from 5 real Chatbase screenshots + their actual docs (not guessed).
  New `Conversation.status`/`.source` fields power real pause/resume
  (the bot skips its reply but still records the visitor's message,
  matching Chatbase's documented behavior) and Widget-vs-Playground
  tracking. Sentiment/Country deliberately show honest "Not analyzed"/
  "Not tracked" states rather than fabricated data (guardrail #4).
  Bulk-select + CSV export added. Full detail, including 3 real bugs
  caught while verifying: `docs/changelog.md`.
- In-chat widgets, Phase 1 (2026-09-29, ADR 0028): a `/bots/[botId]/
  widgets` page defines a Schema-driven form (text/number/checkbox/
  dropdown fields) the bot can render inline in the chat instead of
  collecting info through plain text. Researched from Chatbase's real
  "Widgets" docs — Functions (a widget calling a real API) and States
  (multi-view widgets) are deliberately deferred, `docs/open-
  questions.md` #9. Reuses the tool-calling interface unchanged (a
  tagged JSON string, same pattern every tool uses) — no chat-loop
  branching needed. Renders in both `public/widget.js` and
  `PreviewSheet.tsx`; a visitor's answers come back as their own next
  chat message. JSON Schema (not a custom shape) confirmed by the user.
  Verified: `tsc` clean, all 10 guardrails, full unit suite (181, 24
  new), RLS verified. Full detail: `docs/changelog.md`.
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
