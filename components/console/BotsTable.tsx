"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { ChevronsUpDown, Search } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  Input,
  Button,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { duplicateBotAction } from "@/app/(console)/bots/actions";
import { RenameBotDialog } from "./RenameBotDialog";
import { ArchiveBotDialog } from "./ArchiveBotDialog";
import { BotTableRow } from "./BotTableRow";

export interface BotRow {
  id: string;
  name: string;
  createdAt: Date;
  published: boolean;
}

type SortKey = "name" | "status" | "createdAt";

// Real CARE Table (components/ui/table.tsx, ADR 0008) replacing the
// hand-rolled div-list. Whole row navigates, not just the name cell —
// matches the prior list's click affordance and Linear's own table
// behavior (docs/architecture.md §7's register mapping). A client
// component only for that row-click handler; everything else about
// this page stays server-rendered.
//
// Depth/polish pass (principles.md #5/#9, 2026-09-26 rollout to this
// screen): a plain `onClick` on a `<tr>` looks fine but isn't actually
// keyboard-reachable — principle #8 is "no exceptions," and this was
// one. `tabIndex`/`role="link"`/`onKeyDown` plus a real focus ring
// fixes that for real, not just visually — verified with a real
// Tab+Enter keyboard-only navigation, not just a screenshot. Also
// caught a real, separate bug in the process: `ring-accent` (what
// Input/Textarea/Checkbox all used) is near-invisible on white —
// ADR 0014's token swap redefined `--accent` as a pale neutral-100
// background tint, not a ring color. `ring-ring` (shadcn's own real
// convention, matching Button's `focus-visible:ring-ring/50`) is
// fixed here and in those 3 primitives in the same pass.
//
// 2026-09-27 (docs/design/audit.md's "Bots list — open findings"):
// added client-side search + sort (dataset is per-org bot lists, small
// enough that a server round-trip would be over-engineering) and a
// per-row actions menu (rename/duplicate/archive — ADR 0018: archive,
// never a hard delete).
export function BotsTable({ bots }: { bots: BotRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [renameTarget, setRenameTarget] = useState<BotRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BotRow | null>(null);
  const [isDuplicating, startDuplicate] = useTransition();

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleDuplicate(botId: string) {
    startDuplicate(async () => {
      try {
        await duplicateBotAction(botId);
      } catch (err) {
        // duplicateBotAction redirects on success — that's a thrown
        // NEXT_REDIRECT internally, not a real error, and must keep
        // propagating so the navigation actually happens. Only a real
        // failure (e.g. the bot got archived out from under this click)
        // should surface as a toast.
        unstable_rethrow(err);
        console.error("[duplicateBotAction]", err);
        toast.error("Couldn't duplicate that bot. Please try again.");
      }
    });
  }

  const filtered = bots.filter((bot) =>
    bot.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "status")
      cmp = Number(a.published) - Number(b.published);
    else cmp = a.createdAt.getTime() - b.createdAt.getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      {/* Attached directly to the table below it — no gap, shared border,
          a leading icon — instead of a bare bordered input floating
          alone with nothing anchoring it to what it filters (critiqued
          2026-09-27 as having "no reason to exist visually"; the fix is
          in docs/design/preview/bots-list.html too, not just here). */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search bots..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search bots"
          className="h-row-sm rounded-b-none border-b-0 pl-8 shadow-none"
        />
      </div>

      {/* overflow-hidden — without it, TableHead's bg-soft-background tint
          (a straight-cornered rect spanning the full row) visibly pokes
          past this wrapper's rounded-lg corners. rounded-t-none — the
          search input above owns the top corners now that it's attached. */}
      <div className="overflow-hidden rounded-lg rounded-t-none border border-border shadow-xs">
        {sorted.length === 0 ? (
          // A dead end with no way forward (component-checklist.md item
          // 6, 2026-09-27 audit) — a real Clear button, not just text
          // explaining why the list is empty.
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-muted-foreground">No bots match &ldquo;{search}&rdquo;.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  sortKey="name"
                  label="Name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHead
                  sortKey="status"
                  label="Status"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHead
                  sortKey="createdAt"
                  label="Created"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  align="right"
                  // hidden below sm — a real Playwright run at 390px
                  // (tests/visual/mobile.visual.spec.ts) showed the sort
                  // headers' extra width push the row's own actions menu
                  // off-screen entirely (x=399 in a 324px-wide container),
                  // undiscoverable without a horizontal scroll nobody
                  // would think to try. Created is the least essential
                  // column to lose first.
                  className="hidden sm:table-cell"
                />
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((bot) => (
                <BotTableRow
                  key={bot.id}
                  bot={bot}
                  isDuplicating={isDuplicating}
                  onRename={setRenameTarget}
                  onDuplicate={handleDuplicate}
                  onArchive={setArchiveTarget}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {renameTarget && (
        <RenameBotDialog
          bot={renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
        />
      )}
      {archiveTarget && (
        <ArchiveBotDialog
          bot={archiveTarget}
          onOpenChange={(open) => !open && setArchiveTarget(null)}
        />
      )}
    </div>
  );
}

function SortableHead({
  sortKey,
  label,
  activeKey,
  dir,
  onSort,
  align,
  className,
}: {
  sortKey: SortKey;
  label: string;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  align?: "right";
  className?: string;
}) {
  const isActive = sortKey === activeKey;
  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSort(sortKey)}
        className={cn(
          "h-auto gap-1 p-0 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:bg-transparent hover:text-foreground",
          isActive && "text-foreground",
        )}
        aria-label={`Sort by ${label}${isActive ? (dir === "asc" ? ", ascending" : ", descending") : ""}`}
      >
        {label}
        <ChevronsUpDown
          className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-40")}
        />
      </Button>
    </TableHead>
  );
}
