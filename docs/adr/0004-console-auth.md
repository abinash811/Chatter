# ADR 0004: Console auth — Google OAuth via Auth.js, JWT sessions

Status: superseded by ADR 0006

Date: 2026-09-23

## Context

`lib/auth.ts`'s `getCurrentSession` was a deliberate stub (docs/open-
questions.md 1c) so console pages had one real integration point instead
of each page inventing its own — mirroring the client-supplied-orgId bug
already fixed for the widget (app/api/chat/route.ts). Needed a real
provider before any console page could load data.

## Decision

- **Provider**: Google OAuth, chosen by the user directly.
- **Library**: Auth.js (`next-auth` v5), the current standard for
  Next.js App Router auth — no Prisma adapter, since Auth.js's expected
  schema doesn't match our own `User`/`Membership` model; identity
  resolution happens in the `jwt` callback against our own tables.
- **Session strategy**: JWT, not database sessions — no need for
  Auth.js's own `Session` table, one less thing to keep in sync with our
  schema.
- **First-login bootstrapping**: a user with no org yet gets one
  auto-provisioned (`"<email>'s workspace"`) so the console is usable
  immediately, rather than blocking on an onboarding flow that doesn't
  exist yet.
- **New table**: `UserOrgAccess`, deliberately exempt from RLS — same
  justification as `BotPublicKey`. Resolving "which org does this user
  belong to" at login has to run *before* `app.org_id` is known, so it
  can't go through the (correctly) RLS-protected `Membership` table.
  Holds only a `(userId, orgId)` pairing, kept in sync whenever a
  `Membership` is created.

## Alternatives considered

- Magic link / credentials — not chosen; the user asked for Google OAuth
  directly.
- Auth.js Prisma adapter — rejected: it expects its own `User`/`Account`/
  `Session` schema, which would either duplicate or fight our existing
  `User`/`Membership` model built for RLS-based multi-tenancy.
- Database sessions — rejected for v1: JWT is simpler operationally (no
  session table, no cleanup job) and sufficient at this scale.

## Consequences

- Multi-org-per-user (an agency managing several stores — explicitly
  supported by the `Membership` model's shape) isn't reachable from
  login yet; first login always takes the first `UserOrgAccess` row
  found. An org switcher is future work.
- `Membership` deletion (removing a teammate) isn't built yet; when it
  is, it must delete the matching `UserOrgAccess` row too, or a removed
  member keeps login access — noted directly in the schema comment so
  this isn't missed later.
- Needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and an `AUTH_SECRET`
  env var (Google Cloud Console app registration) before it runs.
