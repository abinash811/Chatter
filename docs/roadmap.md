# Roadmap

**Product phase (see `docs/north-star.md`):** Phase 1 — chat-based
configurable agent platform, targeting Chatbase-level self-serve
configurability plus our own product opinions. Voice (Phase 2) and other
verticals/channels are explicitly deferred — do not scaffold them yet.

Now / Next / Later, not dated quarters — priorities shift faster than
dates hold at this stage. When something here ships, move it to
`docs/features.md`'s "Built" list and delete it from here. Update this
file whenever priorities genuinely change, not on a schedule.

Each entry says what it is and, where relevant, what research grounds
it — see `docs/research/competitive-landscape.md` for the full findings.

## Now (v1 / MVP)

The generic core plus one concrete vertical template — see
`docs/product-spec.md` for the full MVP scope and phasing rationale.

- Embeddable chat widget (shadow-DOM isolated, per-business theming)
- Admin console: bot list, bot editor (persona/guardrails/tools/
  appearance, draft/publish), Shopify connect flow
- Knowledge ingestion: manual Q&A, file upload (PDF/DOCX/txt/md),
  single-URL ingestion (`docs/features.md`, ADR 0013), and real
  multi-page site crawling with a JS-rendering + Firecrawl-last-resort
  fallback chain (2026-09-30 through 2026-10-02, ADR 0030/0031/0032) —
  all done, MVP scope complete.
- RAG retrieval as a tool call, not a hardcoded prompt prepend
- Five action tools: `search_knowledge_base`, `check_order_status`
  (read-only — see Next), `collect_lead` (write, generic — 2026-09-27,
  matches Chatbase's "Collect Leads"; see `/bots/[botId]/leads`),
  custom (business-defined) webhook actions (generic — 2026-09-27, ADR
  0022, matches Chatbase's Custom Actions; see `/bots/[botId]/actions`),
  and `request_order_cancellation` (write-capable, ecommerce — **built
  2026-09-28, ADR 0023** — see below). Every new tool going forward is
  industry-agnostic by default, not just ecommerce (scoping decision,
  2026-09-27) — `check_order_status` and `request_order_cancellation`
  stay the two deliberate vertical-specific exceptions.
- Write-capable action tools — **built (2026-09-28, ADR 0023).** The
  first write tool that can't be undone by "the AI was wrong"
  (`request_order_cancellation`) never executes itself: it queues a
  `PendingAction` and a human approves/rejects from a new
  `/bots/[botId]/approvals` page before the real Shopify call happens.
  Chosen over full automatic execution after a direct product
  conversation about the risk (an irreversible action a visitor could
  manipulate the bot into taking). See `docs/features.md`'s "Order
  cancellation (approval-gated)" entry.
- Demo data — **built (2026-09-27).** A one-click "Load sample data"
  button (`/bots`) creates a fully populated example bot (persona,
  knowledge, leads, a custom action, sample conversations) — see
  `docs/features.md`'s "Demo data" entry. Resolves the earlier "how
  broad should seeding be" open item from the 2026-09-27 directive: a
  real in-app feature, not just narrow per-test helpers.
- Email + password auth (ADR 0006), tenant isolation via RLS (ADR 0003)
- Conversation/Message/ToolCallLog data captured on every chat turn, and
  a dashboard-only conversation inbox (`/conversations`, ADR 0015) to
  view and filter it — see "Self-serve configurability" below.
- Test-your-bot preview — **built (2026-09-27).** A "Preview" button in
  the bot editor opens a chat that talks to the real, published bot —
  matches Chatbase's own docked "Chat as user" preview, confirmed from
  real screenshots. See `docs/features.md`'s "Test your bot" entry.
- Suggested-reply buttons — **built (2026-09-27).** Up to 3 chip buttons
  shown under the widget's first message, configured in the Appearance
  tab — matches Chatbase's own reference UI (confirmed from real
  screenshots). See `docs/features.md`'s "Widget appearance editor" entry.
- Card-gallery redesign — **built (2026-09-27).** Tools tab and
  Knowledge's ingestion picker both moved from a checkbox list/dropdown
  to a card grid, matching Chatbase's own reused Actions/Data sources
  pattern (confirmed from real screenshots, `docs/research/competitive-
  landscape.md`). New shared `components/console/OptionCard.tsx`.
- **Mobile-responsive console — explicitly out of scope** (2026-09-27
  user decision). The console targets desktop only; see
  `docs/product-spec.md`. Does not affect the embeddable widget itself.

## Self-serve configurability (Next — 2026-09-26 user directive)

The bar: "a dumb person should be able to land on this, configure, and
use it" — maximum self-serve control at the console, all real
complexity (RAG, gateway, tools) hidden behind it. Six pillars, each
marked with real status (not aspirational):

1. **Prompt/persona templates** — **built (2026-09-27).** A "Start from
   a template" dropdown in the bot editor's Persona tab, above the
   persona textarea (`lib/ai/personaTemplates.ts`, 3 hardcoded ecommerce
   use cases: Support, Sales, Lead-gen). Picking one only replaces the
   persona text — deliberately decoupled from guardrails and the Tools
   tab, matching Chatbase's real UX (`docs/research/persona-template-
   ux.md`) rather than the vertical-template concept ADR 0001 used to
   describe (now moot — ADR 0019 dropped that layer entirely). Adding a
   4th template later is a code change, not a migration.
2. **Tool enable/disable** — **already built.** Bot editor's Tools tab,
   per-tool checkboxes, `BotConfigVersion`, for the three static tools.
   Custom (business-defined) actions (ADR 0022) get their own per-action
   enable/disable toggle on `/bots/[botId]/actions` instead, since each
   one is its own object, not a fixed checkbox list. Nothing to do here
   beyond adding new static tools as they ship.
3. **Bot UI / appearance editor** — **built (2026-09-27).** Bot editor's
   Appearance tab: greeting + accent color (already existed) plus new
   avatar (curated emoji picker — no image upload/storage infra exists
   anywhere in this app yet, so an image avatar is explicitly deferred,
   not silently dropped) and position (bottom-right/bottom-left)
   controls. Flows end-to-end: form -> `saveDraftAction` ->
   `BotConfigVersion.appearance` (JSON) -> `/api/widget/config` ->
   `public/widget.js` actually renders the emoji and repositions the
   bubble/window. Verified with a real e2e spec
   (`tests/e2e/bot-editor.spec.ts`) that saves, reloads, and confirms
   both fields persisted — not just that the UI renders.
4. **RAG setup, user-facing** — ingestion (Q&A/file/URL) is built (ADR
   0013); retrieval *tuning* is not exposed at all — `search_knowledge_
   base`'s top-5 result cap and similarity behavior are hardcoded, not
   a business-owner-facing setting. Scope needs deciding: expose tuning
   knobs (risky — a "dumb person" bar argues against raw knobs), or
   keep it invisible and only improve it via `docs/ai-tech-radar.md`'s
   retrieval-quality upgrade (recommended — matches the simplicity bar
   better than a settings knob most users would misuse).
5. **Conversation inbox + filters** — **built** (`/conversations`, ADR
   0015 + ADR 0016): dashboard-only, filterable by bot/date/"has an
   issue" — plain-language summaries, not raw tool JSON, per ADR 0016.
   Deliberately no `status`/"resolved" filter yet — see `docs/open-
   questions.md` #7. No email/Slack push channel — that was the other
   half of the open question ADR 0015 resolved, deferred by choice.
6. **Nudges** — **not built at all**, not even in the schema. New
   concept beyond `docs/product-spec.md`'s original scope (the existing
   "Later" list only had a vague "proactive triggers (exit intent,
   time-on-page)" line). Needs real scoping before an ADR: trigger
   types, whether ecommerce-specific (cart abandonment) or generic,
   and where the config UI lives. See `docs/open-questions.md`.
7. **LLM model picker — built (2026-09-28, ADR 0026).** A Sonnet/Haiku/
   Opus tier picker + temperature slider in the bot editor's Persona
   tab, Claude-only (not multi-vendor — ADR 0002's scope). Temperature
   is genuinely adjustable only for Haiku, verified against the
   Anthropic SDK's own types (models after Claude Opus 4.6 reject any
   non-1.0 value). **Pricing visibility still not built** — BYOA (ADR
   0012) exists, but there's no pricing display at all today. Needs a
   decision: pricing shown for the managed-key path only (BYOA users
   pay Anthropic directly, so "our" pricing may not apply to them the
   same way), and what "pricing" means here — real per-token cost, a
   markup, or a simple tier label. See `docs/open-questions.md`.

Sequencing once each open question above is answered: appearance editor
and tool enable/disable's "nothing to do" make #2/#3 the fastest wins;
the conversation inbox (#5) is done; prompt templates (#1), nudges (#6),
and model/pricing (#7) each need a scoping decision before they're
buildable, not just time.

## Next

Validated by competitor research, not yet built:

- **RAG retrieval-quality upgrade** — scoped and sequenced 2026-09-27
  (see `docs/ai-tech-radar.md`'s Retrieval & search section for full
  detail). Two real bugs found while scoping this, fixed as phase 1
  below: the pgvector index was IVFFlat, built while the table was
  empty — IVFFlat's clusters are computed from whatever data exists at
  build time, so it's been silently degenerate since (`db/migrations/
  0002_pgvector.sql`'s own comment already flagged this as a
  placeholder); and `lib/ai/knowledgeBase.ts`'s ingestion embeds one
  chunk per HTTP call in a loop, when Voyage's embeddings endpoint
  accepts a batch of up to 128 texts per request (confirmed via
  WebSearch, not recalled).
  1. **Free fixes, no new decisions — built (2026-09-27).** HNSW index
     (verified against a real local Postgres: applied twice for
     idempotency, then ran the tool's exact retrieval query against
     real 1536-dim vectors and confirmed correct ranking), batched
     ingestion embedding calls (`embedBatch`, one call per document
     instead of one per chunk), query rewriting (the tool's `query`
     field now instructs Claude to resolve conversational context into
     a self-contained search query). See `docs/ai-tech-radar.md` for
     the full detail. Not verifiable end-to-end without a real
     `ANTHROPIC_API_KEY` — same documented gap as the rest of the
     engine.
  2. **Hybrid search — built (2026-09-27).** Postgres `tsvector`/
     `ts_rank` alongside the existing pgvector cosine search, fused via
     Reciprocal Rank Fusion — deliberately not a BM25 extension (ADR
     0021: AWS RDS doesn't support one, and the closest competitor's
     own validated pattern, Chatbase via Supabase, uses plain tsvector
     too). Verified against a real local Postgres: an exact keyword
     match that ranked #2 in vector-only search correctly won the fused
     ranking. See `docs/ai-tech-radar.md`.
  3. **RAG eval harness — built (2026-09-27).** `npm run eval:retrieval`
     — hand-rolled Precision@K/Recall@K/MRR against an 8-query labeled
     test set, calling the exact production hybrid-search query (not a
     duplicate). Checked RAGAS/DeepEval/TruLens/LangSmith's real repos
     directly first (all Python-only, or need a cloud account) before
     deciding to hand-roll — see `docs/ai-tech-radar.md`. Real caveat:
     semantic scores aren't meaningful until a real `VOYAGE_API_KEY`
     exists (the script falls back to a labeled mock embedding so the
     pipeline still runs end-to-end); full-text scores are real today.
  4. **Reranking** — Voyage `rerank-2` vs. Cohere Rerank v3.5. Step 3's
     eval harness now exists, so this is unblocked and decidable with
     real numbers — not yet started, the next concrete RAG item.
  Prioritized first among the RAG-architecture gaps since it improves
  every chunk already ingested, with no re-ingestion needed.
- **More write-capable action tools** — issue a refund, update a
  shipping address, edit/cancel a booking. Order cancellation shipped
  2026-09-28 (ADR 0023, human-approval-gated — see "Now" above), which
  also built the general pattern (`PendingAction` queue + `/approvals`
  page) any future write tool reuses without engine changes. A business
  can also already wire its own write-capable webhook via custom
  actions (ADR 0022) today — this item is about built-in,
  purpose-specific write tools for platforms we integrate with directly
  (e.g. a real Shopify refund call), not the general capability.
- **Resolution-rate analytics** — % of conversations resolved without
  human handoff. Intercom Fin's headline metric; we track nothing like
  it yet. Needs a definition of "resolved" first (closed by visitor
  leaving satisfied? no handoff triggered? — an open question to
  resolve before building, not a UI task).
- **Image input** — a visitor sends a photo (damaged item, wrong item).
  Validated by both Gorgias and Intercom Fin shipping it.
- **Guardrails Phase 1 (rate limiting + spam detection) — built
  (2026-09-30, ADR 0029).** Found via the 2026-09-28 Chatbase docs pass
  alongside Procedures (below) — see `docs/features.md`'s entry. Country/
  IP blocking (the third documented mechanism) stays deferred, needs a
  geolocation-vendor decision, `docs/open-questions.md` #10.
- **Procedures** — a named trigger + ordered-steps workflow for
  high-stakes multi-step interactions (refunds, escalations), found in
  the same 2026-09-28 Chatbase docs pass as Guardrails above. A real
  middle ground between our flat tool registry and the "Later"-deferred
  visual flow builder, not the same thing at smaller scale — still
  needs scoping (step syntax, `@`-action references, branching) before
  it's buildable, not just time.

## Later

Explicitly deferred — see `docs/product-spec.md`'s "Explicitly out of
scope for v1" for the full list. Notable additions from research:

- **Ingestion-quality upgrade** — adaptive per-source chunking, parent-
  child/contextual retrieval, table/OCR-aware parsing (today's
  extraction is plain-text-only — a table flattens into garbled text, a
  scanned PDF page extracts nothing). See `docs/ai-tech-radar.md`'s
  Ingestion & parsing section — deliberately after the retrieval-
  quality upgrade above, since it requires re-ingesting existing
  content to benefit and the table/OCR piece is the least-defined item
  on the radar (vendor/approach not yet chosen).
- **RAG evaluation harness + feedback loop** — a labeled test set (an
  open-source starting point, per the user's own call, rather than
  hand-built) run on every retrieval/chunking/prompt change, plus a
  production 👍/👎 signal. See `docs/ai-tech-radar.md`'s Eval & ops
  section. Deferred until there's a real eval set to run.
- Voice input (Intercom Fin ships it; not validated as needed for our
  target yet)
- Multi-channel beyond the website widget (WhatsApp, etc.)
- Outcome-based pricing (Intercom Fin's $0.99/resolution model) — a
  real, proven pattern in this category, worth revisiting whenever the
  currently-deferred billing/pricing decision gets made
- Multi-agent architecture (Zipchat's sales/support/marketing
  sub-agents) — our own research already concluded a single agent +
  tool registry should be tried first (see competitive-landscape.md's
  Claude Agent SDK section)
- Visual flow builder (Voiceflow/Botpress-style) — researched
  (competitive-landscape.md's 2026-09-26 update): a fundamentally
  different design philosophy (author a flow graph) from our current
  RAG+tool-calling approach, not a gap to close for v1 — see that
  section for when it'd actually be worth revisiting
- **Second vertical: healthcare** — explicit user sequencing (2026-09-26):
  prove the generic core solid on ecommerce (this roadmap's "Self-serve
  configurability" pillars) before starting a second vertical. Per ADR
  0019 (2026-09-27, supersedes ADR 0001), there is no template layer to
  build this against — when healthcare work actually starts, it's a
  direct code/config change to the engine (new default copy, new tools),
  not "author a template." Guardrail #3 applies in full once started —
  explicit diagnosis/PHI-advice refusal baked into the bot's default
  system prompt from the start, not bolted on after. Blocked on
  `docs/open-questions.md` #2 (compliance posture for regulated
  verticals) being answered first.
