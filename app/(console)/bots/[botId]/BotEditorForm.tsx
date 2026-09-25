"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveDraftAction, publishAction, type SaveDraftState } from "./actions";
import {
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";

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
      <form action={saveFormAction} className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Persona</CardTitle>
            <CardDescription>
              How should your bot introduce itself and talk to visitors? Write it in your own words.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="persona" className="sr-only">
              Persona
            </Label>
            <Textarea id="persona" name="persona" defaultValue={persona} rows={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardrails</CardTitle>
            <CardDescription>
              Anything your bot should never do or say — e.g. never quote a final price, never
              give medical advice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="guardrails" className="sr-only">
              Guardrails
            </Label>
            <Textarea id="guardrails" name="guardrails" defaultValue={guardrails} rows={4} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
            <CardDescription>What your bot can look up or do while chatting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tools.map((tool) => (
              <Label key={tool.name} className="flex items-center gap-2 font-normal">
                <Checkbox name={`tool_${tool.name}`} defaultChecked={tool.enabled} />
                {tool.name}
                <span className="text-muted-foreground">— {tool.description}</span>
              </Label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Widget appearance</CardTitle>
            <CardDescription>
              What visitors see before they've sent a message, and the widget's accent color.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="greeting">Greeting</Label>
              <Input id="greeting" name="greeting" defaultValue={greeting} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="accentColor">Accent color</Label>
              <input
                id="accentColor"
                type="color"
                name="accentColor"
                defaultValue={accentColor}
                className="mt-1 block h-row-sm w-16 rounded border border-border bg-transparent"
              />
            </div>
          </CardContent>
        </Card>

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
