import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Sign up"
      title="Create your account"
      subtitle="Start building a bot for your business"
    >
      <SignupForm />
    </AuthShell>
  );
}
