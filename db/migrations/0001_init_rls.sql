-- Tenant isolation via Postgres Row-Level Security.
-- See docs/adr/0003-auth-multi-tenancy.md for the decision and rationale.
--
-- Every request must set app.org_id at the start of its transaction
-- (see lib/db.ts) before touching a tenant-scoped table. Without it set,
-- these policies return zero rows rather than leaking across tenants.
--
-- Idempotent by design (drop-then-create each policy) — this runs on
-- every deploy (see scripts/apply-sql-migrations.mjs), not just once.
-- Postgres has no `CREATE POLICY IF NOT EXISTS`; running the original
-- non-idempotent version a second time would fail the deploy outright.

-- Run after `prisma migrate deploy` has created the base tables.

alter table orgs enable row level security;
alter table memberships enable row level security;
alter table bots enable row level security;
alter table bot_config_versions enable row level security;
alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;
alter table integrations enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table tool_call_logs enable row level security;

-- bot_public_keys and user_org_access are INTENTIONALLY NOT covered by
-- RLS — see their comments in prisma/schema.prisma. Both exist
-- specifically to be queryable before orgId is known (resolving them IS
-- how orgId gets known), and hold no tenant data beyond id pairings. Do
-- not add RLS to either without also redesigning how
-- app/api/chat/route.ts and lib/auth.ts resolve org context.

-- orgs: a session may only see the org it's currently scoped to.
drop policy if exists org_isolation on orgs;
create policy org_isolation on orgs
  using (id = current_setting('app.org_id', true));

-- memberships: scoped to the current org.
drop policy if exists membership_isolation on memberships;
create policy membership_isolation on memberships
  using ("orgId" = current_setting('app.org_id', true));

-- bots: scoped to the current org.
drop policy if exists bot_isolation on bots;
create policy bot_isolation on bots
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists bot_config_version_isolation on bot_config_versions;
create policy bot_config_version_isolation on bot_config_versions
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists knowledge_source_isolation on knowledge_sources;
create policy knowledge_source_isolation on knowledge_sources
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists knowledge_chunk_isolation on knowledge_chunks;
create policy knowledge_chunk_isolation on knowledge_chunks
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists integration_isolation on integrations;
create policy integration_isolation on integrations
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists conversation_isolation on conversations;
create policy conversation_isolation on conversations
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists message_isolation on messages;
create policy message_isolation on messages
  using ("orgId" = current_setting('app.org_id', true));

drop policy if exists tool_call_log_isolation on tool_call_logs;
create policy tool_call_log_isolation on tool_call_logs
  using ("orgId" = current_setting('app.org_id', true));

-- Force RLS even for the table owner role (Prisma's connection user),
-- so a misconfigured client can't bypass isolation by virtue of owning
-- the schema. Idempotent already — ALTER TABLE ... FORCE ROW LEVEL
-- SECURITY doesn't error on re-run.
alter table orgs force row level security;
alter table memberships force row level security;
alter table bots force row level security;
alter table bot_config_versions force row level security;
alter table knowledge_sources force row level security;
alter table knowledge_chunks force row level security;
alter table integrations force row level security;
alter table conversations force row level security;
alter table messages force row level security;
alter table tool_call_logs force row level security;
