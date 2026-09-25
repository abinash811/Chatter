# Chatter

Vertical-agnostic AI chat platform. See `CLAUDE.md` and `docs/` for
product spec, architecture, and decisions (ADRs).

## Deploying to Render (ADR 0005)

1. In the Render dashboard: **New → Blueprint**, connect this repo.
   Render reads `render.yaml` and provisions the web service + Postgres
   automatically, including running the idempotent migrations
   (`prisma migrate deploy` + `scripts/apply-sql-migrations.mjs`) before
   each deploy goes live.
2. After the first deploy, note the assigned URL
   (`https://<name>.onrender.com`).
3. In the Render dashboard, fill in the env vars `render.yaml` leaves
   blank (`sync: false`): `APP_BASE_URL` (the URL from step 2),
   `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SHOPIFY_CLIENT_ID`/
   `SHOPIFY_CLIENT_SECRET`.
4. Redeploy (or Render auto-redeploys on env var changes) once those
   are set.

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
  per `docs/architecture.md` §7 — finalized in ADR 0007, contrast
  verified), `tailwind.config.ts`, `components/ui/` (Button, Badge).
  First real screen:
  `app/(console)/bots/page.tsx`, a Linear-register dense bot list.
- Console auth (ADR 0006, superseding ADR 0004): email + password via
  Auth.js Credentials provider (`lib/auth.ts`, `lib/password.ts`), JWT
  sessions, auto-provisions an org on first login. Needs `AUTH_SECRET`.
  `app/login/page.tsx` and `app/signup/page.tsx` are the real entry
  points.

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
6. `node scripts/apply-sql-migrations.mjs` — applies
   `db/migrations/0001_init_rls.sql` then `0002_pgvector.sql` (RLS and
   pgvector aren't things Prisma manages directly). The same script
   Render's `preDeployCommand` and CI run — confirmed idempotent, so
   re-running it after any `db:migrate` that adds a new tenant-scoped
   table is always safe.
7. Set `ANTHROPIC_API_KEY` for `lib/ai/gateway.ts`.
8. Set `AUTH_SECRET` (any random string — `npx auth secret` generates
   one) for console login. No external app registration needed — visit
   `/signup` to create an account directly.

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
an actual Claude reply (needs a real `ANTHROPIC_API_KEY`).

## Verified by a real run (2026-09-24) — email + password auth (ADR 0006)

Switching from Google OAuth to email + password (`lib/auth.ts`, `lib/
password.ts`, `app/login/`, `app/signup/`) surfaced two more real bugs,
neither catchable by reading the code or by `tsc`:

- **Auth.js rejected `localhost` as an untrusted host.** `signIn()`
  silently failed with `UntrustedHost` on every attempt — Auth.js won't
  trust the request's `Host` header (needed behind Render's proxy and
  for any non-Vercel deployment, dev included) unless told to. This had
  been true since ADR 0004 too; it just was never caught because the
  Google OAuth flow was never actually driven end to end (see the
  2026-09-23 entry above — "not yet verified"). Fixed by adding
  `trustHost: true` to the `NextAuth(...)` config.
- **A login error round-tripped through a `?error=1` query param never
  showed up without a manual page reload.** A server action redirecting
  to the *same route* with only the search params changed doesn't
  reliably make Next's client router refetch — the URL bar updates but
  the rendered page can still be the stale, cached one. Only caught by
  driving the actual failed-login case in a browser and checking the
  DOM, not just the response status. Fixed by switching `/login` and
  `/signup` to client components using React 19's `useActionState`
  (`app/login/LoginForm.tsx`, `app/signup/SignupForm.tsx`) — the error
  message comes back as action state, no query param or extra
  navigation involved.
- Also fixed in passing: the local `node_modules/@prisma/client` install
  was missing `default.js` (present in the real npm tarball, confirmed
  by downloading and inspecting it directly) — `main`/`exports` in its
  `package.json` pointed at a file that didn't exist, so `next build`
  failed with `Module not found: Can't resolve '@prisma/client'`. Not a
  Prisma bug, a corrupted local install; fixed by reinstalling the
  package.

What was verified end to end, driving a real headless browser against a
real `next build && next start` server, not just reading the response
status: sign up creates a session and lands on `/bots`; clearing cookies
and hitting `/bots` redirects to `/login`; logging back in with the same
credentials lands on `/bots`; a wrong password shows "Invalid email or
password" inline, immediately, no reload; signing up with an
already-registered email shows "already exists" inline; mismatched
password/confirm-password shows "Passwords don't match" inline; zero
browser console errors throughout. `scripts/canary.mjs` was updated to
check for the new login form instead of the old Google button and
re-verified against the same running server.

## Guardrail automation

Deterministic checks + a browser canary, run at three points so a
violation is caught as early and as cheaply as possible — reading code
alone doesn't catch any of these (see "Verified by a real run" above):

- **`.claude/skills/`** (`bot-engine-build`, `console-frontend-build`,
  `ship-checklist`) — read by Claude Code before touching the relevant
  layer, so the patterns are followed on the way in, not just checked on
  the way out.
- **`.githooks/pre-commit`** — `npm run check:all` + typecheck, before a
  commit is even made. One-time setup per clone:
  `git config core.hooksPath .githooks`.
- **`.github/workflows/ci.yml`** — the same checks plus the RLS
  verification and browser canary, against a real Postgres+pgvector
  service, on every push — the backstop for anything that reaches GitHub
  without going through the hook (a different clone, a tool that skips
  hooks).

The checks (`npm run check:all`, or individually `check:isolation` /
`check:vertical` / `check:secrets` / `check:tokens`) are static and fast.
`scripts/canary.mjs` is a real Playwright browser hitting a running
server — it needs the app already started (`npm run build && npm run
start`, or `npm run dev`) at `APP_BASE_URL`. `.mcp.json` also configures
a Playwright MCP server for driving the browser interactively during a
session, independent of the scripted canary.

## Tenant isolation

Every tenant-scoped query must go through `withOrgContext` in `lib/db.ts`,
never the raw Prisma client. It sets `app.org_id` for the transaction,
which the RLS policies in `db/migrations/0001_init_rls.sql` require —
without it, those tables return zero rows rather than leaking across
tenants. See `docs/adr/0003-auth-multi-tenancy.md` for why this is
enforced at the database layer instead of in application code.
