import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  let orgId: string;
  try {
    orgId = (await getCurrentSession()).orgId;
  } catch {
    redirect("/login");
  }

  const org = await withOrgContext(orgId, (tx) => tx.org.findUniqueOrThrow({ where: { id: orgId } }));
  if (org.onboardedAt) {
    // Already done — nothing for this page to do.
    redirect("/bots");
  }

  return (
    <AuthShell eyebrow="Get started" title="Welcome to Chatter" subtitle="Let's set up your workspace and your first bot.">
      <OnboardingForm defaultOrgName={org.name} />
    </AuthShell>
  );
}
