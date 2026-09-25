"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveDraftAction, publishAction, type SaveDraftState } from "./actions";
import { Button } from "@/components/ui";

const idleState: SaveDraftState = { status: "idle", message: null };

// Toasts on every save/publish outcome (previously silent either way —
// see CLAUDE.md's known-gaps history). Message text is plain language on
// purpose, no raw error/stack detail — the real error is logged
// server-side in actions.ts.
function useActionToast(state: SaveDraftState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

export function BotEditorForm({
  botId,
  persona,
  guardrails,
  tools,
  greeting,
  accentColor,
}: {
  botId: string;
  persona: string;
  guardrails: string;
  tools: { name: string; description: string; enabled: boolean }[];
  greeting: string;
  accentColor: string;
}) {
  const [saveState, saveFormAction, isSaving] = useActionState(saveDraftAction.bind(null, botId), idleState);
  const [publishState, publishFormAction, isPublishing] = useActionState(
    publishAction.bind(null, botId),
    idleState,
  );
  useActionToast(saveState);
  useActionToast(publishState);

  return (
    <>
      <form action={saveFormAction} className="mt-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="persona">
            Persona
          </label>
          <p className="text-sm text-muted-foreground">
            How should your bot introduce itself and talk to visitors? Write it in your own words.
          </p>
          <textarea
            id="persona"
            name="persona"
            defaultValue={persona}
            rows={5}
            className="w-full rounded border border-border bg-transparent p-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="guardrails">
            Guardrails
          </label>
          <p className="text-sm text-muted-foreground">
            Anything your bot should never do or say — e.g. never quote a final price, never give
            medical advice.
          </p>
          <textarea
            id="guardrails"
            name="guardrails"
            defaultValue={guardrails}
            rows={4}
            className="w-full rounded border border-border bg-transparent p-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Tools</span>
          <div className="space-y-1">
            {tools.map((tool) => (
              <label key={tool.name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`tool_${tool.name}`} defaultChecked={tool.enabled} />
                {tool.name}
                <span className="text-muted-foreground">— {tool.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Widget appearance</span>
          <p className="text-sm text-muted-foreground">
            What visitors see before they've sent a message, and the widget's accent color.
          </p>
          <label className="block text-sm">
            Greeting
            <input
              name="greeting"
              defaultValue={greeting}
              className="mt-1 w-full rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Accent color
            <input
              type="color"
              name="accentColor"
              defaultValue={accentColor}
              className="mt-1 block h-row-sm w-16 rounded border border-border bg-transparent"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save draft"}
          </Button>
        </div>
      </form>

      <form action={publishFormAction} className="mt-4">
        <Button type="submit" disabled={isPublishing}>
          {isPublishing ? "Publishing..." : "Publish"}
        </Button>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing makes this the version live visitors talk to. Conversations already in
          progress finish on the version they started with.
        </p>
      </form>
    </>
  );
}
