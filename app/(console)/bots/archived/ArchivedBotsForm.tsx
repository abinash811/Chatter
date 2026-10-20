"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { restoreBotAction, type BotActionState } from "@/app/(console)/bots/actions";
import { EmptyState } from "@/components/console/EmptyState";
import { relativeTime } from "@/lib/utils";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";

const idleState: BotActionState = { status: "idle", message: null };

export interface ArchivedBotRow {
  id: string;
  name: string;
  archivedAt: Date;
}

// Rows are deliberately NOT clickable (unlike BotTableRow.tsx) — the
// editor route 404s for an archived bot by design (ADR 0018), so
// there's nowhere for a row click to go. Restore is the only action a
// row needs, so a plain Button per row, not a DropdownMenu — same
// one-action-per-row shape ApprovalsTable.tsx's Approve/Reject already
// uses. No confirm dialog: restoring is the safe, reversible direction
// (the bot can always be re-archived), matching this app's existing
// pattern of only gating the action that's actually hard to undo.
export function ArchivedBotsForm({ bots }: { bots: ArchivedBotRow[] }) {
  const [state, formAction, isPending] = useActionState(restoreBotAction, idleState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (bots.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="No archived bots"
        description="A bot you archive from the main list shows up here, with a way to bring it back."
      />
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Archived</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bots.map((bot) => (
            <TableRow key={bot.id} className="h-row">
              <TableCell className="font-medium">{bot.name}</TableCell>
              <TableCell className="text-right text-muted-foreground">{relativeTime(bot.archivedAt)}</TableCell>
              <TableCell className="text-right">
                <form action={formAction}>
                  <input type="hidden" name="botId" value={bot.id} />
                  <Button type="submit" variant="outline" size="sm" disabled={isPending}>
                    {isPending ? "Restoring..." : "Restore"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
