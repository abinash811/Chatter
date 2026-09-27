"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HelpCircle, FileText, Link as LinkIcon } from "lucide-react";
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
import { OptionCard } from "@/components/console/OptionCard";
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
// surface). The three entry points (Q&A/file/URL, ADR 0013) were behind
// one "Add" DropdownMenu; now a row of OptionCards, matching Chatbase's
// Data sources page (docs/research/competitive-landscape.md's 2026-09-27
// update) — each type is a persistent, always-visible card instead of a
// menu item you have to open first. Each dialog is its own component so
// this orchestrator stays under the file-length guardrail
// (scripts/check-file-length.mjs).
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
        {/* h2, not h1 — the page's h1 is the (sr-only) bot name in the
            shared BotTopBar, app/(console)/bots/[botId]/layout.tsx. */}
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          Knowledge base
          {entries.length > 0 && <span className="text-sm font-normal text-muted-foreground">{entries.length}</span>}
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OptionCard
          icon={HelpCircle}
          title="Q&A"
          description="Manually write question-and-answer pairs."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setQaOpen(true)}>
              Add Q&A
            </Button>
          }
        />
        <OptionCard
          icon={FileText}
          title="File"
          description="Upload a PDF, DOCX, .txt, or .md file."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setFileOpen(true)}>
              Upload file
            </Button>
          }
        />
        <OptionCard
          icon={LinkIcon}
          title="URL"
          description="Ingest one page's readable article text."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setUrlOpen(true)}>
              Add URL
            </Button>
          }
        />
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
            {/* ADR 0017: a <form action={...}> submit button nested inside
                AlertDialogAction races with Radix's own close-on-click
                dismissal — the dialog unmounting mid-click corrupts React's
                form-action wiring (a real bug this migration surfaced, not
                present under Base UI's AlertDialog). Calling the
                useActionState dispatch directly with manually-built
                FormData sidesteps the native form-submission path
                entirely; confirmed via a real click-to-delete round trip,
                not just tsc. */}
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                const formData = new FormData();
                formData.set("sourceId", deletingId ?? "");
                deleteFormAction(formData);
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
