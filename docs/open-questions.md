# Open Questions

Decisions not yet made. Owner is the user unless noted. Once answered,
resolve into an ADR (`docs/adr/`, use the `new-adr` skill) and update
`docs/architecture.md`, then delete the entry here.

## Blocking further scaffolding

1. **Tech stack.** Next.js full-stack vs. separate frontend/backend vs.
   something else. Blocks: everything code-related, hooks that run
   lint/test/build, any MCP for DB inspection.
2. **Vector store / DB.** e.g. Postgres + pgvector vs. a dedicated vector
   DB (Pinecone, Weaviate, Qdrant, etc.). Depends on (1) to some degree.
3. **Auth & multi-tenancy implementation.** How orgs/businesses/users/roles
   are modeled and enforced (row-level security? App-layer scoping only?).
   This directly implements guardrail #1 (tenant isolation) — needs to be
   right, not fast.

## Product/scope questions

4. **Hosted SaaS vs. also self-hostable?** Changes how much multi-tenancy
   and billing infra is needed from day one.
5. **Human handoff channel for v1.** In-dashboard inbox only, or also push
   to email/Slack? Recommend: dashboard inbox only for v1, add channels
   later.
6. **How do action tools reach a business's real systems?** Options: (a) v1
   tools just collect structured info and land in the handoff queue, no
   real integration; (b) businesses configure a generic webhook the tool
   calls; (c) pre-built integrations (Shopify, Calendly, etc.). Recommend:
   (a) for v1, (b) as the extensibility story, (c) later — matches
   Zipchat's integration breadth without us having to build it all upfront.
7. **Compliance posture for regulated verticals**, healthcare especially.
   Do we need real PII/PHI handling rules now, or explicitly scope v1's
   healthcare template as "not for PHI, informational only" and revisit?
8. **Site crawling in v1 ingestion**, or manual upload/Q&A only for v1 with
   crawling added later? Crawling is high-value but adds real scope
   (crawler, dedup, refresh scheduling, respecting robots.txt, etc.).

## Not yet asked

- Billing/pricing model — explicitly deferred, not needed until there's a
  product to charge for.

## Resolved

- ~~Which vertical templates ship first~~ — ecommerce ships first as the
  only concrete v1 template; core stays generic throughout. See
  `docs/product-spec.md` § Phasing.
