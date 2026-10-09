-- RLS for the leads table (collect_lead tool, lib/ai/tools/collectLead.ts).
-- Same pattern as every other tenant-scoped table in 0001_init_rls.sql —
-- kept as its own file rather than editing that one, matching 0002/0003's
-- precedent of one file per feature addition.
--
-- Idempotent by design — runs on every deploy (see
-- scripts/apply-sql-migrations.mjs), same reasoning as 0001-0003.

alter table leads enable row level security;

drop policy if exists lead_isolation on leads;
create policy lead_isolation on leads
  using ("orgId" = current_setting('app.org_id', true));

alter table leads force row level security;
