"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { renameBotAction, type BotActionState } from "@/app/(console)/bots/actions";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui";
import type { BotRow } from "./BotsTable";

const idleState: BotActionState = { status: "idle", message: null };

// Split out of BotsTable.tsx (scripts/check-file-length.mjs) — same
// useActionState + toast pattern as bots/[botId]/BotEditorForm.tsx's
// publish dialog and knowledge/AddQaDialog.tsx. The idle-state constant
// lives here, not in actions.ts — a "use server" file may only export
// async functions (caught for real: exporting it from actions.ts 500'd
// every render of /bots).
export function RenameBotDialog({
  bot,
  onOpenChange,
}: {
  bot: BotRow;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(renameBotAction.bind(null, bot.id), idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onOpenChange(false);
    }
    if (state.status === "error" && state.message) toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename bot</DialogTitle>
          <DialogDescription>
            This is just a label for you — visitors never see it.
          </DialogDescription>
        </DialogHeader>
        <form id="rename-bot-form" action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="rename-name">Name</Label>
            <Input
              id="rename-name"
              name="name"
              defaultValue={state.name ?? bot.name}
              autoFocus
              className="mt-1"
              required
            />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="rename-bot-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
