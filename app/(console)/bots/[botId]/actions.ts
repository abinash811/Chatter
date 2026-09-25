"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { saveDraft, publishDraft } from "@/lib/ai/botConfig";
import { listAllTools } from "@/lib/ai/tools/registry";
import "@/lib/ai/tools";

export interface SaveDraftState {
  status: "idle" | "success" | "error";
  message: string | null;
}

// Bound to a specific botId via .bind(null, botId) before being passed
// to useActionState (BotEditorForm.tsx) — see app/login/actions.ts for
// the same action-state pattern. Errors are caught here, not left to
// the framework's default error boundary, so the message stays in plain
// words instead of a stack trace.
export async function saveDraftAction(
  botId: string,
  _prevState: SaveDraftState,
  formData: FormData,
): Promise<SaveDraftState> {
  try {
    const session = await getCurrentSession();
    await saveDraft(session.orgId, botId, {
      persona: String(formData.get("persona") ?? ""),
      guardrails: String(formData.get("guardrails") ?? ""),
      tools: listAllTools()
        .map((t) => t.name)
        .filter((name) => formData.get(`tool_${name}`) === "on"),
      appearance: {
        greeting: String(formData.get("greeting") ?? ""),
        accentColor: String(formData.get("accentColor") ?? "#065f46"), // allow-raw-color — form fallback, not console UI (matches lib/ai/botConfig.ts's DEFAULT_APPEARANCE)
      },
    });
    revalidatePath(`/bots/${botId}`);
    return { status: "success", message: "Draft saved." };
  } catch (err) {
    console.error("[saveDraftAction]", err);
    return { status: "error", message: "Couldn't save your changes. Please try again." };
  }
}

export async function publishAction(botId: string, _prevState: SaveDraftState): Promise<SaveDraftState> {
  try {
    const session = await getCurrentSession();
    await publishDraft(session.orgId, botId);
    revalidatePath(`/bots/${botId}`);
    return { status: "success", message: "Published — visitors will see this version now." };
  } catch (err) {
    console.error("[publishAction]", err);
    return { status: "error", message: "Couldn't publish. Please try again." };
  }
}
