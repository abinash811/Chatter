import type { Tool } from "@/lib/ai/tools/registry";
import { listEnabledWidgetsForExecution, type WidgetForExecution } from "@/lib/widgets";

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

export async function getEnabledWidgetTools(orgId: string, botId: string): Promise<Tool[]> {
  const widgets = await listEnabledWidgetsForExecution(orgId, botId);
  return widgets.map(buildWidgetTool);
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
