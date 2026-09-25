"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createQaAction, deleteQaAction, type QaActionState } from "./actions";
import {
  Button,
  Input,
  Textarea,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";

const qaIdleState: QaActionState = { status: "idle", message: null };

function useActionToast(state: QaActionState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

interface QaEntryRow {
  id: string;
  question: string;
  answer: string;
}

// Notion register for the writing surface (Dialog + Textarea — calm,
// generous, per docs/design/principles.md #4 and ADR 0011), Linear
// register for the list (a real CARE Table, matching BotsTable.tsx) —
// same split docs/research/design-system-standards.md itself describes
// for Linear (dense list) vs. Notion (calm compose surface).
export function KnowledgeForm({ botId, entries }: { botId: string; entries: QaEntryRow[] }) {
  const [createState, createFormAction, isCreating] = useActionState(createQaAction.bind(null, botId), qaIdleState);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteQaAction.bind(null, botId), qaIdleState);
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  useActionToast(createState);
  useActionToast(deleteState);

  useEffect(() => {
    if (createState.status === "success") setAddOpen(false);
  }, [createState]);

  useEffect(() => {
    if (deleteState.status === "success") setDeletingId(null);
  }, [deleteState]);

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          Knowledge base
          {entries.length > 0 && <span className="text-sm font-normal text-muted-foreground">{entries.length}</span>}
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Add Q&A
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a question and answer</DialogTitle>
              <DialogDescription>
                Write it like you'd explain it to a customer — the bot searches this whenever it needs a fact
                it doesn't already have.
              </DialogDescription>
            </DialogHeader>
            <form id="add-qa-form" action={createFormAction} className="space-y-3">
              <div>
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  name="question"
                  placeholder="What's your return policy?"
                  defaultValue={createState.question ?? ""}
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
                  defaultValue={createState.answer ?? ""}
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
              <Button type="submit" form="add-qa-form" disabled={isCreating}>
                {isCreating ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
          <p className="text-sm font-medium">No knowledge yet</p>
          <p className="text-sm text-muted-foreground">Add a question and answer above to get started.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="h-row">
                  <TableCell className="max-w-xs truncate font-medium">{entry.question}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">{entry.answer}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => setDeletingId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              The bot will no longer be able to use this to answer visitors. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteFormAction}>
              <input type="hidden" name="sourceId" value={deletingId ?? ""} />
              <AlertDialogAction type="submit" variant="destructive-solid" disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
