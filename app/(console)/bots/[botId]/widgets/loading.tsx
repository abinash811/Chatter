import { Skeleton } from "@/components/ui";

// Matches WidgetsForm's real shape — content only, same pattern as
// actions/loading.tsx.
export default function WidgetsLoading() {
  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-row w-28" />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex h-10 items-center gap-6 bg-soft-background px-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-row items-center gap-6 border-t border-border px-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="ml-auto h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
