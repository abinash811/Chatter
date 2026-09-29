# Open Questions

Decisions not yet made. Owner is the user unless noted. Once answered,
resolve into an ADR (`docs/adr/`, use the `new-adr` skill) and update
`docs/architecture.md`, then delete the entry here.

## Blocking further scaffolding

1. **Hosted SaaS vs. also self-hostable?** Changes how much multi-tenancy
   and billing infra is needed from day one.

## Product/scope questions

2. **Compliance posture for regulated verticals**, healthcare especially.
   Do we need real PII/PHI handling rules now, or explicitly scope v1's
   healthcare template as "not for PHI, informational only" and revisit?
3. **Site crawling in v1 ingestion**, or manual upload/Q&A only for v1 with
   crawling added later? Crawling is high-value but adds real scope
   (crawler, dedup, refresh scheduling, respecting robots.txt, etc.).
   Reaffirmed as deferred 2026-09-29 during the Data sources rebuild
   (`docs/features.md`) — everything else Chatbase's Data sources page
   has (text snippet, search/filter/sort, bulk select, total size) got
   built; only real multi-page crawling ("Add website" with link counts/
   re-sync/auto-resync) still needs this decision before it's buildable.
5. **Nudges — scope and mechanism** (`docs/roadmap.md`'s "Self-serve
   configurability" #6). What triggers (exit-intent, time-on-page,
   scroll-depth, cart-abandonment)? Generic across verticals or
   ecommerce-specific to start? Where does the business owner configure
   them — a new console section, or folded into the appearance editor?
   No recommendation yet — needs real scoping (and likely a small
   competitor check: how Intercom/Drift/Tidio actually expose this)
   before an ADR.
6. **Pricing display** (`docs/roadmap.md`'s "Self-serve configurability"
   #7 — the model-picker half of this item is now built, ADR 0026: a
   Sonnet/Haiku/Opus tier picker + a temperature slider that's only
   functionally enabled for Haiku, since the Anthropic SDK's own types
   mark temperature deprecated for every model released after Claude
   Opus 4.6, which covers Sonnet/Opus but not Haiku). Still open: does
   pricing display apply to BYOA users at all (they pay Anthropic
   directly) or only the managed-key path? What does "pricing" mean
   here — real per-token cost passed through, a markup, or a simple
   tier label ("fast" vs. "smart")? The last option ties into the
   still-open billing/pricing model question below — a real per-token
   cost display only makes sense once that's answered.
7. **`Conversation` "resolved" status semantics.** `docs/roadmap.md`'s
   Next section ("Resolution-rate analytics") needs a real definition
   of "resolved" before it's buildable — closed by visitor leaving
   satisfied? no handoff triggered? something else? ADR 0015
   deliberately left this undefined rather than picking a definition
   while building the conversation inbox. **Partially touched but not
   resolved by ADR 0027** (2026-09-29, the Activity rebuild): the new
   `Conversation.status` field ("ongoing"/"paused") is a different
   concept — whether the bot is currently generating AI replies — not
   the "resolved for analytics" idea this question asks about. Still
   open.
8. **App compute platform** (narrowed 2026-09-27 — the database half is
   resolved: AWS RDS for PostgreSQL, ADR 0021). Cloud provider is AWS;
   still open is where the Next.js app itself runs — AWS App Runner
   (closest to Render's simplicity), ECS Fargate (more control), or EC2
   (full control, most ops burden). User said this is "decided later,"
   not blocking anything today. Distinct from #1 above (that's whether
   we ever offer self-hosting as a *product* option to businesses; this
   is where *our own* managed instance runs).
9. **In-chat widgets, Phase 2 (Functions that call a live API, and
   States/multi-view widgets)** (2026-09-29, ADR 0028). Phase 1
   (Schema-driven forms, JSON Schema format, transport via the existing
   tool-result channel) shipped 2026-09-29 — see `docs/features.md`.
   Still open, not yet scoped: should a widget's submit action call a
   real API (reusing `performActionRequest`, per ADR 0028's decision
   section) as an opt-in per widget, or stay collection-only forever?
   What expression syntax would States' visibility conditions use
   (simple field comparisons only, per ADR 0028 — but the exact grammar
   isn't chosen)? Not blocking anything else — Phase 1 is a complete,
   independently useful slice on its own.

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
- ~~Human handoff channel for v1~~ — dashboard inbox only, no email/
  Slack push in this pass. See ADR 0015.
- ~~Prompt/persona template scope~~ (2026-09-27) — 3 hardcoded ecommerce
  templates (Support, Sales, Lead-gen), persona text only (decoupled
  from tools, matching Chatbase's real UX per `docs/research/persona-
  template-ux.md`), picked from a dropdown in the bot editor's Persona
  tab. See `docs/features.md`.
