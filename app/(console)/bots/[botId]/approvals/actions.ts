"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { getPendingActionForExecution, resolvePendingAction } from "@/lib/pendingActions";
import { executeOrderCancellation } from "@/lib/ai/tools/cancelOrder";
import { executeWidgetSubmission } from "@/lib/ai/tools/widget";

// Widget submissions (ADR 0028, Phase 2) use a dynamic toolName
// (`submit_widget_<name>`, one per business-authored widget) rather than
// a fixed key — the static EXECUTORS map below can't key on that ahead
// of time, so this is checked separately before falling through to it.
const WIDGET_SUBMIT_PREFIX = "submit_widget_";

export interface ApprovalActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

// The one place that knows both "how to read/update a PendingAction"
// (lib/pendingActions.ts, generic) and "how to actually execute a given
// toolName" (each write tool's own executor) — keeping that mapping out
// of lib/pendingActions.ts is what avoids a circular import, since
// cancelOrder.ts's own handle() already imports createPendingAction from
// there. The next write-capable tool adds one line here, not a change to
// the generic queue.
const EXECUTORS: Record<
  string,
  (orgId: string, botId: string, input: Record<string, unknown>) => Promise<{ status: "executed" | "failed"; detail: string }>
> = {
  request_order_cancellation: (orgId, botId, input) =>
    executeOrderCancellation(orgId, botId, input as { orderNumber: string; reason?: string }),
};

export async function approveAction(
  botId: string,
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const session = await getCurrentSession();
    const { toolName, input } = await getPendingActionForExecution(session.orgId, botId, id);
    const outcome = toolName.startsWith(WIDGET_SUBMIT_PREFIX)
      ? await executeWidgetSubmission(session.orgId, botId, toolName.slice(WIDGET_SUBMIT_PREFIX.length), input)
      : EXECUTORS[toolName]
        ? await EXECUTORS[toolName](session.orgId, botId, input)
        : { status: "failed" as const, detail: `No executor registered for "${toolName}".` };

    // The executor's "executed" (it actually called the external API and
    // succeeded) maps to PendingAction's "approved" terminal state — a
    // human approved it and it went through; "failed" means it was
    // approved but the real call didn't succeed, still visible as a
    // distinct outcome so it isn't confused with a rejection.
    await resolvePendingAction(
      session.orgId,
      botId,
      id,
      outcome.status === "executed" ? "approved" : "failed",
      outcome.detail,
    );
    revalidatePath(`/bots/${botId}/approvals`);
    return {
      status: outcome.status === "executed" ? "success" : "error",
      message: outcome.detail,
    };
  } catch (err) {
    console.error("[approveAction]", err);
    return { status: "error", message: "Couldn't process that approval. Please try again." };
  }
}

export async function rejectAction(
  botId: string,
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const session = await getCurrentSession();
    await resolvePendingAction(session.orgId, botId, id, "rejected", null);
    revalidatePath(`/bots/${botId}/approvals`);
    return { status: "success", message: "Request rejected." };
  } catch (err) {
    console.error("[rejectAction]", err);
    return { status: "error", message: "Couldn't reject that request. Please try again." };
  }
}
