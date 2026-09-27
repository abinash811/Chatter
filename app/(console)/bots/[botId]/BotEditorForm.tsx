"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, Package, Wrench, type LucideIcon } from "lucide-react";
import { saveDraftAction, publishAction, type SaveDraftState } from "./actions";
import {
  Button,
  Textarea,
  Label,
  Switch,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { OptionCard } from "@/components/console/OptionCard";
import type { AvatarEmoji, WidgetPosition } from "@/lib/ai/appearanceOptions";
import { PERSONA_TEMPLATES } from "@/lib/ai/personaTemplates";
import { AppearanceTabContent } from "./AppearanceTabContent";
import { PreviewSheet } from "./PreviewSheet";

const idleState: SaveDraftState = { status: "idle", message: null };

// Presentation-only lookup (console layer, not the core engine — the
// tool registry itself stays generic, guardrail #2) — an icon per known
// built-in tool, matching Chatbase's own Actions-page card language
// (docs/research/competitive-landscape.md's 2026-09-27 update). Any
// tool not listed here (a future addition) still renders correctly with
// the generic Wrench fallback — this map is cosmetic, never a gate on
// which tools are usable.
const TOOL_ICONS: Record<string, LucideIcon> = {
  search_knowledge_base: Search,
  collect_lead: UserPlus,
  check_order_status: Package,
};

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
  publishedVersion,
  persona,
  guardrails,
  tools,
  greeting,
  accentColor,
  avatarEmoji,
  position,
  embedSnippet,
}: {
  botId: string;
  publishedVersion: number | null;
  persona: string;
  guardrails: string;
  tools: { name: string; description: string; enabled: boolean }[];
  greeting: string;
  accentColor: string;
  avatarEmoji: AvatarEmoji;
  position: WidgetPosition;
  embedSnippet: string;
}) {
  const [saveState, saveFormAction, isSaving] = useActionState(saveDraftAction.bind(null, botId), idleState);
  const [publishState, publishFormAction, isPublishing] = useActionState(
    publishAction.bind(null, botId),
    idleState,
  );
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const personaRef = useRef<HTMLTextAreaElement>(null);
  useActionToast(saveState);
  useActionToast(publishState);

  useEffect(() => {
    if (publishState.status === "success") setPublishDialogOpen(false);
  }, [publishState]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex h-row items-center justify-between">
        {/* Bot name + switcher now live in the shared BotTopBar
            (app/(console)/bots/[botId]/layout.tsx) — this row keeps only
            what's specific to the editor: publish status and actions. */}
        <Badge variant="muted">{publishedVersion ? `Published v${publishedVersion}` : "Never published"}</Badge>
        <div className="flex items-center gap-3">
          <PreviewSheet botId={botId} published={publishedVersion !== null} />
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

          <TabsContent value="persona" forceMount className="mt-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Persona</CardTitle>
                <CardDescription>
                  How should your bot introduce itself and talk to visitors? Write it in your own words.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="personaTemplate">Start from a template</Label>
                  <Select
                    onValueChange={(templateId) => {
                      const template = PERSONA_TEMPLATES.find((t) => t.id === templateId);
                      if (template && personaRef.current) {
                        personaRef.current.value = template.persona;
                      }
                    }}
                  >
                    <SelectTrigger id="personaTemplate" className="mt-1 w-56" aria-label="Start from a template">
                      <SelectValue placeholder="Choose a starting point..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONA_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Replaces the text below — edit freely after.</p>
                </div>
                <div>
                  <Label htmlFor="persona" className="sr-only">
                    Persona
                  </Label>
                  <Textarea id="persona" name="persona" defaultValue={persona} rows={6} ref={personaRef} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guardrails" forceMount className="mt-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Guardrails</CardTitle>
                <CardDescription>
                  Anything your bot should never do or say — e.g. never quote a final price, never give
                  medical advice.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="guardrails" className="sr-only">
                  Guardrails
                </Label>
                <Textarea id="guardrails" name="guardrails" defaultValue={guardrails} rows={5} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" forceMount className="mt-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Tools</CardTitle>
                <CardDescription>What your bot can look up or do while chatting.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tools.map((tool) => (
                  <OptionCard
                    key={tool.name}
                    icon={TOOL_ICONS[tool.name] ?? Wrench}
                    title={tool.name}
                    description={tool.description}
                    trailing={
                      <Switch
                        name={`tool_${tool.name}`}
                        defaultChecked={tool.enabled}
                        aria-label={`${tool.enabled ? "Disable" : "Enable"} ${tool.name}`}
                      />
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <AppearanceTabContent
              greeting={greeting}
              accentColor={accentColor}
              avatarEmoji={avatarEmoji}
              position={position}
              embedSnippet={embedSnippet}
            />
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
