"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas/auth";

export interface LoginState {
  error: string | null;
  // Echoed back so a failed submit doesn't force retyping the email —
  // never the password. See app/signup/actions.ts's SignupState comment.
  email: string;
}

// Returns action state rather than round-tripping the error through a
// ?error= query param — a server-action redirect to the same route with
// only the search params changed doesn't reliably force the client
// router to refetch (confirmed by actually driving this through a
// browser: the message only appeared after a manual reload).
export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/bots",
    });
    return { error: null, email };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password.", email };
    }
    throw err;
  }
}
