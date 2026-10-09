alter table widgets enable row level security;

drop policy if exists widget_isolation on widgets;
create policy widget_isolation on widgets
  using ("orgId" = current_setting('app.org_id', true));

alter table widgets force row level security;
