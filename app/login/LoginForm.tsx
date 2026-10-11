"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button, Input } from "@/components/ui";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Input name="email" type="email" placeholder="Email" defaultValue={state.email} required autoFocus />
      <Input name="password" type="password" placeholder="Password" required />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Logging in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        {/* font-medium + underline, not text-accent — see
            components/auth/AuthShell.tsx's comment for why. */}
        <a href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Sign up
        </a>
      </p>
    </form>
  );
}
