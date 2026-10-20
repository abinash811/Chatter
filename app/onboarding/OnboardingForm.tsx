"use client";

import { useActionState } from "react";
import { onboardingAction, type OnboardingState } from "./actions";
import { Button, Input, Label } from "@/components/ui";

function initialState(defaultOrgName: string): OnboardingState {
  return { error: null, orgName: defaultOrgName, botName: "" };
}

// ADR 0012: one combined step, not a multi-screen wizard — name your
// workspace, name your first bot, land straight in its editor. No
// template picker (only one template exists yet) or teammate invites
// (separate, larger feature) — principles.md #7's progressive
// disclosure: the common case first, nothing else in the way.
//
// Renders inside AuthShell (onboarding/page.tsx), not its own page
// chrome — this is the one step between signup and the console, and
// used to drop straight to a bare white page with no branding/hero
// panel at all, a real register break right after signup's own
// AuthShell treatment (caught via a real screenshot during a full-app
// design audit, 2026-10-05). Matches SignupForm.tsx/LoginForm.tsx's
// own shape: just the form, no outer page wrapper or Card.
export function OnboardingForm({ defaultOrgName }: { defaultOrgName: string }) {
  const [state, formAction, isPending] = useActionState(onboardingAction, initialState(defaultOrgName));

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Label htmlFor="orgName">Workspace name</Label>
        <Input id="orgName" name="orgName" defaultValue={state.orgName} className="mt-1" required autoFocus />
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
  );
}
