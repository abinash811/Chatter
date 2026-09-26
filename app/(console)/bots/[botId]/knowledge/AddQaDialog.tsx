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

export function AddQaDialog({
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
          <DialogTitle>Add a question and answer</DialogTitle>
          <DialogDescription>
            Write it like you'd explain it to a customer — the bot searches this whenever it needs a fact it
            doesn't already have.
          </DialogDescription>
        </DialogHeader>
        <form id="add-qa-form" action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              name="question"
              placeholder="What's your return policy?"
              defaultValue={state.question ?? ""}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              id="answer"
              name="answer"
              placeholder="You can return any item within 30 days of delivery..."
              defaultValue={state.answer ?? ""}
              rows={4}
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
          <Button type="submit" form="add-qa-form" disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
