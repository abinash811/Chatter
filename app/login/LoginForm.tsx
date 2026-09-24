"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Input name="email" type="email" placeholder="Email" required autoFocus />
      <Input name="password" type="password" placeholder="Password" required />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Logging in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <a href="/signup" className="text-accent hover:underline">
          Sign up
        </a>
      </p>
    </form>
  );
}
