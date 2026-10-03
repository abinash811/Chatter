import { Skeleton } from "@/components/ui";

// Matches KnowledgeForm's real shape (header + Add button, table rows)
// — content only, not the shared BotTopBar (already rendered by the
// parent layout around this Suspense boundary).
export default function KnowledgeLoading() {
  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-row w-20" />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-xs">
        <div className="flex h-10 items-center gap-6 bg-soft-background px-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-row items-center gap-6 border-t border-border px-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="ml-auto h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
