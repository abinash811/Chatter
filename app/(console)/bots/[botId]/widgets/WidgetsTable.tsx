"use client";

import { Trash2, FormInput } from "lucide-react";
import { Button, Badge, Switch, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { EmptyState } from "@/components/console/EmptyState";
import type { WidgetRow } from "@/lib/widgets";

export function WidgetsTable({
  widgets,
  onToggle,
  onDelete,
  onAdd,
}: {
  widgets: WidgetRow[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={FormInput}
        title="No widgets yet"
        description="Let your bot collect structured info with an inline form instead of plain text."
        action={
          <Button type="button" size="sm" onClick={onAdd}>
            Add widget
          </Button>
        }
      />
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>On submit</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {widgets.map((widget) => (
            <TableRow key={widget.id} className="h-row">
              <TableCell className="font-medium">
                {widget.name}
                <p className="max-w-xs truncate text-xs font-normal text-muted-foreground">{widget.triggerDescription}</p>
              </TableCell>
              <TableCell>
                <Badge variant="muted">
                  {widget.fields.length} field{widget.fields.length === 1 ? "" : "s"}
                </Badge>
              </TableCell>
              <TableCell>
                {/* Phase 2 (ADR 0028) — at-a-glance signaling (console-
                    frontend rule #8): a collection-only widget vs. one
                    that calls a real API, and whether that call needs
                    approval, reads differently without opening the row. */}
                {widget.apiUrl ? (
                  <Badge variant={widget.writeCapable ? "destructive" : "muted"}>
                    {widget.writeCapable ? "Calls API — needs approval" : "Calls API"}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Message only</span>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  checked={widget.enabled}
                  onCheckedChange={(checked) => onToggle(widget.id, checked)}
                  aria-label={`${widget.enabled ? "Disable" : "Enable"} ${widget.name}`}
                />
              </TableCell>
              <TableCell>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => onDelete(widget.id)}>
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
