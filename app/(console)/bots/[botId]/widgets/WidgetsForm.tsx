"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createWidgetAction, toggleWidgetAction, deleteWidgetAction, type WidgetState } from "./actions";
import { AddWidgetDialog } from "./AddWidgetDialog";
import { WidgetsTable } from "./WidgetsTable";
import type { WidgetRow } from "@/lib/widgets";
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

const idleState: WidgetState = { status: "idle", message: null };

function useActionToast(state: WidgetState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

// ADR 0028: widgets are their own management surface, same
// orchestrator-plus-dialog-plus-table shape as ActionsForm.tsx (ADR
// 0022) so this stays under the file-length guardrail.
export function WidgetsForm({ botId, widgets }: { botId: string; widgets: WidgetRow[] }) {
  const [addState, addFormAction, isAdding] = useActionState(createWidgetAction.bind(null, botId), idleState);
  const [, toggleFormAction] = useActionState(toggleWidgetAction.bind(null, botId), idleState);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteWidgetAction.bind(null, botId), idleState);

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
          Widgets{" "}
          {widgets.length > 0 && <span className="text-sm font-normal text-muted-foreground">{widgets.length}</span>}
        </h2>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          Add widget
        </Button>
      </div>

      <AddWidgetDialog open={addOpen} onOpenChange={setAddOpen} formAction={addFormAction} state={addState} isPending={isAdding} />

      <WidgetsTable
        widgets={widgets}
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
            <AlertDialogTitle>Delete this widget?</AlertDialogTitle>
            <AlertDialogDescription>The bot will no longer be able to show it. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
