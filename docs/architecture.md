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
- System prompt assembled per-bot at request time: base persona + vertical
  template defaults + business-level overrides + guardrails.
- RAG retrieval exposed as a **tool call**, not a hardcoded context prepend
  — lets the model decide when it actually needs to look something up.
- Vertical action tools: a small per-template registry (e.g.
  `check_order_status`, `book_appointment`, `check_vehicle_availability`).
  Each tool either calls a business-configured webhook/integration, or
  falls back to "collect info + hand off to human" (guardrail #4 in
  CLAUDE.md — this is not optional).
- Streamed responses back to the widget.

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

### 6. Multi-tenancy
- Org/business → bot(s) → conversations, with role-based dashboard access.
- Tenant isolation is the single most important non-functional property of
  this system (guardrail #1) — every query path from widget → retrieval →
  bot context must be scoped to the owning business, enforced at the data
  layer, not just the application layer, once the DB is chosen.

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
