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
5. **Prompt/persona template scope** (`docs/roadmap.md`'s "Self-serve
   configurability" #1). Is this 2-3 use-case templates within v1's
   single ecommerce vertical (support/sales/lead-gen tone+goals), or a
   cross-vertical library? Affects whether it's small scope now or
   waits until a second vertical exists to make "cross-vertical"
   meaningful. Recommend: 2-3 ecommerce use-case templates now — a
   library with only one vertical to draw from isn't really a library
   yet.
6. **Nudges — scope and mechanism** (`docs/roadmap.md`'s "Self-serve
   configurability" #6). What triggers (exit-intent, time-on-page,
   scroll-depth, cart-abandonment)? Generic across verticals or
   ecommerce-specific to start? Where does the business owner configure
   them — a new console section, or folded into the appearance editor?
   No recommendation yet — needs real scoping (and likely a small
   competitor check: how Intercom/Drift/Tidio actually expose this)
   before an ADR.
7. **LLM model picker + pricing display** (`docs/roadmap.md`'s "Self-
   serve configurability" #7). Does pricing display apply to BYOA users
   at all (they pay Anthropic directly) or only the managed-key path?
   What does "pricing" mean here — real per-token cost passed through,
   a markup, or a simple tier label ("fast" vs. "smart")? The last
   option ties into the still-open billing/pricing model question below
   — a real per-token cost display only makes sense once that's
   answered.

## Not yet asked

- Billing/pricing model — explicitly deferred, not needed until there's a
  product to charge for. Note (2026-09-26): the user floated a one-time
  setup fee (instead of recurring) as part of the same request that led
  to BYOA — flagged as a real, separate business-model call with
  sustainability implications (we still host infra indefinitely even
  when a business brings its own LLM key) rather than silently building
  around it. BYOA itself shipped (ADR 0012); the pricing question is
  still open.

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
- ~~BYOA (bring-your-own API key/account)~~ — built as an optional
  per-org setting (`/settings`), not the default: a business can plug
  in their own Anthropic key, or use our managed one. See ADR 0012.
- ~~Retroactively rewrite the 18 already-pulled CARE primitives?~~ —
  yes, re-pull all of them from shadcn/ui's official registry over
  time (new-screens-first, not a blanket pass) — superseded by the
  larger decision to move off CARE as both component source and visual
  reference entirely, replaced by shadcn/ui + Claude Console's real
  layout. See ADR 0014.
