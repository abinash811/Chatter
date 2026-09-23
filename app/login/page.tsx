import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/bots" });
        }}
      >
        <Button type="submit">Sign in with Google</Button>
      </form>
    </div>
  );
}
