# Open Questions

Decisions not yet made. Owner is the user unless noted. Once answered,
resolve into an ADR (`docs/adr/`, use the `new-adr` skill) and update
`docs/architecture.md`, then delete the entry here.

## Blocking further scaffolding

1. **Auth & multi-tenancy implementation.** How orgs/businesses/users/roles
   are modeled and enforced (row-level security? App-layer scoping only?).
   This directly implements guardrail #1 (tenant isolation) — needs to be
   right, not fast.

## Product/scope questions

2. **Hosted SaaS vs. also self-hostable?** Changes how much multi-tenancy
   and billing infra is needed from day one.
3. **Human handoff channel for v1.** In-dashboard inbox only, or also push
   to email/Slack? Recommend: dashboard inbox only for v1, add channels
   later.
4. **Compliance posture for regulated verticals**, healthcare especially.
   Do we need real PII/PHI handling rules now, or explicitly scope v1's
   healthcare template as "not for PHI, informational only" and revisit?
5. **Site crawling in v1 ingestion**, or manual upload/Q&A only for v1 with
   crawling added later? Crawling is high-value but adds real scope
   (crawler, dedup, refresh scheduling, respecting robots.txt, etc.).

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
