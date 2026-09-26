import { Skeleton } from "@/components/ui";

// Matches ConversationsTable's real shape (bot/date/issue filters,
// table rows) — a considered loading state (docs/design/principles.md
// #5), not a blank flash while listConversations()'s query resolves.
export default function ConversationsLoading() {
  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-row-sm w-40" />
          <Skeleton className="h-row-sm w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex h-10 items-center gap-6 bg-soft-background px-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="h-3 w-14" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-row items-center gap-6 border-t border-border px-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
