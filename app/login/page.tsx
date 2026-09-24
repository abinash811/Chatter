import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthShell eyebrow="Sign in" title="Welcome back" subtitle="Log in to manage your bots">
      <LoginForm />
    </AuthShell>
  );
}
