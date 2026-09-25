"use server";

import { AuthError } from "next-auth";
import { createUser, signIn } from "@/lib/auth";
import { signupSchema } from "@/lib/schemas/auth";

export interface SignupState {
  error: string | null;
  // Echoed back so a failed submit doesn't force retyping the email —
  // never the password, that shouldn't round-trip even on our own error
  // path. Confirmed necessary by actually driving this through a
  // browser: the server-action round trip resets uncontrolled inputs.
  email: string;
}

// See app/login/actions.ts's comment — action state, not a ?error= query
// param, for the same reason (confirmed by actually driving this through
// a browser).
export async function signupAction(prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signupSchema.safeParse({
    email,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  try {
    await createUser(parsed.data.email, parsed.data.password);
  } catch (err) {
    return { error: (err as Error).message, email };
  }

  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/bots" });
    return { error: null, email };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created, but sign-in failed — try logging in.", email };
    }
    throw err;
  }
}
