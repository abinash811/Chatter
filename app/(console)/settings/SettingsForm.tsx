"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveSettingsAction, removeApiKeyAction, type SettingsState } from "./actions";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";

const idleState: SettingsState = { status: "idle", message: null };

function useActionToast(state: SettingsState) {
  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);
}

// Notion register (docs/design/principles.md #4): a calm configuration
// surface, same Card-as-recessed-panel treatment as the bot editor
// (ADR 0011). BYOA (ADR 0012) is optional, off by default, exposed here
// rather than forced during onboarding — progressive disclosure.
export function SettingsForm({ orgName, hasApiKey }: { orgName: string; hasApiKey: boolean }) {
  const [saveState, saveFormAction, isSaving] = useActionState(saveSettingsAction, idleState);
  const [removeState, removeFormAction, isRemoving] = useActionState(removeApiKeyAction, idleState);
  useActionToast(saveState);
  useActionToast(removeState);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex h-row items-center text-lg font-semibold">Settings</h1>

      <form action={saveFormAction}>
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>The name shown across your console.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="orgName">Workspace name</Label>
              <Input id="orgName" name="orgName" defaultValue={orgName} className="mt-1" required />
            </div>

            <div className="border-t border-border pt-4">
              <Label htmlFor="apiKey">Claude API key (optional)</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasApiKey
                  ? "A key is set — your bots call Claude using your own account, not ours."
                  : "Leave this blank to use our managed key. Bring your own if you'd rather bots run on your own Anthropic account and billing."}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder={hasApiKey ? "Enter a new key to replace it" : "sk-ant-..."}
                  className="flex-1"
                />
                {hasApiKey && (
                  <Button
                    type="submit"
                    formAction={removeFormAction}
                    variant="outline"
                    size="sm"
                    disabled={isRemoving}
                  >
                    {isRemoving ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
