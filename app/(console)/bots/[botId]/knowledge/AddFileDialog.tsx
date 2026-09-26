"use client";

import { forwardRef } from "react";
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

export const AddFileDialog = forwardRef<
  HTMLInputElement,
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    formAction: (formData: FormData) => void;
    isPending: boolean;
  }
>(function AddFileDialog({ open, onOpenChange, formAction, isPending }, fileInputRef) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a file</DialogTitle>
          <DialogDescription>
            PDF, DOCX, .txt, or .md, up to 5MB. The bot searches this alongside everything else in its
            knowledge base.
          </DialogDescription>
        </DialogHeader>
        <form id="add-file-form" action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              ref={fileInputRef}
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
          <Button type="submit" form="add-file-form" disabled={isPending}>
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
