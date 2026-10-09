alter table pending_actions enable row level security;

drop policy if exists pending_action_isolation on pending_actions;
create policy pending_action_isolation on pending_actions
  using ("orgId" = current_setting('app.org_id', true));

alter table pending_actions force row level security;
