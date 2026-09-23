-- Tenant isolation via Postgres Row-Level Security.
-- See docs/adr/0003-auth-multi-tenancy.md for the decision and rationale.
--
-- Every request must set app.org_id at the start of its transaction
-- (see lib/db.ts) before touching a tenant-scoped table. Without it set,
-- these policies return zero rows rather than leaking across tenants.

-- Run after `prisma migrate dev` has created the base tables.

alter table orgs enable row level security;
alter table memberships enable row level security;
alter table bots enable row level security;

-- orgs: a session may only see the org it's currently scoped to.
create policy org_isolation on orgs
  using (id = current_setting('app.org_id', true)::uuid);

-- memberships: scoped to the current org.
create policy membership_isolation on memberships
  using ("orgId" = current_setting('app.org_id', true)::uuid);

-- bots: scoped to the current org.
create policy bot_isolation on bots
  using ("orgId" = current_setting('app.org_id', true)::uuid);

-- Force RLS even for the table owner role (Prisma's connection user),
-- so a misconfigured client can't bypass isolation by virtue of owning
-- the schema.
alter table orgs force row level security;
alter table memberships force row level security;
alter table bots force row level security;
