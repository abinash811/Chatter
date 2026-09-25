"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveDraftAction, publishAction, type SaveDraftState } from "./actions";
import {
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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

// docs/design/principles.md #10: persistent top bar + Tabs + a confirm
// dialog before anything that changes what's live — the shape every
// record-editing screen uses, not a one-off layout for this page.
// Inspired by CARE's (ADR 0008) own record-editing screens' structure,
// not their healthcare content.
export function BotEditorForm({
  botId,
  botName,
  publishedVersion,
  persona,
  guardrails,
  tools,
  greeting,
  accentColor,
  embedSnippet,
}: {
  botId: string;
  botName: string;
  publishedVersion: number | null;
  persona: string;
  guardrails: string;
  tools: { name: string; description: string; enabled: boolean }[];
  greeting: string;
  accentColor: string;
  embedSnippet: string;
}) {
  const [saveState, saveFormAction, isSaving] = useActionState(saveDraftAction.bind(null, botId), idleState);
  const [publishState, publishFormAction, isPublishing] = useActionState(
    publishAction.bind(null, botId),
    idleState,
  );
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  useActionToast(saveState);
  useActionToast(publishState);

  useEffect(() => {
    if (publishState.status === "success") setPublishDialogOpen(false);
  }, [publishState]);

  return (
    <div className="max-w-2xl">
      <div className="flex h-row items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{botName}</h1>
          <Badge variant="muted">{publishedVersion ? `Published v${publishedVersion}` : "Never published"}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/bots/${botId}/integrations`} className="text-sm text-muted-foreground hover:underline">
            Integrations
          </a>
          <Button type="submit" form="bot-editor-form" variant="outline" size="sm" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save draft"}
          </Button>
          <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
            <Button type="button" size="sm" onClick={() => setPublishDialogOpen(true)}>
              Publish
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish this bot?</DialogTitle>
                <DialogDescription>
                  Visitors will see this version immediately. Conversations already in progress finish
                  on the version they started with.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <form action={publishFormAction}>
                  <Button type="submit" disabled={isPublishing}>
                    {isPublishing ? "Publishing..." : "Publish"}
                  </Button>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <form id="bot-editor-form" action={saveFormAction} className="mt-4">
        <Tabs defaultValue="persona">
          <TabsList>
            <TabsTrigger value="persona">Persona</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="persona" keepMounted className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              How should your bot introduce itself and talk to visitors? Write it in your own words.
            </p>
            <Label htmlFor="persona" className="sr-only">
              Persona
            </Label>
            <Textarea id="persona" name="persona" defaultValue={persona} rows={6} />
          </TabsContent>

          <TabsContent value="guardrails" keepMounted className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Anything your bot should never do or say — e.g. never quote a final price, never give
              medical advice.
            </p>
            <Label htmlFor="guardrails" className="sr-only">
              Guardrails
            </Label>
            <Textarea id="guardrails" name="guardrails" defaultValue={guardrails} rows={5} />
          </TabsContent>

          <TabsContent value="tools" keepMounted className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">What your bot can look up or do while chatting.</p>
            <div className="space-y-2">
              {tools.map((tool) => (
                <Label key={tool.name} className="flex items-center gap-2 font-normal">
                  <Checkbox name={`tool_${tool.name}`} defaultChecked={tool.enabled} />
                  {tool.name}
                  <span className="text-muted-foreground">— {tool.description}</span>
                </Label>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="appearance" keepMounted className="mt-4 space-y-5">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                What visitors see before they've sent a message, and the widget's accent color.
              </p>
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
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <span className="text-sm font-medium">Embed on your site</span>
              <p className="text-sm text-muted-foreground">
                Paste this before the closing <code>&lt;/body&gt;</code> tag on any page.
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{embedSnippet}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
