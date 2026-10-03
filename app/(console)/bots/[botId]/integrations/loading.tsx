import { Skeleton } from "@/components/ui";

// Matches the integrations page's real shape (heading + a provider row
// per connector) — content only, not the shared BotTopBar (already
// rendered by the parent layout around this Suspense boundary).
export default function IntegrationsLoading() {
  return (
    <div>
      <Skeleton className="h-row w-28 rounded" />
      <div className="mt-2 divide-y divide-border border-y border-border">
        {[0, 1].map((i) => (
          <div key={i} className="flex h-row items-center justify-between px-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-row-sm w-40" />
              <Skeleton className="h-row-sm w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
