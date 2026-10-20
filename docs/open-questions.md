# Open Questions

Decisions not yet made. Owner is the user unless noted. Once answered,
resolve into an ADR (`docs/adr/`, use the `new-adr` skill) and update
`docs/architecture.md`, then delete the entry here.

## Product/scope questions

2. **Compliance posture for regulated verticals**, healthcare especially.
   Do we need real PII/PHI handling rules now, or explicitly scope
   healthcare's eventual default config as "not for PHI, informational
   only" and revisit? Blocks starting healthcare work at all — see
   `docs/roadmap.md`'s sequencing decision (ecommerce first, healthcare
   second) and `docs/north-star.md`'s Phase 2 (corrected 2026-10-11 to
   match that sequencing). No vertical-template layer exists to scope
   this against (ADR 0019) — whatever's decided here becomes healthcare's
   own default persona/guardrail config directly, not a template setting.
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
   "Resolution-rate analytics" (Next section) needs a real definition
   of "resolved" before it's buildable — closed by visitor leaving
   satisfied? no handoff triggered? something else? ADR 0015
   deliberately left this undefined rather than picking a definition
   while building the conversation inbox. **Partially touched but not
   resolved by ADR 0027** (2026-09-29, the Activity rebuild): the new
   `Conversation.status` field ("ongoing"/"paused") is a different
   concept — whether the bot is currently generating AI replies — not
   the "resolved for analytics" idea this question asks about. Still
   open. **This is the one canonical copy of this question**
   (2026-10-11 cleanup: `docs/roadmap.md` and `docs/business-logic.md`
   both independently restated the same text, which would have drifted
   the next time one got edited and not the others — both now just
   point here instead).
8. **App compute platform** (narrowed 2026-09-27 — the database half is
   resolved: AWS RDS for PostgreSQL, ADR 0021). Cloud provider is AWS;
   still open is where the Next.js app itself runs — AWS App Runner
   (closest to Render's simplicity), ECS Fargate (more control), or EC2
   (full control, most ops burden). User said this is "decided later,"
   not blocking anything today. Distinct from the (now resolved,
   ADR 0039) hosted-SaaS-only question — that was whether we'd ever
   offer self-hosting as a *product* option to businesses; this is
   where *our own* managed instance runs. Now has a real added
   constraint (2026-10-02, ADR 0031): JS-rendering fallback for URL/
   crawl ingestion needs a real Chromium binary available wherever this
   app runs, so whichever target is picked must support that.
9. **In-chat widgets, States/multi-view widgets** (2026-09-29, ADR
   0028). Phase 1 (Schema-driven forms) shipped 2026-09-29; Phase 2
   (Functions — an opt-in real API call on submit, write-capable ones
   gated behind the existing `PendingAction` approval queue) shipped
   2026-09-30 — see `docs/features.md`. Still open, not yet scoped:
   what expression syntax would States' visibility conditions use
   (simple field comparisons only, per ADR 0028 — but the exact grammar
   isn't chosen)? Not blocking anything else — Phases 1 and 2 are a
   complete, independently useful slice on their own.

10. **Country/IP blocking geolocation vendor** (2026-09-30, ADR 0029).
    Guardrails Phase 1 (rate limiting + spam detection) is built; the
    third Chatbase-documented mechanism, country/IP-based blocking,
    needs a real geolocation vendor/library choice first (MaxMind,
    ipapi.co, a Cloudflare header, a self-hosted IP database) — a
    genuine cost/accuracy/new-dependency tradeoff, not picked silently.
    Not blocking anything else — rate limiting and spam detection are a
    complete, independently useful slice on their own.

## Not yet asked

- Billing/pricing model — explicitly deferred, not needed until there's a
  product to charge for. Note (2026-09-26): the user floated a one-time
  setup fee (instead of recurring) as part of the same request that led
  to BYOA — flagged as a real, separate business-model call with
  sustainability implications (we still host infra indefinitely even
  when a business brings its own LLM key) rather than silently building
  around it. BYOA itself shipped (ADR 0012); the pricing question is
  still open.
- **Internationalization (i18n/l10n)** — flagged 2026-10-11 by a docs
  critique, not asked about before. Nothing in this codebase or any doc
  addresses translated console/widget copy, locale-aware date/currency
  formatting, or RTL — yet `docs/product-spec.md`'s own named
  inspiration, Zipchat AI, is described there as supporting 95+
  languages. Needs real scoping before an ADR: does the *console* need
  translation (who are business owners expected to be), does the
  *widget* need per-visitor language detection/switching independent of
  the console's language, and is this a v1 gap or a deliberately
  deferred one — right now it's neither, it's just unaddressed.
- **Data residency / regional hosting** — flagged 2026-10-11. `docs/open-
  questions.md` #8 (app compute platform) picks AWS region/compute
  purely on ops convenience; nothing anywhere addresses whether an EU
  (or other region's) business needs its data to physically stay in
  that region. Distinct from #8 — that's where *our* instance runs by
  default, this is whether a business ever needs a say in where *their*
  data lives. Not needed until there's real demand from a specific
  market, but currently invisible as a question rather than honestly
  deferred.
- **GDPR/CCPA data-subject rights (export/delete personal data)** —
  flagged 2026-10-11, and a real, not-yet-noticed tension: ADR 0018
  (bot archiving) deliberately preserves every conversation/lead's PII
  forever, justified by guardrail #6's traceability requirement — but
  nothing anywhere defines a deletion or export path for a visitor's or
  lead's personal data. "Keep everything forever for traceability" and
  "honor a deletion request" are headed for direct conflict the first
  time either a regulator or a business operating under GDPR/CCPA asks
  for one. Needs a real decision before it's a launch blocker, not
  after: does a deletion request anonymize `Message`/`Lead` rows in
  place (keeping the traceability shape, losing the PII), hard-delete
  them (losing traceability for that conversation), or something else?

## Resolved

- ~~Hosted SaaS vs. also self-hostable?~~ — hosted SaaS only, no
  self-hosted deployment option (2026-10-11, surfaced by a docs
  critique rather than genuinely re-litigated — the architecture, RLS
  multi-tenancy against one shared database and BYOA scoped to API
  keys only, had already answered this in practice). See ADR 0039.
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
