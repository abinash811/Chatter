import { Skeleton } from "@/components/ui";

// Matches the conversation detail page's real shape (back link, bot
// name + timestamp, a bordered transcript panel) — a considered
// loading state, not a blank flash while getConversationDetail()
// resolves.
export default function ConversationDetailLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="rounded-lg border border-border bg-soft-background p-6 shadow-xs">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
