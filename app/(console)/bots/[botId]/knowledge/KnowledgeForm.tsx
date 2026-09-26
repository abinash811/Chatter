"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  createQaAction,
  createFileAction,
  createUrlAction,
  deleteEntryAction,
  type KnowledgeActionState,
} from "./actions";
import { AddQaDialog } from "./AddQaDialog";
import { AddFileDialog } from "./AddFileDialog";
import { AddUrlDialog } from "./AddUrlDialog";
import { KnowledgeTable, type KnowledgeSourceRow } from "./KnowledgeTable";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";

const idleState: KnowledgeActionState = { status: "idle", message: null };

function useActionToast(state: KnowledgeActionState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

// Notion register for the writing surfaces (the three Add dialogs — calm,
// generous, per docs/design/principles.md #4 and ADR 0011), Linear
// register for the list (KnowledgeTable, a real CARE Table matching
// BotsTable.tsx) — same split docs/research/design-system-standards.md
// itself describes for Linear (dense list) vs. Notion (calm compose
// surface). Three entry points (Q&A/file/URL, ADR 0013) live behind one
// "Add" DropdownMenu instead of three buttons crowding the header; each
// dialog is its own component so this orchestrator stays under the
// file-length guardrail (scripts/check-file-length.mjs).
export function KnowledgeForm({ botId, entries }: { botId: string; entries: KnowledgeSourceRow[] }) {
  const [qaState, qaFormAction, isAddingQa] = useActionState(createQaAction.bind(null, botId), idleState);
  const [fileState, fileFormAction, isAddingFile] = useActionState(createFileAction.bind(null, botId), idleState);
  const [urlState, urlFormAction, isAddingUrl] = useActionState(createUrlAction.bind(null, botId), idleState);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteEntryAction.bind(null, botId), idleState);

  const [qaOpen, setQaOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useActionToast(qaState);
  useActionToast(fileState);
  useActionToast(urlState);
  useActionToast(deleteState);

  useEffect(() => {
    if (qaState.status === "success") setQaOpen(false);
  }, [qaState]);
  useEffect(() => {
    if (fileState.status === "success") {
      setFileOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileState]);
  useEffect(() => {
    if (urlState.status === "success") setUrlOpen(false);
  }, [urlState]);
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm">
              Add
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setQaOpen(true)}>Add Q&A</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFileOpen(true)}>Upload file</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUrlOpen(true)}>Add URL</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddQaDialog open={qaOpen} onOpenChange={setQaOpen} formAction={qaFormAction} state={qaState} isPending={isAddingQa} />
      <AddFileDialog
        open={fileOpen}
        onOpenChange={setFileOpen}
        formAction={fileFormAction}
        isPending={isAddingFile}
        ref={fileInputRef}
      />
      <AddUrlDialog
        open={urlOpen}
        onOpenChange={setUrlOpen}
        formAction={urlFormAction}
        state={urlState}
        isPending={isAddingUrl}
      />

      <KnowledgeTable entries={entries} onDelete={setDeletingId} />

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
