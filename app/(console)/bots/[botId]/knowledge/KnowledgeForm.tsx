"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HelpCircle, FileText, Link as LinkIcon, Type } from "lucide-react";
import {
  createQaAction,
  createFileAction,
  createUrlAction,
  createTextAction,
  deleteEntryAction,
  bulkDeleteEntriesAction,
  type KnowledgeActionState,
} from "./actions";
import { AddQaDialog } from "./AddQaDialog";
import { AddFileDialog } from "./AddFileDialog";
import { AddUrlDialog } from "./AddUrlDialog";
import { AddTextDialog } from "./AddTextDialog";
import { KnowledgeTable, type KnowledgeSourceRow } from "./KnowledgeTable";
import { OptionCard } from "@/components/console/OptionCard";
import { formatBytes } from "@/lib/utils";
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

// Notion register for the writing surfaces (the Add dialogs — calm,
// generous, per docs/design/principles.md #4 and ADR 0011), Linear
// register for the list (KnowledgeTable, a real CARE Table matching
// BotsTable.tsx) — same split docs/research/design-system-standards.md
// itself describes for Linear (dense list) vs. Notion (calm compose
// surface). Four entry points now (Q&A/file/URL/text) as always-visible
// OptionCards, matching Chatbase's Data sources page card gallery
// (docs/research/competitive-landscape.md). Each dialog is its own
// component so this orchestrator stays under the file-length guardrail
// (scripts/check-file-length.mjs).
export function KnowledgeForm({
  botId,
  entries,
  totalBytes,
}: {
  botId: string;
  entries: KnowledgeSourceRow[];
  totalBytes: number;
}) {
  const [qaState, qaFormAction, isAddingQa] = useActionState(createQaAction.bind(null, botId), idleState);
  const [fileState, fileFormAction, isAddingFile] = useActionState(createFileAction.bind(null, botId), idleState);
  const [urlState, urlFormAction, isAddingUrl] = useActionState(createUrlAction.bind(null, botId), idleState);
  const [textState, textFormAction, isAddingText] = useActionState(createTextAction.bind(null, botId), idleState);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteEntryAction.bind(null, botId), idleState);
  const [bulkDeleteState, bulkDeleteFormAction, isBulkDeleting] = useActionState(
    bulkDeleteEntriesAction.bind(null, botId),
    idleState,
  );

  const [qaOpen, setQaOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useActionToast(qaState);
  useActionToast(fileState);
  useActionToast(urlState);
  useActionToast(textState);
  useActionToast(deleteState);
  useActionToast(bulkDeleteState);

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
    if (textState.status === "success") setTextOpen(false);
  }, [textState]);
  useEffect(() => {
    if (deleteState.status === "success") setDeletingId(null);
  }, [deleteState]);
  useEffect(() => {
    if (bulkDeleteState.status === "success") setBulkDeleteIds(null);
  }, [bulkDeleteState]);

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        {/* h2, not h1 — the page's h1 is the (sr-only) bot name in the
            shared BotTopBar, app/(console)/bots/[botId]/layout.tsx. */}
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          Data sources
          {entries.length > 0 && <span className="text-sm font-normal text-muted-foreground">{entries.length}</span>}
        </h2>
        {/* Informational only, no plan-based cap — docs/open-questions.md
            #6 (pricing/billing tiers) is unresolved, so there's nothing
            to show a total against yet, unlike Chatbase's "X KB / 1 MB". */}
        <p className="text-sm text-muted-foreground">Total size: {formatBytes(totalBytes)}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OptionCard
          icon={FileText}
          title="File"
          description="PDF, DOCX, .txt, or .md — up to 5MB."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setFileOpen(true)}>
              Upload file
            </Button>
          }
        />
        <OptionCard
          icon={LinkIcon}
          title="Website"
          description="Pull one page's readable text."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setUrlOpen(true)}>
              Add URL
            </Button>
          }
        />
        <OptionCard
          icon={Type}
          title="Text snippet"
          description="Paste text — no file or link needed."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setTextOpen(true)}>
              Add text
            </Button>
          }
        />
        <OptionCard
          icon={HelpCircle}
          title="Q&A"
          description="Write question-and-answer pairs."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setQaOpen(true)}>
              Add Q&A
            </Button>
          }
        />
      </div>

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
      <AddTextDialog
        open={textOpen}
        onOpenChange={setTextOpen}
        formAction={textFormAction}
        state={textState}
        isPending={isAddingText}
      />
      <AddQaDialog open={qaOpen} onOpenChange={setQaOpen} formAction={qaFormAction} state={qaState} isPending={isAddingQa} />

      <KnowledgeTable entries={entries} onDelete={setDeletingId} onBulkDelete={setBulkDeleteIds} />

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

      <AlertDialog open={bulkDeleteIds !== null} onOpenChange={(open) => !open && setBulkDeleteIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteIds?.length ?? 0} entries?</AlertDialogTitle>
            <AlertDialogDescription>
              The bot will no longer be able to use these to answer visitors. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBulkDeleting}
              onClick={() => {
                const formData = new FormData();
                for (const id of bulkDeleteIds ?? []) formData.append("sourceId", id);
                bulkDeleteFormAction(formData);
              }}
            >
              {isBulkDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
