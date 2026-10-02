import type { LucideIcon } from "lucide-react";

// Shared empty-state shape — extracted from ConversationDetailPanel.tsx's
// existing icon-badge pattern (the one empty state in this app that
// already read as finished, not a lonely box of plain text) so every
// other list screen gets the same treatment instead of its own ad hoc
// text-only box. component-checklist.md item 6: a real CTA where one
// actually exists (`action`), never a fabricated one — screens with no
// possible user action (leads/approvals/conversations, all populated by
// visitor activity, not something to "add") correctly omit it.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-center text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
