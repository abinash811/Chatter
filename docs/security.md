# Security

Consolidates what's otherwise scattered across CLAUDE.md's guardrails and
several ADRs into one reference. This doc describes what's actually
implemented — if a rule here isn't true of the code, fix the code or fix
this doc, don't let them drift apart.

## Tenant isolation

The core security property of this product: one business's data must
never reach another's context, retrieval results, logs, or dashboard.
Enforced at the database layer via Postgres Row-Level Security, not
application code alone — see ADR 0003. Every tenant-scoped table carries
`orgId`; every query must go through `withOrgContext` (`lib/db.ts`),
which sets `app.org_id` for the transaction. Without it, RLS-protected
tables return zero rows rather than leaking across tenants (fails
closed). `scripts/verify-rls.mjs` checks this against a real database on
every CI run — a superuser role would make this check pass vacuously
even if every policy were broken, so CI explicitly uses a non-superuser
app role, same as local dev.

Two tables are deliberately exempt from RLS, both documented at the
schema level with why: `BotPublicKey` (resolving a widget's public key
to `{orgId, botId}` has to happen before `app.org_id` is known — same
trust model as a Stripe publishable key, public by design) and
`UserOrgAccess` (resolving which org a user belongs to at login has to
run before org context exists).

## Auth

Email + password via Auth.js Credentials, JWT sessions (ADR 0006,
superseding ADR 0004's Google OAuth). Passwords hashed with Node's
built-in `crypto.scrypt` (salted per-user, `lib/password.ts`) — not
bcrypt/argon2, specifically to avoid a native-binary dependency. No
password-reset flow exists yet (`docs/roadmap.md` doesn't list it either
— flagging here since it's a real gap: a locked-out user has no
self-service recovery path today).

## Secrets

The embeddable widget only ever talks to our backend over its own API —
it never holds a Claude API key, database credential, or any other
secret (guardrail #5), checked mechanically by `scripts/check-no-
client-secrets.mjs` on every commit and in CI. Real secrets
(`ANTHROPIC_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, integration client
secrets) live in environment variables only, never committed — `.env` is
gitignored, `.env.example` documents the shape with empty values.

**If a real secret is ever pasted into a chat session or committed by
mistake, treat it as compromised and rotate it immediately** — this
happened once during local setup (a real `ANTHROPIC_API_KEY` pasted into
chat while debugging `.env`) and the fix is always rotation, never just
deleting the paste.

## Traceability

Every AI answer must be traceable — what was retrieved, which tools were
called — so debugging never relies on guesswork (guardrail #6). Every
tool call is logged to `ToolCallLog` independent of whether its result
shaped the final answer. See `docs/features.md`'s tool-call
traceability entry.

## Dependencies

`npm audit` runs as part of a normal install; known vulnerabilities
should be triaged (not silently ignored) before a release, though this
isn't yet wired into CI as a blocking check — a gap, not a decision.
Real dependency versions are checked against the actual npm registry
before pinning (`npm view <package> version`), not recalled from
training data — this caught a stale `@anthropic-ai/sdk` pin missing a
GA feature already in use (see README's "Verified by a real run").

## What's not covered yet

- Rate limiting on any API route (widget chat endpoint included) —
  `docs/roadmap.md` doesn't list this either; flagging as a real gap for
  before any real traffic.
- A documented incident-response process (who does what if tenant
  isolation is ever found broken in production).
- Encryption at rest for `Integration.accessToken` — the schema comment
  already flags this as TODO.
