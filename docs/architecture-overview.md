# Architecture overview — visual companion

A single visual reference for the whole system — request flow, schema,
every HTTP route and its real payload shape, the AI stack, tenant
isolation, webhooks/write-capable actions, and real rate limits — meant
to be readable by a technical stranger with no other context.

**Live version (diagrams + full detail):**
https://claude.ai/artifact/VXMbRaBqRm3iwTx6MjPsFa

This file is the checked-in, text-only companion — it survives
independent of artifact-hosting access and lives in the repo's own
history. It summarizes; it doesn't replace the owning docs below, which
stay the detailed source of truth for their own area.

## What this points to, not duplicates

- `docs/api.md` — every HTTP route, exact request/response shapes
- `docs/architecture.md` — full system design
- `docs/business-logic.md` — how each core flow actually works
- `docs/security.md` — tenant isolation, auth, secrets, traceability in
  detail
- `docs/ai-tech-radar.md` — what's adopted/trialed for AI/RAG specifically

## The shape, in one paragraph

A visitor's message goes: embedded widget (`public/widget.js`, shadow
DOM) → `POST /api/chat` (stateless — `lib/ai/chat.ts`'s `sendMessage`,
no server-memory state) → a tool loop against Claude (capped at
`MAX_TOOL_ITERATIONS = 5`, hybrid-search RAG and up to 5 fixed tools
plus per-bot Custom Actions/Widgets available) → Postgres writes
(`Message`, `ToolCallLog` per call) → reply back to the widget. Every
tenant-scoped read/write goes through `withOrgContext` (`lib/db.ts`),
which Postgres Row-Level Security enforces, not application code alone.

## Real facts worth having without opening the Artifact

**Schema** (`prisma/schema.prisma`, 16 models): `Org` → `Bot` →
{`BotConfigVersion`, `KnowledgeSource`→`KnowledgeChunk`, `Conversation`
→`Message`, `Lead`, `CustomAction`, `Widget`, `PendingAction`}. Two RLS
exceptions, both resolvable before a tenant context exists:
`BotPublicKey` (widget identity) and `UserOrgAccess` (console-login
identity).

**HTTP routes** (`docs/api.md` owns the exact shapes):
`POST /api/chat`, `GET /api/widget/config`,
`GET /api/integrations/[provider]/callback`, `ALL /api/auth/[...nextauth]`.
Console pages use server actions, not HTTP routes.

**AI stack**: model gateway (`lib/ai/gateway.ts`, Claude-only today,
default `claude-sonnet-5`, prompt caching on the system prompt, adaptive
thinking on every call); hybrid-search RAG (pgvector cosine + Postgres
full-text via RRF, HNSW index, Voyage `voyage-3` embeddings, Voyage
`rerank-2` reranking over a 25-candidate pool — ADR 0021/0035); 5 fixed
tools + 2 per-bot factories (Custom Actions, Widgets).

**Rate limits** (real, not estimated): `/api/chat` 20/min/IP,
`/api/widget/config` 60/min/IP, both platform-level and not
configurable. Abuse-protection rate limiting/spam detection is per-bot,
opt-in, off by default (`lib/rateLimit.ts`, `lib/ai/abuseProtection.ts`).

**Latency: not yet measured.** This app has never completed a real
end-to-end Claude reply (no real `ANTHROPIC_API_KEY` used yet — the
same known gap CLAUDE.md's "Known gaps" already tracks). The Artifact's
Limits & latency section lists the real call sequence instead of an
invented number; the first real measurement needs a live key.

## Keeping this current

Part of this project's `ship-checklist` discipline (see that skill's
own entry for this) — a session that ships a new HTTP route, a schema
change, a new AI-stack piece, or a changed rate limit updates both this
file and republishes the Artifact (same `file_path`/`url`, so the link
stays stable) in the same pass, the same way `docs/api.md`/
`docs/features.md` already get updated in-PR. This is a checked
process step, not an automatic regeneration — there's no CI-wired
"rebuild on every push" pipeline yet, since that needs a deploy target
decided first (`docs/open-questions.md` #8).
