"use client";

import type { KnowledgeActionState } from "./actions";
import {
  Button,
  Input,
  Textarea,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui";

export function AddTextDialog({
  open,
  onOpenChange,
  formAction,
  state,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formAction: (formData: FormData) => void;
  state: KnowledgeActionState;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a text snippet</DialogTitle>
          <DialogDescription>
            Paste any text directly — a policy, a product blurb, internal notes. No file or link needed.
          </DialogDescription>
        </DialogHeader>
        <form id="add-text-form" action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="text-title">Title</Label>
            <Input
              id="text-title"
              name="title"
              placeholder="Shipping policy"
              defaultValue={state.title ?? ""}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="text-content">Text</Label>
            <Textarea
              id="text-content"
              name="text"
              placeholder="Paste or write the content here..."
              defaultValue={state.text ?? ""}
              rows={8}
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
          <Button type="submit" form="add-text-form" disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
