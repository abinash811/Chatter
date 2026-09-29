import { Skeleton } from "@/components/ui";

// Matches ConversationsSplitView's real shape (ADR 0027) — a considered
// loading state (docs/design/principles.md #5), not a blank flash while
// loadConversationsListData()'s query resolves.
export default function ConversationsLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-row-sm w-40" />
          <Skeleton className="h-row-sm w-36" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      <div className="mt-4 flex flex-1 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex w-80 shrink-0 flex-col gap-3 border-r border-border p-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-6 w-40" />
        </div>
      </div>
    </div>
  );
}
