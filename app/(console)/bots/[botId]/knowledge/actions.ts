"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { createQaEntry, deleteQaEntry } from "@/lib/ai/knowledgeBase";

export interface QaActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  // Echoed back on error so KnowledgeForm.tsx can re-seed the fields via
  // defaultValue — same fix as app/login/actions.ts's LoginState.email:
  // React resets a <form action={...}> tied to a Server Action after the
  // action completes regardless of success/failure, so without this a
  // failed submit silently wiped both fields. Caught for real, not
  // assumed, by checking inputValue() after a failed submit.
  question?: string;
  answer?: string;
}

// A "use server" file may only export async functions (Next.js) — the
// idle-state constant lives in KnowledgeForm.tsx instead, same as
// app/(console)/bots/[botId]/BotEditorForm.tsx's own idleState. Caught
// for real: exporting it from here 500'd every render of this page.

// Same useActionState + toast pattern as app/(console)/bots/[botId]/
// actions.ts's saveDraftAction — errors caught here, not left to the
// framework's default error boundary, so the message stays plain-
// language (an embeddings-provider failure shouldn't surface a raw
// fetch error to a business owner).
export async function createQaAction(
  botId: string,
  _prevState: QaActionState,
  formData: FormData,
): Promise<QaActionState> {
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

export async function deleteQaAction(
  botId: string,
  _prevState: QaActionState,
  formData: FormData,
): Promise<QaActionState> {
  const sourceId = String(formData.get("sourceId") ?? "");
  try {
    const session = await getCurrentSession();
    await deleteQaEntry(session.orgId, botId, sourceId);
    revalidatePath(`/bots/${botId}/knowledge`);
    return { status: "success", message: "Deleted." };
  } catch (err) {
    console.error("[deleteQaAction]", err);
    return { status: "error", message: "Couldn't delete that entry. Please try again." };
  }
}
