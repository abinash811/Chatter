# Chatter

Vertical-agnostic AI chat platform. See `CLAUDE.md` and `docs/` for
product spec, architecture, and decisions (ADRs).

## What's scaffolded so far

- Tenant-isolation foundation (ADR 0003) — schema, RLS policies, query
  helper.
- Bot config versioning (draft/publish) and knowledge base tables
  (`prisma/schema.prisma`), with pgvector for embeddings
  (`db/migrations/0002_pgvector.sql`).
- Model gateway (ADR 0002) — `lib/ai/gateway.ts` — and the system-prompt
  assembler with prompt caching — `lib/ai/systemPrompt.ts`.
- Tool layer: `lib/ai/tools/registry.ts` (interface/connector split),
  `searchKnowledgeBase.ts` (generic RAG retrieval), `checkOrderStatus.ts`
  (first ecommerce action tool, Shopify Admin API, with the mandatory
  handoff fallback when no integration is connected). `Integration` model
  stores per-business OAuth connections.

Not yet built: console UI, the OAuth "Connect Shopify" flow that
populates `Integration`, ingestion pipeline, the chat loop that ties
gateway+tools+systemPrompt together end to end. Still blocked on the
remaining items in `docs/open-questions.md`.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and point `DATABASE_URL` at a Postgres
   instance.
3. `npm run db:migrate` — creates the base tables from `prisma/schema.prisma`.
4. Apply `db/migrations/0001_init_rls.sql`, then `0002_pgvector.sql`,
   against the same database — RLS and pgvector aren't things Prisma
   manages directly. Re-run 0001's policies after any `db:migrate` that
   adds a new tenant-scoped table.
5. Set `ANTHROPIC_API_KEY` for `lib/ai/gateway.ts`.

## Tenant isolation

Every tenant-scoped query must go through `withOrgContext` in `lib/db.ts`,
never the raw Prisma client. It sets `app.org_id` for the transaction,
which the RLS policies in `db/migrations/0001_init_rls.sql` require —
without it, those tables return zero rows rather than leaking across
tenants. See `docs/adr/0003-auth-multi-tenancy.md` for why this is
enforced at the database layer instead of in application code.
