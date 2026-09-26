"use client";

import type { KnowledgeActionState } from "./actions";
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

export function AddUrlDialog({
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
          <DialogTitle>Add a URL</DialogTitle>
          <DialogDescription>
            A single page's article content — not a whole site. We'll pull the readable text and skip the
            navigation and footer clutter.
          </DialogDescription>
        </DialogHeader>
        <form id="add-url-form" action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://example.com/returns-policy"
              defaultValue={state.url ?? ""}
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
          <Button type="submit" form="add-url-form" disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
