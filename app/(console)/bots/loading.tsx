import { Skeleton } from "@/components/ui";

// Matches BotsTable's real shape (avatar chip + name, status badge,
// date, chevron) — a considered loading state, not a generic spinner or
// a blank flash while the bot list query resolves (docs/design/
// principles.md #5). Shown automatically by Next.js while
// app/(console)/bots/page.tsx's data fetch is in flight.
export default function BotsLoading() {
  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-row w-40" />
          <Skeleton className="h-row w-20" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex h-10 items-center gap-4 bg-soft-background px-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-row items-center gap-3 border-t border-border px-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-5 w-16 rounded" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
