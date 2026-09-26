"use client";

import { Trash2 } from "lucide-react";
import { Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { relativeTime } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { qa: "Q&A", file: "File", url: "URL" };

export interface KnowledgeSourceRow {
  id: string;
  kind: string;
  title: string;
  chunkCount: number;
  createdAt: Date;
}

export function KnowledgeTable({
  entries,
  onDelete,
}: {
  entries: KnowledgeSourceRow[];
  onDelete: (id: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
        <p className="text-sm font-medium">No knowledge yet</p>
        <p className="text-sm text-muted-foreground">Add a Q&A, file, or URL above to get started.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className="h-row">
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
  );
}
