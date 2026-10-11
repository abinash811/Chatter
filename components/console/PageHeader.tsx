// Shared page-header shape — extracted from the identical
// `h-row` title+action markup duplicated across every top-level console
// page (Bots/Leads/Approvals/Custom actions/Data sources/Widgets), same
// precedent as EmptyState.tsx being pulled out of an existing pattern
// rather than invented fresh. `count` is left as a ReactNode, not a
// number, because the real call sites don't all format it the same way
// ("3" on Leads/Bots vs. "3 waiting" on Approvals) — forcing one format
// here would have meant inventing a pluralization/suffix API nothing
// asked for.
export function PageHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-row items-center justify-between">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        {title} {count != null && <span className="text-sm font-normal text-muted-foreground">{count}</span>}
      </h1>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
