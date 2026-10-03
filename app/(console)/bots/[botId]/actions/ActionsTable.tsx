"use client";

import { Trash2, Webhook } from "lucide-react";
import { Button, Badge, Switch, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { EmptyState } from "@/components/console/EmptyState";
import type { CustomActionRow } from "@/lib/customActions";

export function ActionsTable({
  actions,
  onToggle,
  onDelete,
  onAdd,
}: {
  actions: CustomActionRow[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  if (actions.length === 0) {
    return (
      <EmptyState
        icon={Webhook}
        title="No custom actions yet"
        description="Let your bot call your own booking system, CRM, or any other endpoint."
        action={
          <Button type="button" size="sm" onClick={onAdd}>
            Add action
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
