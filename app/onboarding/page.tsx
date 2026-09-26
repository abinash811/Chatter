import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
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

  return <OnboardingForm defaultOrgName={org.name} />;
}
