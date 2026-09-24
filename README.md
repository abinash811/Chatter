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

- Generic connect/disconnect: `lib/integrations/provider.ts`
  (`IntegrationProvider` interface, one console flow for every platform)
  with `shopify.ts` as the first adapter — OAuth authorize URL, callback
  token exchange, disconnect. Needs `SHOPIFY_CLIENT_ID`,
  `SHOPIFY_CLIENT_SECRET`, `APP_BASE_URL`.

- Chat loop: `lib/ai/chat.ts` — stateless (`app/api/chat/route.ts` loads/
  persists everything from Postgres, no server-memory state), the tool
  loop with parallel tool-call handling and a max-iteration guard, pinned
  to the bot's published config. Widget auth is real (opaque `botKey` →
  server-side `{orgId, botId}` resolution, never client-supplied IDs —
  `BotPublicKey`) and every tool call is logged (`ToolCallLog`).

- Console app shell: `app/layout.tsx`, `app/globals.css` (design tokens
  per `docs/architecture.md` §7 — WCAG-AA-track shadcn zinc defaults, not
  yet independently contrast-audited), `tailwind.config.ts`,
  `components/ui/` (Button, Badge). First real screen:
  `app/(console)/bots/page.tsx`, a Linear-register dense bot list.
- Console auth (ADR 0004): Google OAuth via Auth.js (`lib/auth.ts`),
  JWT sessions, auto-provisions an org on first login. Needs
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`.

- Shopify connect flow, end to end: `app/(console)/bots/[botId]/
  integrations/page.tsx` (generic — renders whatever
  `listIntegrationProviders()` and each provider's `connectFields`
  describe, no Shopify-specific UI) and
  `app/api/integrations/[provider]/callback/route.ts`. `state` (not the
  console session) carries orgId/botId through the OAuth redirect —
  `handleCallback` decodes and returns them, so the callback route never
  needs its own auth context.

- Bot detail/edit page: `app/(console)/bots/[botId]/page.tsx` — the
  draft/publish loop from `docs/architecture.md` §5, implemented in
  `lib/ai/botConfig.ts`. Editing persona/guardrails/tools always
  updates the one current draft row in place; publishing flips it to
  `published` and never touches that row again — the next edit creates a
  new draft seeded from what was just published. Bot creation is wired
  from `bots/page.tsx`'s "New bot" form.

Not yet built: ingestion pipeline, a real onboarding flow (org naming,
invites, multi-org switcher), the appearance/theming editor (persona +
guardrails + tools only for now). Still blocked on the remaining items
in `docs/open-questions.md`.

## Local setup

Verified end to end on 2026-09-23 (see "Verified by a real run" below).

1. `npm install`
2. Postgres 16, with the `pgvector` extension package installed
   (`apt-get install postgresql-16-pgvector` on Debian/Ubuntu, or
   equivalent) — a plain, **non-superuser** app role, since a superuser
   silently bypasses Row-Level Security regardless of `FORCE ROW LEVEL
   SECURITY`, which would defeat the entire point of testing against it.
   `CREATEDB` is needed on that role only for `prisma migrate dev`'s
   shadow database.
3. Copy `.env.example` to `.env` and point `DATABASE_URL` at that role/DB.
4. `npm run db:migrate` — creates the base tables from `prisma/schema.prisma`.
5. As a superuser (once per database): `CREATE EXTENSION vector;` — the
   app role can't do this itself, even with `CREATEDB`.
6. Apply `db/migrations/0001_init_rls.sql`, then `0002_pgvector.sql`, as
   the app role — RLS and pgvector aren't things Prisma manages
   directly. Re-run 0001's policies after any `db:migrate` that adds a
   new tenant-scoped table.
7. Set `ANTHROPIC_API_KEY` for `lib/ai/gateway.ts`.
8. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (from a Google Cloud
   Console OAuth app), and `AUTH_SECRET` (any random string —
   `npx auth secret` generates one) for console login.

## Verified by a real run (2026-09-23)

Actually running this surfaced and fixed three real bugs no amount of
reading would have caught:

- **Every RLS policy was silently never created.** Prisma's
  `String @default(uuid())` maps to Postgres `text`, not the native
  `uuid` type, so every policy's `current_setting(...)::uuid` cast
  failed at `CREATE POLICY` time. With RLS *enabled* but zero policies,
  Postgres fails closed (denies all access) rather than failing open —
  so the bug wasn't a leak, but it did mean every query would have
  returned nothing. Fixed by dropping the `::uuid` casts in
  `db/migrations/0001_init_rls.sql` — plain text comparison, matching
  the actual column type.
- **The pinned `@anthropic-ai/sdk` version predated GA prompt caching**
  on the stable endpoint — `cache_control` only existed on that
  version's beta namespace, which `lib/ai/gateway.ts` wasn't using.
  Bumped to the current release.
- **Several TypeScript boundary mismatches** between our
  provider-agnostic `ModelTool`/`ModelContentBlock` types and the
  Anthropic SDK's stricter types (`input_schema` needs a literal
  `type: "object"`; `ToolUseBlock.input` is `unknown`, not
  `Record<string, unknown>`) and between tool call input and Prisma's
  `Json` field type. Fixed with targeted casts exactly at those
  boundaries — see `lib/ai/gateway.ts` and `lib/ai/chat.ts`.

`.github/workflows/ci.yml` now runs this same sequence (typecheck,
migrate, RLS + pgvector SQL, `scripts/verify-rls.mjs`, build) on every
push, against a real Postgres+pgvector service — with a non-superuser
app role created explicitly in the workflow, not the service's default
user, which is a superuser and would make the RLS check pass vacuously.

What was then verified as actually working: the login page renders and
redirects correctly (unauthenticated → `/login`); a direct RLS script
confirmed cross-tenant isolation holds (Org B cannot see Org A's bot by
listing, by exact ID, or with no org context set at all — all three
fail closed); and a full request through `/api/chat` — botKey
resolution, session/message persistence, system-prompt assembly, tool
registry — reached Anthropic's real API and failed only on the
placeholder API key (a genuine 401 from Anthropic's servers), meaning
everything before that boundary is confirmed correct. Not yet verified:
an actual Claude reply (needs a real `ANTHROPIC_API_KEY`) and the
Google OAuth login flow itself (needs a real Google Cloud Console app).

## Tenant isolation

Every tenant-scoped query must go through `withOrgContext` in `lib/db.ts`,
never the raw Prisma client. It sets `app.org_id` for the transaction,
which the RLS policies in `db/migrations/0001_init_rls.sql` require —
without it, those tables return zero rows rather than leaking across
tenants. See `docs/adr/0003-auth-multi-tenancy.md` for why this is
enforced at the database layer instead of in application code.
