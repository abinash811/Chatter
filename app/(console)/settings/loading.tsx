import { Skeleton } from "@/components/ui";

// Matches SettingsForm's real shape (heading, Card-wrapped Workspace
// section) — a considered loading state, not a blank flash while the
// org record resolves.
export default function SettingsLoading() {
  return (
    <div>
      <Skeleton className="h-row w-24 rounded" />
      <div className="mt-4 rounded-lg border border-border bg-soft-background p-6 shadow-xs">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-4 h-row w-full max-w-sm rounded" />
      </div>
    </div>
  );
}
