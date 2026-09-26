# Architecture (living doc)

Status: conceptual — components below are agreed in shape; concrete tech
choices are mostly still open (see `docs/open-questions.md`). Update this
doc as ADRs land instead of letting decisions live only in chat history.

## Components

### 1. Knowledge layer
- **Sources**: file upload (PDF/CSV/DOCX), manual Q&A pairs, structured
  records (a generic "catalog" concept — rows with a name, description,
  attributes, price/availability — flexible enough to be a SKU, a clinic
  service, or a car listing). Site crawling is an open question for v1.
- **Storage**: embeddings for unstructured content (semantic search) +
  structured rows for anything filterable/exact (price, availability,
  specs). Vector store choice is open — see open questions.
- **Refresh**: re-ingestion strategy for content that changes over time is
  not yet designed.

### 2. Bot engine (Claude-powered)
- System prompt assembled per-bot at request time from that bot's current
  **published config version** (see design rule in section 5) — base
  persona + vertical template defaults + business-level overrides +
  guardrails.
- RAG retrieval exposed as a **tool call**, not a hardcoded context prepend
  — lets the model decide when it actually needs to look something up.
- **Prompt caching**: the assembled system prompt (persona + template +
  guardrails) is marked with `cache_control` and placed first in the
  request, since it's identical across every message to that bot until
  republished — the published-version design (§5) makes cache
  invalidation automatic and correct. RAG results and conversation
  history go after, uncached. Cuts per-message cost ~90% on the cached
  portion.
- Vertical action tools: a small per-template registry (e.g.
  `check_order_status`, `book_appointment`, `check_vehicle_availability`).
  Each tool either calls a business-configured webhook/integration, or
  falls back to "collect info + hand off to human" (guardrail #4 in
  CLAUDE.md — this is not optional).
- Streamed responses back to the widget.
- **BYOA (bring-your-own API key)**: optional, per-org, off by default —
  a business can plug in their own Anthropic key from `/settings`
  instead of using our managed one. The model gateway (below) resolves
  it once per request; nothing past that point (tools, RAG, the chat
  loop) knows or cares which key served the call. See ADR 0012.

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
business.** Each vertical template declares a short menu of "Connect X"
options (e.g. Connect Shopify, Connect WooCommerce, Connect your FHIR
EMR, generic webhook as a fallback), each a standard OAuth-style flow
(Shopify OAuth, SMART on FHIR for healthcare, etc.) the business owner
completes themselves from the console — no developer, no engineering
work on our side per business. New businesses on an already-supported
platform cost us zero engineering; only a genuinely new platform needs a
connector built once.

### 3. Vertical templates
- A template = default persona/tone + suggested KB structure + curated
  subset of action tools + suggested guardrails/compliance notes.
- Lives entirely in config/data, not in core engine code (guardrail #2).
- A business starts from a template and can diverge freely afterward.

### 4. Embeddable widget
- Single script tag; renders in a shadow DOM so host-site CSS can't leak in
  or be leaked into.
- Per-business theming: colors, avatar, greeting, position.
- Talks only to our backend API — never holds secrets (guardrail #5).

### 5. Admin dashboard
- Setup wizard: pick template → configure knowledge → customize appearance
  → get embed snippet.
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
  architecture (vertical templates, tool interface/connector split),
  applied to design instead of code.
- Foundation, not built from scratch: current (2026) default pairing for
  a Next.js + Tailwind stack is **shadcn/ui** (Radix-based, accessible by
  default, ships with a token system) rather than a hand-rolled component
  library. Not yet locked in — tech stack is still open — but the natural
  fit if the Next.js/Tailwind direction from
  `docs/research/tech-stack-trends-2026.md` is confirmed. Known gap to
  plan for: an independent 2026 usability audit of shadcn's 48
  components found 34 pass out of the box, 9 need minor fixes, and 5 have
  real gaps — **Combobox, Data Table, Context Menu, Chart, Input OTP** —
  relevant to the analytics dashboard (Chart) and knowledge-base
  management screens (Data Table) specifically.
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
            ├─ system prompt = persona + template + overrides + guardrails
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
