# Architecture (living doc)

Status: conceptual — components below are agreed in shape; concrete tech
choices are mostly still open (see `docs/open-questions.md`). Update this
doc as ADRs land instead of letting decisions live only in chat history.

## Components

### 1. Knowledge layer
- **Sources**: file upload (PDF/CSV/DOCX), manual Q&A pairs, a single
  URL's readable text, a pasted text snippet, structured records (a
  generic "catalog" concept — rows with a name, description,
  attributes, price/availability — flexible enough to be a SKU, a clinic
  service, or a car listing). The console's "Data sources" page (`/bots/
  [botId]/knowledge`, 2026-09-29) also has search/type-filter/sort and a
  bulk-select+delete mode across these. Multi-page site crawling is a
  separate, still-open question for v1 (`docs/open-questions.md` #3) —
  today's "website" source ingests one page only.
- **Storage**: embeddings for unstructured content (semantic search) +
  structured rows for anything filterable/exact (price, availability,
  specs). Vector store choice is open — see open questions.
- **Refresh**: re-ingestion strategy for content that changes over time is
  not yet designed.

### 2. Bot engine (Claude-powered)
- System prompt assembled per-bot at request time from that bot's current
  **published config version** (see design rule in section 5) — base
  persona + business-level overrides + guardrails. No vertical-template
  layer in the assembly (ADR 0019 — dropped; each bot's persona/tools/
  guardrails are just that bot's own config).
- RAG retrieval exposed as a **tool call**, not a hardcoded context prepend
  — lets the model decide when it actually needs to look something up.
- **Prompt caching**: the assembled system prompt (persona +
  guardrails) is marked with `cache_control` and placed first in the
  request, since it's identical across every message to that bot until
  republished — the published-version design (§5) makes cache
  invalidation automatic and correct. RAG results and conversation
  history go after, uncached. Cuts per-message cost ~90% on the cached
  portion.
- Action tools live in one shared registry (`lib/ai/tools/`), not scoped
  per vertical (ADR 0019). Each tool either calls a business-configured
  webhook/integration, or
  falls back to "collect info + hand off to human" (guardrail #4 in
  CLAUDE.md — this is not optional). A tool may also implement an
  optional `describeForInbox(input, output)` (ADR 0016), returning a
  plain-language summary and whether the call counts as an issue for the
  conversation inbox (`/conversations`) — each tool decides this for its
  own output shape, never a hardcoded case in the core engine.
- **Custom (business-defined) tools are a second, parallel path, not
  registry entries** (ADR 0022): a business owner can define their own
  webhook action per bot (`CustomAction` model, `/bots/[botId]/actions`)
  since its name/schema/URL are per-bot data, not code known at compile
  time. `lib/ai/chat.ts` builds each turn's tool list by merging the
  static registry's tools with that bot's enabled `CustomAction` rows
  (built fresh via `buildCustomActionTool`, `lib/ai/tools/
  customAction.ts`) — the static registry itself is untouched. Same
  guardrail #4 fallback and an SSRF guard on the business-supplied URL.
  A "Test this action" step (2026-09-29) in the console dialog fires a
  real request with sample values before saving, sharing the exact
  request-building code (`performActionRequest`) the live tool call
  uses — no developer needed to confirm a business's own endpoint
  actually works, closing the gap against Chatbase's own real
  custom-action builder's "test with live data" step.
- **Write-capable tools never execute directly — they queue a
  `PendingAction` for human approval** (ADR 0023). A tool like
  `request_order_cancellation` validates the request and writes a
  `pending` row instead of calling the external API itself; the actual
  write happens only when a business owner approves it from
  `/bots/[botId]/approvals` (`lib/pendingActions.ts`). Read-only and
  low-stakes-write tools (lookups, `collect_lead`, custom actions) are
  unaffected — this only applies to a tool whose effect can't be undone
  by "the AI was wrong."
- **In-chat interactive widgets, Phase 1 + 2 built** (2026-09-29/30,
  ADR 0028): a `Widget` model (per-bot, not draft/publish-gated, same
  precedent as `CustomAction`) rendered as a Schema-driven form inline
  in the chat, not just text. A dynamic tool factory
  (`lib/ai/tools/widget.ts`) is merged into every turn's tools the same
  way custom actions are; `handle()` returns a tagged JSON string
  (`{"type":"render_widget", ...}`) — the same structured-signaling
  pattern every other tool already uses, no interface change. The chat
  loop needs no early-exit branching: the model's own next turn, after
  seeing the tool result, naturally produces the accompanying text, and
  `lib/ai/chat.ts` just scans for the tag and attaches it to
  `SendMessageResult.widget`. The visitor's filled-in answers come back
  as their own next chat message over the existing `/api/chat`
  endpoint. Phase 2 (2026-09-30) adds Functions: an optional real API
  call on submit, reusing `performActionRequest`'s SSRF guard, and the
  `PendingAction` approval queue (ADR 0023) when the widget is
  write-capable — never a direct call from inside a chat turn.
  States/multi-view widgets remain deliberately deferred —
  `docs/open-questions.md` #9.
- Streamed responses back to the widget.
- **BYOA (bring-your-own API key)**: optional, per-org, off by default —
  a business can plug in their own Anthropic key from `/settings`
  instead of using our managed one. The model gateway (below) resolves
  it once per request; nothing past that point (tools, RAG, the chat
  loop) knows or cares which key served the call. See ADR 0012.
- **Model tier + temperature are per-bot config, not global** (ADR 0026):
  `BotConfigVersion.model`/`.temperature`, editable in the bot editor's
  Persona tab, flow straight into the gateway call — same-vendor Claude
  tiers only (Sonnet/Haiku/Opus), not a multi-provider picker (ADR
  0002's scope). Temperature is real (not just UI) only for Haiku — the
  Anthropic API rejects any non-1.0 value on models released after
  Claude Opus 4.6, which covers Sonnet/Opus — enforced both in the UI
  (disabled slider) and independently server-side (never trusting the
  client alone).

**Design rule: interface vs. connector are separate layers, from day one.**
What Claude sees — the tool name and JSON schema (`check_order_status`,
etc.) — must stay stable regardless of what actually fulfills it. The
fulfillment (a direct API call, a call to a platform's own MCP server
like Shopify's or a FHIR server's, or a call to an MCP server we operate
ourselves) is an internal, swappable implementation behind a thin handler,
never hard-wired into the tool-call site itself. This is what makes
"start with native/direct calls, add our own MCP server later for
specific connectors" an additive change instead of a rewrite — see
`docs/research/tool-calling-architecture.md` for the full reasoning. Skip
this separation now and that option gets expensive to add back later.

**Design rule: integrations are self-serve, not our team configuring per
business.** The console offers a short menu of "Connect X" options (e.g.
Connect Shopify, Connect WooCommerce, generic webhook as a fallback),
each a standard OAuth-style flow the business owner completes themselves
— no developer, no engineering work on our side per business. New
businesses on an already-supported platform cost us zero engineering;
only a genuinely new platform needs a connector built once.

### 3. Verticals (ADR 0019 — no template layer)
There is no vertical-template abstraction. The generic bot config
(persona, guardrails, enabled tools) is the whole model; ecommerce
defaults today are just that config, not a distinct "template" concept.
A future vertical (e.g. healthcare) is built as a direct code/config
change to the engine when actually needed — new default copy, new
guardrail prompts (CLAUDE.md guardrail #3), new tools — not authored
against a generic template schema. Guardrail #2 (no `if industry ==`
branches in shared engine code) still applies on its own merits, kept
for reviewability, independent of any template mechanism.

### 4. Embeddable widget
- Single script tag; renders in a shadow DOM so host-site CSS can't leak in
  or be leaked into.
- Per-business theming: colors, avatar, greeting, position.
- Talks only to our backend API — never holds secrets (guardrail #5).

### 5. Admin dashboard
- Setup wizard: create bot → configure knowledge → customize appearance
  → get embed snippet.
- Bot list: search, sort, rename/duplicate/archive. Archiving is a soft
  delete (`Bot.archivedAt`, ADR 0018) — kills the embed snippet and hides
  the bot everywhere, but keeps its conversations/knowledge/integrations.
  Search/sort on this screen uses `@tanstack/react-table` (row-model
  logic only, not rendering) with state persisted to the URL via `nuqs`
  (ADR 0024) — the pattern every future list screen should follow,
  piloted here before any wider rollout.
- Knowledge base management: add/edit/remove sources, see what's indexed.
- Live conversation inbox for human handoff.
- Analytics: volume, resolution rate, handoff rate, topics.

**Design rule: bot config is versioned data with a draft/publish split,
never a direct live edit.** A business editing persona, guardrails,
enabled tools, or appearance is always editing a **draft** — the live bot
keeps serving the last **published** version until they explicitly
publish. The console gives a test-chat preview against the draft so
changes can be tried before any real visitor sees them. Every publish
creates a new immutable version rather than overwriting the last one,
which buys: one-click rollback when a change goes wrong; a full history
of who changed what and when (relevant once a business has multiple
teammates with dashboard access); and, combined with guardrail #6, every
conversation recording exactly which config version produced it, so
debugging a bad answer is never guesswork. A conversation already
underway keeps the version it started with — a publish mid-conversation
never shifts persona or guardrails mid-thread for that visitor. Because
config is read on every incoming chat message, it sits on the hot path
and needs a caching story where publish reliably invalidates/propagates
the new version — not something assumed to "just work." And because
config is structured data rather than code, adding a new tunable later
is "add a field + a console control," not "add a branch to the bot
engine" — the same discipline guardrail #2 requires for verticals,
applied here to every future setting.

### 6. Multi-tenancy — implemented
- Org/business → bot(s) → conversations, with role-based dashboard access
  (`owner`/`admin`/`member` per org, via `Membership`).
- Tenant isolation (guardrail #1) is enforced by **Postgres Row-Level
  Security**, not application code alone — see ADR 0003. Every
  tenant-scoped table carries `orgId` and an RLS policy; every request
  sets `app.org_id` for its transaction via `lib/db.ts`'s
  `withOrgContext`, which is the only sanctioned way to query tenant data.
  Schema: `prisma/schema.prisma`. Policies: `db/migrations/0001_init_rls.sql`.

### 7. Design system
- Baseline: good contrast, full keyboard navigation, visible focus
  states, and screen-reader support — judged on whether it's actually
  usable, not against a named certification. See `docs/accessibility.md`.
- Consistency mechanism: **design tokens**, not per-screen discipline —
  colors, type scale, spacing, and radius defined once and referenced
  everywhere, split into a fixed structural layer (component behavior/
  layout) and a thin theme layer (the only thing that varies). Same
  generic-core-plus-thin-configurable-layer pattern used elsewhere in this
  architecture (the tool interface/connector split), applied to design
  instead of code.
- Foundation: **shadcn/ui's official registry** (Radix-based via the
  unified `radix-ui` package, accessible by default, ships with a token
  system) — locked in as of ADR 0014, after an intermediate detour
  through an exact copy of CARE's fork (ADR 0008), which got dropped as
  both a component source and a visual reference (ADR 0010, ADR 0011)
  once verbatim-pulling CARE's drifted assumptions produced three
  separate silent bugs invisible to `tsc`/the build. `scripts/pull-
  shadcn-component.mjs` pulls real, current source directly from
  `github.com/shadcn-ui/ui` (the live registry API at `ui.shadcn.com` is
  blocked by this environment's egress policy; `raw.githubusercontent.
  com` isn't). Known gap to plan for: an independent 2026 usability
  audit of shadcn's 48 components found 34 pass out of the box, 9 need
  minor fixes, and 5 have real gaps — **Combobox, Data Table, Context
  Menu, Chart, Input OTP** — relevant to the analytics dashboard (Chart)
  and knowledge-base management screens (Data Table) specifically.
- Layout/structure reference: **Claude Console's real, current product**
  (ADR 0014) — collapsible sidebar sections, bordered-not-shadowed
  cards, solid-dark primary vs. outlined secondary buttons, borderless
  plain-text tables. Typography/color stay shadcn's own defaults, not
  Anthropic's brand serif/palette (a separate commercial product
  shouldn't copy another's exact brand assets). Rollout is new-screens-
  first — existing shipped screens keep their CARE look until each is
  deliberately migrated, not a blanket repaint.
- Two surfaces, two consistency rules:
  - **Admin console** (our product): one fixed brand/token set everywhere,
    no per-screen exceptions.
  - **Embeddable widget**: the business customizes color/logo/greeting
    per guardrail-free branding needs, so it can't have one fixed brand —
    what must stay consistent instead is the *system* (spacing rhythm,
    interaction patterns), and accessible contrast is enforced even
    against a business's chosen colors rather than left to chance.
- Quality bar, on top of the accessible foundation above: **Linear/Stripe/
  Notion-caliber UX**, not applied uniformly but matched per surface —
  Linear's density/speed/keyboard-first register for the console's daily-
  driver screens, Notion's calm/progressive-disclosure register for its
  configuration surfaces, Stripe's restrained/trustworthy register for
  anything touching a business's real data or the healthcare vertical,
  and Notion's approachable warmth for the widget's default look. Full
  reasoning and concrete techniques (⌘K command palette, optimistic UI
  updates, fixed spacing rhythm, progressive disclosure) in
  `docs/research/design-system-standards.md`.

## Data flow (conceptual)

```
Visitor → Widget (script tag, shadow DOM)
        → Backend API (auth'd to a specific business/bot)
        → Bot engine
            ├─ system prompt = persona + overrides + guardrails
            ├─ RAG retrieval tool → knowledge store (scoped to business_id)
            └─ action tools → business webhook, or → handoff queue
        → Claude (streamed)
        → Widget

Business owner → Admin dashboard → Backend API (auth'd to their org)
        → knowledge ingestion, bot config, conversation inbox, analytics
```

## Explicitly not decided yet

See `docs/open-questions.md`. Highlights: hosting model (SaaS vs.
self-hostable), concrete stack (frontend/backend/DB/vector store), auth
approach, and how action tools reach a business's real systems.
