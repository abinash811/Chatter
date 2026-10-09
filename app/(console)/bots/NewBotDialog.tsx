"use client";

import { useState, useTransition } from "react";
import { createBotAction } from "./actions";
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
  DialogTrigger,
} from "@/components/ui";

// Replaces the old inline name-input+button (docs/design/audit.md's
// "Bots list — open findings": "Bot creation is an inline text input,
// not a dialog"). createBotAction always redirects into the new bot's
// editor on success and has no real failure path (an empty name just
// falls back to "Untitled bot"), so there's no error state to carry —
// just a real create+redirect round-trip that needs to disable itself
// while in flight (component-checklist.md item 1 audit, 2026-09-27
// caught: nothing stopped a double-click from creating two bots).
//
// Not useFormStatus — it only works for descendants *inside* the
// <form>'s React tree, and this submit button lives in DialogFooter,
// associated with the form only via the HTML `form="new-bot-form"`
// attribute (needed for layout, same as every other dialog in this
// app). A real Playwright run confirmed useFormStatus never fired
// here. onSubmit + useTransition, the same pattern already proven for
// duplicateBotAction, works regardless of DOM position.
export function NewBotDialog({ triggerLabel = "New bot" }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => createBotAction(formData));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a bot</DialogTitle>
          <DialogDescription>
            Give it a name — you can change everything else, including this, later.
          </DialogDescription>
        </DialogHeader>
        <form id="new-bot-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Support bot" autoFocus className="mt-1" required />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="new-bot-form" disabled={isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
