"use client";

import { Trash2 } from "lucide-react";
import { Button, Badge, Switch, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import type { CustomActionRow } from "@/lib/customActions";

export function ActionsTable({
  actions,
  onToggle,
  onDelete,
}: {
  actions: CustomActionRow[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (actions.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
        <p className="text-sm font-medium">No custom actions yet</p>
        <p className="text-sm text-muted-foreground">
          Add one above to let your bot call your own booking system, CRM, or any other endpoint.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => (
            <TableRow key={action.id} className="h-row">
              <TableCell className="font-medium">
                {action.name}
                <p className="max-w-xs truncate text-xs font-normal text-muted-foreground">{action.description}</p>
              </TableCell>
              <TableCell>
                <Badge variant="muted">{action.method}</Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{action.url}</TableCell>
              <TableCell>
                <Switch
                  checked={action.enabled}
                  onCheckedChange={(checked) => onToggle(action.id, checked)}
                  aria-label={`${action.enabled ? "Disable" : "Enable"} ${action.name}`}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  onClick={() => onDelete(action.id)}
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
