"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createCustomActionAction,
  toggleCustomActionAction,
  deleteCustomActionAction,
  testCustomActionAction,
  type CustomActionState,
  type TestActionState,
} from "./actions";
import { AddActionDialog } from "./AddActionDialog";
import { ActionsTable } from "./ActionsTable";
import type { CustomActionRow } from "@/lib/customActions";
import {
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";

const idleState: CustomActionState = { status: "idle", message: null };
const idleTestState: TestActionState = { status: "idle", statusCode: null, bodyText: null, message: null };

function useActionToast(state: CustomActionState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

// ADR 0022: custom actions are their own management surface, not a
// Tools-tab checkbox — same Notion-compose/Linear-list split as
// KnowledgeForm.tsx, and the same orchestrator-plus-dialog-plus-table
// shape so this stays under the file-length guardrail.
export function ActionsForm({ botId, actions }: { botId: string; actions: CustomActionRow[] }) {
  const [addState, addFormAction, isAdding] = useActionState(createCustomActionAction.bind(null, botId), idleState);
  const [, toggleFormAction] = useActionState(toggleCustomActionAction.bind(null, botId), idleState);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(
    deleteCustomActionAction.bind(null, botId),
    idleState,
  );
  const [testState, testFormAction, isTesting] = useActionState(testCustomActionAction, idleTestState);

  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useActionToast(addState);
  useActionToast(deleteState);

  useEffect(() => {
    if (addState.status === "success") setAddOpen(false);
  }, [addState]);
  useEffect(() => {
    if (deleteState.status === "success") setDeletingId(null);
  }, [deleteState]);

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          Custom actions{" "}
          {actions.length > 0 && <span className="text-sm font-normal text-muted-foreground">{actions.length}</span>}
        </h2>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          Add action
        </Button>
      </div>

      <AddActionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        formAction={addFormAction}
        state={addState}
        isPending={isAdding}
        testFormAction={testFormAction}
        testState={testState}
        isTesting={isTesting}
      />

      <ActionsTable
        actions={actions}
        onToggle={(id, enabled) => {
          const formData = new FormData();
          formData.set("id", id);
          formData.set("enabled", String(enabled));
          toggleFormAction(formData);
        }}
        onDelete={setDeletingId}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this action?</AlertDialogTitle>
            <AlertDialogDescription>The bot will no longer be able to call it. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* Direct dispatch, not a nested <form> submit button — same
                Radix AlertDialog close-on-click race as KnowledgeForm.tsx's
                delete confirm (ADR 0017's migration note). */}
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                const formData = new FormData();
                formData.set("id", deletingId ?? "");
                deleteFormAction(formData);
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
