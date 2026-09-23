# ADR 0003: Auth & multi-tenancy — database-enforced isolation

Status: accepted

Date: 2026-09-23

## Context

Guardrail #1 (tenant isolation) requires every business's data — knowledge
base, conversations, bot config — to be walled off from every other
business, with no exceptions. Enforcing this only in application code
(every query manually filtered by `org_id`) is one missed `WHERE` clause
away from a data leak. Needed a decision that removes that risk class
entirely, not just reduces it.

## Decision

Tenant isolation is enforced **at the database layer** using Postgres
**Row-Level Security (RLS)**, not application-layer filtering alone:

- Every tenant-scoped table carries an `org_id` column and an RLS policy
  restricting rows to `current_setting('app.org_id')::uuid = org_id`.
- Every request sets `app.org_id` from the authenticated session at the
  start of its database transaction; the database then physically cannot
  return another org's rows, even if application code has a bug.
- Org membership model: `Org` (a business) → `Membership` (`User` ↔ `Org`
  with a `role`: owner/admin/member) → `Bot`s and everything under them.
  Matches the role-based dashboard access already in
  `docs/architecture.md` §6.

## Alternatives considered

- Application-layer filtering only (every query manually scoped) —
  rejected: a single missed filter is a cross-tenant leak; guardrail #1
  says no shortcuts, so the strongest available guarantee is used.
- Separate database per tenant — rejected for v1: operationally heavy at
  this stage (migrations, connections, cost scale with tenant count);
  revisit only if a specific customer requires physical data separation.

## Consequences

RLS policies must be written and tested for every new table going
forward — this is now a hard requirement, not optional. Slightly more
setup cost per table than plain app-layer filtering, in exchange for
removing an entire class of bug from being possible. This is a
hard-to-reverse decision: switching away from DB-enforced isolation later
means re-deriving the same guarantee some other way, so it's being made
carefully now rather than fast.
