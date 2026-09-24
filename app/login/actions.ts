"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

// Returns an error string on failure, or never returns on success (signIn's
// redirect throws). Passed to useActionState from a client component
// rather than round-tripping the error through a ?error= query param —
// a server-action redirect to the same route with only the search params
// changed doesn't reliably force the client router to refetch (confirmed
// by actually driving this through a browser: the message only appeared
// after a manual reload), so the error has to come back as action state.
export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/bots",
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw err;
  }
}
