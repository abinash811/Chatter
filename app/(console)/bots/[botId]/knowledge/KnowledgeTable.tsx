"use client";

import { useMemo, useState } from "react";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { Search, Trash2, Database } from "lucide-react";
import { EmptyState } from "@/components/console/EmptyState";
import {
  type ColumnDef,
  type SortingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Button,
  Badge,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { relativeTime } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { qa: "Q&A", file: "File", url: "URL", text: "Text" };
const TYPE_FILTERS = ["all", "qa", "file", "url", "text"] as const;
const SORT_OPTIONS = ["newest", "oldest", "title"] as const;

export interface KnowledgeSourceRow {
  id: string;
  kind: string;
  title: string;
  chunkCount: number;
  createdAt: Date;
}

const columns: ColumnDef<KnowledgeSourceRow>[] = [
  { id: "title", accessorFn: (entry) => entry.title },
  { id: "createdAt", accessorFn: (entry) => entry.createdAt },
];

// Same tanstack-table + nuqs pattern as components/console/BotsTable.tsx
// (ADR 0024) — search/filter/sort persisted to the URL, client-side
// since a bot's own knowledge base is a small dataset. Bulk select is
// local UI state, not URL-persisted (a transient mode, not something
// worth surviving a reload/share).
export function KnowledgeTable({
  entries,
  onDelete,
  onBulkDelete,
}: {
  entries: KnowledgeSourceRow[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [typeFilter, setTypeFilter] = useQueryState("type", parseAsStringLiteral(TYPE_FILTERS).withDefault("all"));
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(SORT_OPTIONS).withDefault("newest"));
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorting: SortingState = useMemo(() => {
    if (sort === "title") return [{ id: "title", desc: false }];
    return [{ id: "createdAt", desc: sort === "newest" }];
  }, [sort]);

  const filteredByType = useMemo(
    () => (typeFilter === "all" ? entries : entries.filter((entry) => entry.kind === typeFilter)),
    [entries, typeFilter],
  );

  const table = useReactTable({
    data: filteredByType,
    columns,
    state: { sorting, globalFilter: search },
    getRowId: (entry) => entry.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) =>
      row.original.title.toLowerCase().includes(filterValue.trim().toLowerCase()),
  });

  const rows = table.getRowModel().rows.map((row) => row.original);

  function toggleBulkMode() {
    setBulkMode((prev) => !prev);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((row) => row.id))));
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={search}
            onChange={(event) => setSearch(event.target.value || null)}
            aria-label="Search sources"
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as (typeof TYPE_FILTERS)[number])}>
          <SelectTrigger className="w-40" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="qa">Q&A</SelectItem>
            <SelectItem value="file">File</SelectItem>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as (typeof SORT_OPTIONS)[number])}>
          <SelectTrigger className="w-32" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant={bulkMode ? "secondary" : "outline"} onClick={toggleBulkMode}>
          {bulkMode ? "Cancel" : "Bulk select"}
        </Button>
      </div>

      {bulkMode && selected.size > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {selected.size} selected
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onBulkDelete(Array.from(selected));
              setSelected(new Set());
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={Database} title="No knowledge yet" description="Add a source above to get started." />
      ) : rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-8 shadow-xs">
          <p className="text-sm text-muted-foreground">No sources match &ldquo;{search}&rdquo;.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setSearch(null)}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                {bulkMode && (
                  <TableHead className="w-8">
                    <Checkbox
                      checked={rows.length > 0 && selected.size === rows.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.id} className="h-row">
                  {bulkMode && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(entry.id)}
                        onCheckedChange={() => toggleSelected(entry.id)}
                        aria-label={`Select ${entry.title}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="max-w-md truncate font-medium">{entry.title}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{KIND_LABEL[entry.kind] ?? entry.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.chunkCount}</TableCell>
                  <TableCell className="text-muted-foreground">{relativeTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
