# Open Questions

Decisions not yet made. Owner is the user unless noted. Once answered,
resolve into an ADR (`docs/adr/`, use the `new-adr` skill) and update
`docs/architecture.md`, then delete the entry here.

## Blocking further scaffolding

1. **Hosted SaaS vs. also self-hostable?** Changes how much multi-tenancy
   and billing infra is needed from day one.

## Product/scope questions

2. **Human handoff channel for v1.** In-dashboard inbox only, or also push
   to email/Slack? Recommend: dashboard inbox only for v1, add channels
   later.
3. **Compliance posture for regulated verticals**, healthcare especially.
   Do we need real PII/PHI handling rules now, or explicitly scope v1's
   healthcare template as "not for PHI, informational only" and revisit?
4. **Site crawling in v1 ingestion**, or manual upload/Q&A only for v1 with
   crawling added later? Crawling is high-value but adds real scope
   (crawler, dedup, refresh scheduling, respecting robots.txt, etc.).
5. **BYOA (bring-your-own API key/account).** Let a business use their own
   Claude/provider key instead of our managed one. Cheap to add later
   given the model gateway (ADR 0002); recommend defaulting to our
   managed key for v1 and adding BYOA as a per-business config option
   once the gateway exists — not v1-blocking.

## Not yet asked

- Billing/pricing model — explicitly deferred, not needed until there's a
  product to charge for.

## Resolved

- ~~Which vertical templates ship first~~ — ecommerce ships first as the
  only concrete v1 template; core stays generic throughout. See
  `docs/product-spec.md` § Phasing.
- ~~Tech stack~~ and ~~vector store/DB~~ — Next.js+TS, Postgres+pgvector,
  shadcn/ui, Claude behind a model gateway. See ADR 0002.
- ~~How action tools reach a business's real systems~~ — native tool-calls
  now, our own MCP server later for connectors. Folded into ADR 0002.
- ~~Auth & multi-tenancy implementation~~ — Postgres Row-Level Security,
  enforced at the DB layer. See ADR 0003; scaffolded in `prisma/schema.
  prisma`, `db/migrations/0001_init_rls.sql`, `lib/db.ts`.
- ~~Widget auth~~ — public `botKey` (Stripe-publishable-key model)
  resolved server-side via `BotPublicKey`, a table deliberately exempt
  from RLS since it holds only an opaque-key-to-ID mapping. See
  `lib/db.ts`'s `resolveBotPublicKey` and `app/api/chat/route.ts`.
- ~~Tool-call traceability logging~~ — every tool call is now logged to
  `ToolCallLog`, independent of whether its result shaped the final
  answer. See `lib/ai/chat.ts`.
- ~~Console auth provider~~ — email + password via Auth.js Credentials,
  JWT sessions. See ADR 0006 (superseding ADR 0004's Google OAuth).
