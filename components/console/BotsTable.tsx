"use client";

import { useState, useTransition, useMemo } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { ChevronsUpDown, Search } from "lucide-react";
import {
  type ColumnDef,
  type SortingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
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

const SORT_KEYS = ["name", "status", "createdAt"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const columns: ColumnDef<BotRow>[] = [
  { id: "name", accessorFn: (bot) => bot.name },
  { id: "status", accessorFn: (bot) => bot.published },
  { id: "createdAt", accessorFn: (bot) => bot.createdAt },
];

// TanStack Table (headless — shadcn's own documented pairing for its
// Table primitive, ADR-pending "table pattern" pilot) replacing this
// screen's hand-rolled filter/sort state, with search+sort persisted to
// the URL via nuqs instead of plain useState — a refresh, back button,
// or shared link now keeps what you were looking at. Row rendering
// (whole-row click nav, the actions menu) stays bespoke in
// BotTableRow.tsx; TanStack only owns the filtered/sorted row order
// here, not the markup — this dataset (per-org bots) is small enough
// that client-side filtering/sorting, not a server round trip, is still
// the right call (unchanged from the original decision).
export function BotsTable({ bots }: { bots: BotRow[] }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [sortKey, setSortKey] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_KEYS).withDefault("createdAt"),
  );
  const [sortDir, setSortDir] = useQueryState(
    "dir",
    parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  );
  const [renameTarget, setRenameTarget] = useState<BotRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BotRow | null>(null);
  const [isDuplicating, startDuplicate] = useTransition();

  const sorting: SortingState = useMemo(
    () => [{ id: sortKey, desc: sortDir === "desc" }],
    [sortKey, sortDir],
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
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
        toast.error("Couldn't duplicate that bot — the change didn't save. Please try again.");
      }
    });
  }

  const table = useReactTable({
    data: bots,
    columns,
    state: { sorting, globalFilter: search },
    getRowId: (bot) => bot.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) =>
      row.original.name.toLowerCase().includes(filterValue.trim().toLowerCase()),
  });

  const sortedRows = table.getRowModel().rows.map((row) => row.original);

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
          onChange={(event) => setSearch(event.target.value || null)}
          aria-label="Search bots"
          className="h-row-sm rounded-b-none border-b-0 pl-8 shadow-none"
        />
      </div>

      {/* overflow-hidden — without it, TableHead's bg-soft-background tint
          (a straight-cornered rect spanning the full row) visibly pokes
          past this wrapper's rounded-lg corners. rounded-t-none — the
          search input above owns the top corners now that it's attached. */}
      <div className="overflow-hidden rounded-lg rounded-t-none border border-border shadow-xs">
        {sortedRows.length === 0 ? (
          // A dead end with no way forward (component-checklist.md item
          // 6, 2026-09-27 audit) — a real Clear button, not just text
          // explaining why the list is empty.
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-muted-foreground">No bots match &ldquo;{search}&rdquo;.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setSearch(null)}>
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
              {sortedRows.map((bot) => (
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
