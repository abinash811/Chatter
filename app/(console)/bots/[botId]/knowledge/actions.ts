"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import {
  createQaEntry,
  createFileEntry,
  createUrlEntry,
  createCrawledEntries,
  createTextEntry,
  deleteKnowledgeSource,
} from "@/lib/ai/knowledgeBase";
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
  title?: string;
  text?: string;
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

  // ADR 0030 — the same dialog's "Crawl this site" checkbox routes here
  // instead of a single-page fetch. Real crawl failures (robots.txt
  // disallows it, nothing extractable) surface via KnowledgeIngestionError
  // same as every other ingestion path.
  if (formData.get("crawl") === "on") {
    try {
      const session = await getCurrentSession();
      const count = await createCrawledEntries(session.orgId, botId, url);
      revalidatePath(`/bots/${botId}/knowledge`);
      return { status: "success", message: `Crawled and added ${count} ${count === 1 ? "page" : "pages"}.` };
    } catch (err) {
      console.error("[createUrlAction/crawl]", err);
      const message = err instanceof KnowledgeIngestionError ? err.message : "Couldn't crawl that site. Please try again.";
      return { status: "error", message, url };
    }
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

export async function createTextAction(
  botId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!title || !text) {
    return { status: "error", message: "Both a title and some text are required.", title, text };
  }

  try {
    const session = await getCurrentSession();
    await createTextEntry(session.orgId, botId, title, text);
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: "Added to the knowledge base." };
  } catch (err) {
    console.error("[createTextAction]", err);
    const message = err instanceof KnowledgeIngestionError ? err.message : "Couldn't save that snippet. Please try again.";
    return { status: "error", message, title, text };
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

// Bulk-select delete (Chatbase's "Bulk select" mode) — one action call
// for N ids rather than N round trips, and a partial failure still
// removes whatever it could rather than leaving the whole batch stuck.
export async function bulkDeleteEntriesAction(
  botId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const sourceIds = formData.getAll("sourceId").map(String).filter(Boolean);
  if (sourceIds.length === 0) {
    return { status: "error", message: "Nothing selected." };
  }

  try {
    const session = await getCurrentSession();
    for (const sourceId of sourceIds) {
      await deleteKnowledgeSource(session.orgId, botId, sourceId);
    }
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: `Deleted ${sourceIds.length} ${sourceIds.length === 1 ? "entry" : "entries"}.` };
  } catch (err) {
    console.error("[bulkDeleteEntriesAction]", err);
    return { status: "error", message: "Couldn't delete some entries. Please try again." };
  }
}
