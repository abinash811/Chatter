"use client";

import { useActionState } from "react";
import { signupAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const [error, formAction, isPending] = useActionState(signupAction, null);

  return (
    <form action={formAction} className="w-72 space-y-3">
      <h1 className="text-lg font-semibold">Sign up</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Input name="email" type="email" placeholder="Email" required autoFocus />
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

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="text-accent hover:underline">
          Log in
        </a>
      </p>
    </form>
  );
}
