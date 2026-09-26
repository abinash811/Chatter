# Roadmap

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
- Knowledge ingestion: manual Q&A, file upload (PDF/DOCX/txt/md), and
  single-URL ingestion all done (`docs/features.md`, ADR 0013) — MVP
  scope complete. Site crawling is separate, still open
  (`docs/open-questions.md` #4).
- RAG retrieval as a tool call, not a hardcoded prompt prepend
- Two action tools: `search_knowledge_base`, `check_order_status`
  (both read-only — see Next)
- Email + password auth (ADR 0006), tenant isolation via RLS (ADR 0003)
- Conversation/Message/ToolCallLog data captured on every chat turn, and
  a dashboard-only conversation inbox (`/conversations`, ADR 0015) to
  view and filter it — see "Self-serve configurability" below.

## Self-serve configurability (Next — 2026-09-26 user directive)

The bar: "a dumb person should be able to land on this, configure, and
use it" — maximum self-serve control at the console, all real
complexity (RAG, gateway, tools) hidden behind it. Six pillars, each
marked with real status (not aspirational):

1. **Prompt/persona templates** — pick a starting system prompt instead
   of writing one from scratch. **Not built.** Distinct from ADR 0001's
   *vertical* template (ecommerce/healthcare defaults + tool subset +
   compliance notes) — this is a use-case template *within* a vertical
   (support vs. sales vs. lead-gen tone/goals). Needs a decision: is
   this v1's single ecommerce vertical getting 2-3 use-case templates,
   or a cross-vertical template library? See `docs/open-questions.md`.
2. **Tool enable/disable** — **already built.** Bot editor's Tools tab,
   per-tool checkboxes, `BotConfigVersion`. Nothing to do here beyond
   adding new tools as they ship.
3. **Bot UI / appearance editor** — **known gap**, already tracked
   (widget theming fields — color/avatar/greeting/position — exist in
   the data model per `docs/product-spec.md`, but no console UI edits
   them yet). Promoted from a vague "Later" item to explicit v1-
   completion scope.
4. **RAG setup, user-facing** — ingestion (Q&A/file/URL) is built (ADR
   0013); retrieval *tuning* is not exposed at all — `search_knowledge_
   base`'s top-5 result cap and similarity behavior are hardcoded, not
   a business-owner-facing setting. Scope needs deciding: expose tuning
   knobs (risky — a "dumb person" bar argues against raw knobs), or
   keep it invisible and only improve it via `docs/ai-tech-radar.md`'s
   retrieval-quality upgrade (recommended — matches the simplicity bar
   better than a settings knob most users would misuse).
5. **Conversation inbox + filters** — **built** (`/conversations`, ADR
   0015): dashboard-only, filterable by bot/date/handoff-triggered.
   Deliberately no `status`/"resolved" filter yet — see `docs/open-
   questions.md` #7. No email/Slack push channel — that was the other
   half of the open question ADR 0015 resolved, deferred by choice.
6. **Nudges** — **not built at all**, not even in the schema. New
   concept beyond `docs/product-spec.md`'s original scope (the existing
   "Later" list only had a vague "proactive triggers (exit intent,
   time-on-page)" line). Needs real scoping before an ADR: trigger
   types, whether ecommerce-specific (cart abandonment) or generic,
   and where the config UI lives. See `docs/open-questions.md`.
7. **LLM model picker + pricing visibility** — BYOA (ADR 0012) exists,
   but there's no model *picker* (Claude model tier) or any pricing
   display at all today. Needs a decision: pricing shown for the
   managed-key path only (BYOA users pay Anthropic directly, so "our"
   pricing may not apply to them the same way), and what "pricing"
   means here — real per-token cost, a markup, or a simple tier label.
   See `docs/open-questions.md`.

Sequencing once each open question above is answered: appearance editor
and tool enable/disable's "nothing to do" make #2/#3 the fastest wins;
the conversation inbox (#5) is done; prompt templates (#1), nudges (#6),
and model/pricing (#7) each need a scoping decision before they're
buildable, not just time.

## Next

Validated by competitor research, not yet built:

- **RAG retrieval-quality upgrade** — hybrid search (Postgres full-text
  + vector), reranking, and query rewriting (folding conversation
  history into the retrieval query). See `docs/ai-tech-radar.md`'s
  Retrieval & search section for the full detail and the still-open
  reranker vendor choice (Voyage vs. Cohere). Prioritized first among
  the RAG-architecture gaps since it improves every chunk already
  ingested, with no re-ingestion needed.
- **Write-capable action tools** — issue a refund, update a shipping
  address, edit/cancel a booking — not just lookups. Gorgias treats
  these as core, not advanced; our tool registry (ADR 0002) already
  supports adding them without engine changes.
- **Resolution-rate analytics** — % of conversations resolved without
  human handoff. Intercom Fin's headline metric; we track nothing like
  it yet. Needs a definition of "resolved" first (closed by visitor
  leaving satisfied? no handoff triggered? — an open question to
  resolve before building, not a UI task).
- **Image input** — a visitor sends a photo (damaged item, wrong item).
  Validated by both Gorgias and Intercom Fin shipping it.
- **Design pass on `/bots/[botId]/integrations`** — bot list and bot
  editor got theirs (`docs/design/preview/bots-list.html`,
  `bot-editor.html`); integrations is the one console page left.
- **Site crawling for ingestion** — `docs/open-questions.md` #4.
  Tidio's positioning (the closest match to our own SMB/self-serve
  target, per the research) treats this as table stakes for a fast
  setup, which is a real point in favor of prioritizing it, not proof
  it must ship in v1 — still the user's call.

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
- **Second vertical template: healthcare** — explicit user sequencing
  (2026-09-26): prove the generic core solid on ecommerce (this
  roadmap's "Self-serve configurability" pillars) before adding a
  second template. `docs/product-spec.md`'s phasing already calls this
  out (generic core always, one concrete template first); this just
  records the healthcare-next intent plainly. Guardrail #3 applies in
  full once started — explicit diagnosis/PHI-advice refusal baked into
  the template's default system prompt, not bolted on after. Blocked on
  `docs/open-questions.md` #3 (compliance posture for regulated
  verticals) being answered first.
