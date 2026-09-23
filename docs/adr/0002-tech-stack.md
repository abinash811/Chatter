# ADR 0002: Tech stack for v1

Status: accepted

Date: 2026-09-23

## Context

Needed a concrete stack to start building the generic core (console, bot
engine, widget) for the ecommerce/Shopify v1. Grounded in
`docs/research/tech-stack-trends-2026.md` (current 2026 defaults for
AI-native multi-tenant SaaS) rather than picked from first principles.

## Decision

- **Frontend + backend**: Next.js + TypeScript, full-stack (API routes/
  server actions), one language across the team.
- **Database + vector store**: Postgres + pgvector — one system for
  structured data and embeddings, not a separate dedicated vector DB.
- **Design layer**: shadcn/ui + Tailwind, per `docs/architecture.md` §7.
- **LLM access**: behind a **model gateway**, not hardwired to a single
  vendor SDK. Claude is the default/primary model per the product brief,
  but the bot engine calls models through an abstraction layer so another
  provider (or another Claude model tier) can be swapped or added later
  without touching call sites — matches the model-gateway pattern noted in
  `docs/research/tech-stack-trends-2026.md`.
- **Tool-calling**: native tool-calls in the hot path; our own MCP server
  added later for external connectors, per
  `docs/research/tool-calling-architecture.md`.

## Alternatives considered

- Separate Python/FastAPI backend — rejected for v1: more moving parts,
  slower to ship with one small team; may still add a Python service later
  specifically for RAG/ingestion if the ecosystem need outweighs the cost.
- Dedicated vector DB (Pinecone/Weaviate) — rejected for v1: pgvector is
  the recommended default at this scale; revisit only if retrieval scale
  demands it.
- Hardwiring the Anthropic SDK directly at every call site — rejected per
  the user's explicit ask for model choice; the gateway costs a small
  abstraction now to avoid a rewrite later.

## Confirmed 2026-09-23

`lib/ai/gateway.ts`'s `ModelGateway` interface carries no Claude-specific
concepts (generic `messages`/`tools`/`text`/`stopReason`) — adding OpenAI
or Gemini later is a new implementation class + a config switch, not a
change to any caller. Prompt content may need re-tuning per model for
quality; that's not application code.

## Consequences

Unblocks scaffolding. The model gateway is the one deliberate extra layer
versus the simplest possible build — same "keep the swap cheap" principle
already applied to tool-calling (`docs/architecture.md` §2). Vector store
and backend split can change later without much rework since both are
already designed as swappable.
