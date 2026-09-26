"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { createQaEntry, createFileEntry, createUrlEntry, deleteKnowledgeSource } from "@/lib/ai/knowledgeBase";
import { MAX_FILE_BYTES, KnowledgeIngestionError } from "@/lib/ai/extraction";

export interface KnowledgeActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  // Echoed back on error so KnowledgeForm.tsx can re-seed the fields via
  // defaultValue — same fix as app/login/actions.ts's LoginState.email:
  // React resets a <form action={...}> tied to a Server Action after the
  // action completes regardless of success/failure, so without this a
  // failed submit silently wiped fields. Caught for real, not assumed,
  // by checking inputValue() after a failed submit. (Not applicable to
  // the file input — browsers never let a value be programmatically
  // re-seeded into a file field, for security reasons.)
  question?: string;
  answer?: string;
  url?: string;
}

// A "use server" file may only export async functions (Next.js) — the
// idle-state constant lives in KnowledgeForm.tsx instead, same as
// app/(console)/bots/[botId]/BotEditorForm.tsx's own idleState. Caught
// for real: exporting it from here 500'd every render of this page.

// Same useActionState + toast pattern as app/(console)/bots/[botId]/
// actions.ts's saveDraftAction — errors caught here, not left to the
// framework's default error boundary, so the message stays plain-
// language (an embeddings-provider or extraction failure shouldn't
// surface a raw error to a business owner).
export async function createQaAction(
  botId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) {
    return { status: "error", message: "Both a question and an answer are required.", question, answer };
  }

  try {
    const session = await getCurrentSession();
    await createQaEntry(session.orgId, botId, question, answer);
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: "Added to the knowledge base." };
  } catch (err) {
    console.error("[createQaAction]", err);
    return { status: "error", message: "Couldn't save that entry. Please try again.", question, answer };
  }
}

export async function createFileAction(
  botId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: "That file is too large (max 5MB)." };
  }

  try {
    const session = await getCurrentSession();
    const buffer = Buffer.from(await file.arrayBuffer());
    await createFileEntry(session.orgId, botId, file.name, file.type, buffer);
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: "Added to the knowledge base." };
  } catch (err) {
    console.error("[createFileAction]", err);
    const message = err instanceof KnowledgeIngestionError ? err.message : "Couldn't process that file. Please try again.";
    return { status: "error", message };
  }
}

export async function createUrlAction(
  botId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) {
    return { status: "error", message: "A URL is required.", url };
  }

  try {
    const session = await getCurrentSession();
    await createUrlEntry(session.orgId, botId, url);
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: "Added to the knowledge base." };
  } catch (err) {
    console.error("[createUrlAction]", err);
    const message = err instanceof KnowledgeIngestionError ? err.message : "Couldn't ingest that URL. Please try again.";
    return { status: "error", message, url };
  }
}

export async function deleteEntryAction(
  botId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const sourceId = String(formData.get("sourceId") ?? "");
  try {
    const session = await getCurrentSession();
    await deleteKnowledgeSource(session.orgId, botId, sourceId);
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: "Deleted." };
  } catch (err) {
    console.error("[deleteEntryAction]", err);
    return { status: "error", message: "Couldn't delete that entry. Please try again." };
  }
}
