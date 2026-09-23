# Chatter

Vertical-agnostic AI chat platform. See `CLAUDE.md` and `docs/` for
product spec, architecture, and decisions (ADRs).

## What's scaffolded so far

Just the tenant-isolation foundation (ADR 0003) — schema, RLS policies,
and the query helper that enforces them. No app UI or bot engine yet;
those are next, blocked on the remaining items in
`docs/open-questions.md`.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and point `DATABASE_URL` at a Postgres
   instance.
3. `npm run db:migrate` — creates the base tables from `prisma/schema.prisma`.
4. Apply `db/migrations/0001_init_rls.sql` against the same database —
   this adds the Row-Level Security policies Prisma doesn't manage
   directly. Run it after every `db:migrate` that touches a tenant-scoped
   table.

## Tenant isolation

Every tenant-scoped query must go through `withOrgContext` in `lib/db.ts`,
never the raw Prisma client. It sets `app.org_id` for the transaction,
which the RLS policies in `db/migrations/0001_init_rls.sql` require —
without it, those tables return zero rows rather than leaking across
tenants. See `docs/adr/0003-auth-multi-tenancy.md` for why this is
enforced at the database layer instead of in application code.
