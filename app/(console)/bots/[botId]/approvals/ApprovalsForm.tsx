"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { approveAction, rejectAction, type ApprovalActionState } from "./actions";
import { ApprovalsTable } from "./ApprovalsTable";
import type { PendingActionRow } from "@/lib/pendingActions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";

const idleState: ApprovalActionState = { status: "idle", message: null };

function useActionToast(state: ApprovalActionState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

// ADR 0023: a write-capable tool's proposed action queues here instead
// of executing itself — approving is the one moment a real external
// write happens, so it gets its own confirm dialog (docs/design/
// principles.md #10), same as publishing a bot. Rejecting needs no
// confirmation — it's the safe, reversible-in-spirit choice (nothing
// external happens), matching this app's existing pattern of only
// gating the action that actually does something irreversible.
export function ApprovalsForm({ botId, actions }: { botId: string; actions: PendingActionRow[] }) {
  const [approveState, approveFormAction, isApproving] = useActionState(approveAction.bind(null, botId), idleState);
  const [rejectState, rejectFormAction, isRejecting] = useActionState(rejectAction.bind(null, botId), idleState);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useActionToast(approveState);
  useActionToast(rejectState);

  useEffect(() => {
    if (approveState.status !== "idle") setConfirmingId(null);
  }, [approveState]);

  const pendingCount = actions.filter((a) => a.status === "pending").length;

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          Approvals
          {pendingCount > 0 && <span className="text-sm font-normal text-muted-foreground">{pendingCount} waiting</span>}
        </h2>
      </div>

      <ApprovalsTable
        actions={actions}
        onApprove={setConfirmingId}
        onReject={(id) => {
          const formData = new FormData();
          formData.set("id", id);
          rejectFormAction(formData);
        }}
        isResolving={isApproving || isRejecting}
      />

      <AlertDialog open={confirmingId !== null} onOpenChange={(open) => !open && setConfirmingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This calls Shopify for real and can't be undone. Only approve it if you've checked it's legitimate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isApproving}
              onClick={() => {
                const formData = new FormData();
                formData.set("id", confirmingId ?? "");
                approveFormAction(formData);
              }}
            >
              {isApproving ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

