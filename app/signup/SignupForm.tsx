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
        <a href="/login" className="text-accent hover:underline">
          Log in
        </a>
      </p>
    </form>
  );
}
