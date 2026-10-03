"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { setConversationStatus } from "@/lib/conversations";

export interface ConversationActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

// ADR 0027 — pause stops lib/ai/chat.ts from generating an AI reply for
// this conversation (the visitor's messages still get recorded); resume
// undoes that. Scoped to a specific botId, not just orgId — see
// setConversationStatus's own comment.
export async function toggleConversationPauseAction(
  botId: string,
  conversationId: string,
  _prevState: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const paused = formData.get("paused") === "true";
  try {
    const session = await getCurrentSession();
    await setConversationStatus(session.orgId, botId, conversationId, paused ? "paused" : "ongoing");
    revalidatePath(`/conversations/${conversationId}`);
    revalidatePath("/conversations");
    return { status: "success", message: paused ? "Conversation paused." : "Conversation resumed." };
  } catch (err) {
    console.error("[toggleConversationPauseAction]", err);
    return { status: "error", message: "Couldn't update this conversation. Please try again." };
  }
}
