import type { Tool } from "@/lib/ai/tools/registry";
import { performActionRequest } from "@/lib/ai/tools/customAction";
import { createPendingAction } from "@/lib/pendingActions";
import { listEnabledWidgetsForExecution, getWidgetByNameForExecution, type WidgetForExecution } from "@/lib/widgets";

// In-chat interactive widgets (ADR 0028) — matches Chatbase's own
// "Widgets" feature's smallest useful slice: a Schema-driven form the
// bot can render inline, no Functions/States yet (separate, larger
// follow-ups per the ADR). Deliberately not a lib/ai/tools/registry.ts
// entry, same precedent as lib/ai/tools/customAction.ts: a widget's
// name/schema are per-bot data authored from the console, not code
// known at compile time. lib/ai/chat.ts merges the output of
// getEnabledWidgetTools() with the static registry's tools each turn.

// The tag lib/ai/chat.ts's loop looks for in a tool's own JSON output —
// same pattern every other tool already uses for structured signaling
// (handoff_required, ok/result). The Tool interface itself
// (handle(): Promise<string>) is untouched; this is just a specific
// shape within that string, per .claude/rules/bot-engine.md's "the
// interface stays stable" rule.
export const RENDER_WIDGET_TAG = "render_widget" as const;

export interface RenderWidgetPayload {
  type: typeof RENDER_WIDGET_TAG;
  widgetId: string;
  name: string;
  submitLabel: string;
  schema: unknown;
}

export function buildWidgetTool(widget: WidgetForExecution): Tool {
  return {
    name: `render_widget_${widget.name}`,
    description: widget.triggerDescription,
    // No input needed to trigger — the widget itself collects data from
    // the visitor (a "widget-only action" in Chatbase's own terms: no
    // API call), not from the model. The visitor's filled-in answers
    // come back as the visitor's own next chat message.
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },

    async handle() {
      const payload: RenderWidgetPayload = {
        type: RENDER_WIDGET_TAG,
        widgetId: widget.id,
        name: widget.name,
        submitLabel: widget.submitLabel,
        schema: widget.schema,
      };
      return JSON.stringify(payload);
    },

    // No describeForInbox: same reasoning as customAction.ts — a
    // business-named, dynamically-shaped widget can't have inbox-summary
    // code written ahead of time. Falls back to lib/conversations.ts's
    // existing generic summary.
  };
}

// Phase 2 (ADR 0028) — a Function: the widget's submit action calls a
// real API, reusing the exact same pipeline as CustomAction (ADR 0022)
// rather than a new action-calling path (performActionRequest, its SSRF
// guard, encrypted headers). Only built for a widget that has apiUrl
// set — a collection-only widget (Phase 1's default) gets no submit
// tool at all, since there's nothing for the model to call once the
// visitor's answers come back as their own plain-text message.
//
// The model calls this itself, after the visitor submits the widget's
// form, passing back the same field values — the tool's own description
// is what tells it to (guardrail #2: no hardcoded logic in the core
// engine deciding this).
function buildWidgetSubmitTool(widget: WidgetForExecution): Tool {
  const approvalNote = widget.writeCapable
    ? " This performs a real action that can't be undone, so it requires a team member's approval before it actually happens."
    : "";
  return {
    name: `submit_widget_${widget.name}`,
    description: `Call this immediately after the visitor submits the ${widget.name} widget's form, passing exactly the values they gave.${approvalNote}`,
    inputSchema: widget.schema as Tool["inputSchema"],

    async handle(orgId, botId, input, conversationId) {
      if (widget.writeCapable) {
        // Same precedent as request_order_cancellation (ADR 0023): never
        // call the real API directly — queue it for human review.
        await createPendingAction(orgId, botId, conversationId ?? "unknown", `submit_widget_${widget.name}`, input);
        return JSON.stringify({
          status: "pending_approval",
          message: "A team member will review this before it's actually submitted.",
        });
      }

      const result = await performActionRequest(widget.apiUrl!, widget.apiMethod!, widget.headers, input);
      if (!result.ok) {
        // Never fail silently or hallucinate a result (guardrail #4).
        const reason = result.status
          ? `The ${widget.name} widget's API call failed (${result.status}).`
          : `Couldn't reach the ${widget.name} widget's API.`;
        return JSON.stringify({ status: "handoff_required", reason });
      }
      return JSON.stringify({ status: "ok", result: result.bodyText });
    },

    describeForInbox(_input, output) {
      const parsed = JSON.parse(output) as { status: string; reason?: string };
      if (parsed.status === "pending_approval") {
        return { summary: `Submitted the ${widget.name} widget — waiting on approval.`, isIssue: true };
      }
      if (parsed.status === "handoff_required") {
        return { summary: `Tried to submit the ${widget.name} widget — ${parsed.reason} Handed off to a human.`, isIssue: true };
      }
      return { summary: `Submitted the ${widget.name} widget.`, isIssue: false };
    },
  };
}

export async function getEnabledWidgetTools(orgId: string, botId: string): Promise<Tool[]> {
  const widgets = await listEnabledWidgetsForExecution(orgId, botId);
  return widgets.flatMap((widget) => (widget.apiUrl ? [buildWidgetTool(widget), buildWidgetSubmitTool(widget)] : [buildWidgetTool(widget)]));
}

// The approved-execution step for a write-capable widget's queued
// submission — called from the approvals console action
// (app/(console)/bots/[botId]/approvals/actions.ts), never from
// buildWidgetSubmitTool's own handle() above (same avoid-a-circular-
// import reasoning as cancelOrder.ts's executeOrderCancellation: that
// function already imports createPendingAction from lib/pendingActions.ts).
// Looks the widget's own API config up fresh by name, since a
// PendingAction only stores the toolName + the visitor's input, not the
// widget's URL/headers.
export async function executeWidgetSubmission(
  orgId: string,
  botId: string,
  widgetName: string,
  input: Record<string, unknown>,
): Promise<{ status: "executed" | "failed"; detail: string }> {
  const widget = await getWidgetByNameForExecution(orgId, botId, widgetName);
  if (!widget || !widget.apiUrl || !widget.apiMethod) {
    return { status: "failed", detail: `Widget "${widgetName}" no longer exists or has no API configured.` };
  }
  const result = await performActionRequest(widget.apiUrl, widget.apiMethod, widget.headers, input);
  if (!result.ok) {
    return {
      status: "failed",
      detail: result.status ? `API call failed (${result.status}).` : "Couldn't reach the widget's API.",
    };
  }
  return { status: "executed", detail: result.bodyText ? result.bodyText.slice(0, 500) : "Submitted successfully." };
}

// Parses a tool's raw string output and returns the widget payload if
// (and only if) it's a genuine render_widget signal — used by
// lib/ai/chat.ts to detect a widget trigger without coupling it to
// which specific tool produced it (any tool could theoretically return
// this shape, though today only buildWidgetTool's tools do).
export function parseRenderWidgetPayload(toolOutput: string): RenderWidgetPayload | null {
  try {
    const parsed = JSON.parse(toolOutput) as Partial<RenderWidgetPayload>;
    if (parsed.type === RENDER_WIDGET_TAG && typeof parsed.widgetId === "string" && parsed.schema) {
      return parsed as RenderWidgetPayload;
    }
  } catch {
    // Not JSON — definitely not a widget signal.
  }
  return null;
}
