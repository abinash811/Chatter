import { ShieldCheck } from "lucide-react";
import { Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { EmptyState } from "@/components/console/EmptyState";
import { relativeTime } from "@/lib/utils";
import type { PendingActionRow } from "@/lib/pendingActions";

// Presentation-only lookup (console layer, not the core engine —
// guardrail #2) from a toolName to a human sentence, same precedent as
// KnowledgeTable.tsx's KIND_LABEL map. The next write-capable tool adds
// a case here for its own request to read clearly; an unrecognized
// toolName still renders (falls back to the raw name), it just isn't
// worded as nicely.
function describeRequest(toolName: string, input: Record<string, unknown>): string {
  if (toolName === "request_order_cancellation") {
    const orderNumber = input.orderNumber as string;
    const reason = input.reason as string | undefined;
    return reason ? `Cancel order #${orderNumber} — "${reason}"` : `Cancel order #${orderNumber}`;
  }
  // Widget submissions (ADR 0028, Phase 2) — dynamic per business-
  // authored widget, so the name comes from the toolName itself rather
  // than a hardcoded case per widget.
  if (toolName.startsWith("submit_widget_")) {
    const widgetName = toolName.slice("submit_widget_".length);
    const fields = Object.entries(input)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    return `Submit "${widgetName}" widget — ${fields}`;
  }
  return toolName;
}

const STATUS_VARIANT: Record<PendingActionRow["status"], "muted" | "default" | "destructive"> = {
  pending: "default",
  approved: "muted",
  rejected: "muted",
  failed: "destructive",
};

export function ApprovalsTable({
  actions,
  onApprove,
  onReject,
  isResolving,
}: {
  actions: PendingActionRow[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isResolving: boolean;
}) {
  if (actions.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nothing waiting on you"
        description="A write-capable action your bot proposes — like cancelling an order — shows up here first."
      />
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => (
            <TableRow key={action.id} className="h-row">
              <TableCell className="max-w-md font-medium">
                {describeRequest(action.toolName, action.input)}
                {action.result && (
                  <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{action.result}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[action.status]}>{action.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{relativeTime(action.createdAt)}</TableCell>
              <TableCell>
                {action.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={isResolving} onClick={() => onReject(action.id)}>
                      Reject
                    </Button>
                    <Button type="button" size="sm" disabled={isResolving} onClick={() => onApprove(action.id)}>
                      Approve
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
