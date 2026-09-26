"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { completeOnboarding } from "@/lib/onboarding";

export interface OnboardingState {
  error: string | null;
  // Echoed back on error so a failed submit doesn't force retyping —
  // same fix as app/login/actions.ts's LoginState.email.
  orgName: string;
  botName: string;
}

export async function onboardingAction(
  prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const botName = String(formData.get("botName") ?? "").trim();
  if (!orgName || !botName) {
    return { error: "Both fields are required.", orgName, botName };
  }

  const session = await getCurrentSession();
  const { botId } = await completeOnboarding(session.orgId, orgName, botName);
  redirect(`/bots/${botId}`);
}
