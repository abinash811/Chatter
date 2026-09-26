"use client";

import { useActionState } from "react";
import { onboardingAction, type OnboardingState } from "./actions";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";

function initialState(defaultOrgName: string): OnboardingState {
  return { error: null, orgName: defaultOrgName, botName: "" };
}

// ADR 0012: one combined step, not a multi-screen wizard — name your
// workspace, name your first bot, land straight in its editor. No
// template picker (only one template exists yet) or teammate invites
// (separate, larger feature) — principles.md #7's progressive
// disclosure: the common case first, nothing else in the way.
export function OnboardingForm({ defaultOrgName }: { defaultOrgName: string }) {
  const [state, formAction, isPending] = useActionState(onboardingAction, initialState(defaultOrgName));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome to Chatter</CardTitle>
          <CardDescription>Let&apos;s set up your workspace and your first bot.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}

            <div>
              <Label htmlFor="orgName">Workspace name</Label>
              <Input
                id="orgName"
                name="orgName"
                defaultValue={state.orgName}
                className="mt-1"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="botName">Your first bot&apos;s name</Label>
              <Input
                id="botName"
                name="botName"
                placeholder="Support bot"
                defaultValue={state.botName}
                className="mt-1"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Setting up..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
