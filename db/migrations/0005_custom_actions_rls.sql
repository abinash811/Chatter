alter table custom_actions enable row level security;

drop policy if exists custom_action_isolation on custom_actions;
create policy custom_action_isolation on custom_actions
  using ("orgId" = current_setting('app.org_id', true));

alter table custom_actions force row level security;
