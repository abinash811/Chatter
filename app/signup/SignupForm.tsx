"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";
import { Button, Input } from "@/components/ui";

const initialState: SignupState = { error: null, email: "" };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Input name="email" type="email" placeholder="Email" defaultValue={state.email} required autoFocus />
      <Input name="password" type="password" placeholder="Password" required minLength={8} />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm password"
        required
        minLength={8}
      />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing up..." : "Sign up"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        {/* font-medium + underline, not text-accent — monochrome palette
            has no separate link color, so an always-visible underline is
            what actually differentiates this from body text (see
            components/auth/AuthShell.tsx's comment for the same
            near-invisible-text bug this was copying). */}
        <a href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </a>
      </p>
    </form>
  );
}
