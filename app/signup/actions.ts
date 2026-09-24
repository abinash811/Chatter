"use server";

import { AuthError } from "next-auth";
import { createUser, signIn } from "@/lib/auth";

// See app/login/actions.ts's comment — action state, not a ?error= query
// param, for the same reason (confirmed by actually driving this through
// a browser).
export async function signupAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirmPassword) {
    return "Passwords don't match.";
  }

  try {
    await createUser(email, password);
  } catch (err) {
    return (err as Error).message;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/bots" });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return "Account created, but sign-in failed — try logging in.";
    }
    throw err;
  }
}
