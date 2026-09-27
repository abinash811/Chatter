"use client";

import { useState } from "react";
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
// falls back to "Untitled bot"), so this stays a plain form action —
// no useActionState/error state needed, same as the action it replaces.
export function NewBotDialog({
  triggerLabel = "New bot",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a bot</DialogTitle>
          <DialogDescription>
            Give it a name — you can change everything else, including this,
            later.
          </DialogDescription>
        </DialogHeader>
        <form id="new-bot-form" action={createBotAction} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Support bot"
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
          <Button type="submit" form="new-bot-form">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
