"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { archiveBotAction, type BotActionState } from "@/app/(console)/bots/actions";
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
import type { BotRow } from "./BotsTable";

const idleState: BotActionState = { status: "idle", message: null };

// Split out of BotsTable.tsx (scripts/check-file-length.mjs). ADR 0018:
// archive, never a hard delete — the copy here is explicit about what
// stays (conversations, knowledge base) and what doesn't exist yet
// (a restore button), not just "are you sure?". The idle-state constant
// lives here, not in actions.ts — a "use server" file may only export
// async functions (caught for real: exporting it from actions.ts 500'd
// every render of /bots).
export function ArchiveBotDialog({
  bot,
  onOpenChange,
}: {
  bot: BotRow;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(archiveBotAction.bind(null, bot.id), idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onOpenChange(false);
    }
    if (state.status === "error" && state.message) toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive &ldquo;{bot.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Its embed snippet stops working immediately and it disappears from
            this list. Its conversations and knowledge base are kept, not
            deleted — this can be undone from the database if archived by
            mistake, just not yet from this screen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {/* Not a <form action={formAction}> — Radix's AlertDialogAction
              closes (unmounts) the dialog as soon as it's clicked, which
              disconnects a native form from the DOM before its submission
              finishes ("Form submission canceled because the form is not
              connected", caught via a real Playwright run). Calling
              formAction() directly kicks off the same transition without
              depending on the DOM node surviving the click. */}
          <AlertDialogAction type="button" variant="destructive" disabled={isPending} onClick={() => formAction()}>
            {isPending ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
