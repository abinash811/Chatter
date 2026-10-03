import { Skeleton } from "@/components/ui";

// Matches BotEditorForm's real shape (status/actions row, Tabs,
// Card-wrapped sections) — a considered loading state (docs/design/
// principles.md #5), not a blank flash. Only the page's own content,
// not the top bar: app/(console)/bots/[botId]/layout.tsx's BotTopBar
// already renders around this file's Suspense boundary, so duplicating
// it here would show two top bars briefly.
export default function BotEditorLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex h-row items-center justify-between">
        <Skeleton className="h-5 w-28 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-row w-24" />
          <Skeleton className="h-row w-20" />
        </div>
      </div>

      <div className="mt-4 flex w-fit gap-1 rounded-lg bg-muted p-1">
        {["Persona", "Guardrails", "Tools", "Appearance"].map((label) => (
          <Skeleton key={label} className="h-7 w-20 rounded-md" />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-soft-background p-6 shadow-xs">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <Skeleton className="mt-4 h-24 w-full rounded" />
      </div>
    </div>
  );
}
