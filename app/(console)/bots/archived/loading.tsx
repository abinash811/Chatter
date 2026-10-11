import { Skeleton } from "@/components/ui";

// Matches ArchivedBotsForm's real shape — same pattern as
// bots/loading.tsx.
export default function ArchivedBotsLoading() {
  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex h-10 items-center gap-6 bg-soft-background px-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="h-3 w-16" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-row items-center gap-3 border-t border-border px-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-14" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
