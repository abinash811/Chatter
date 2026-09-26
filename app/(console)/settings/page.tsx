import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const org = await withOrgContext(session.orgId, (tx) => tx.org.findUniqueOrThrow({ where: { id: session.orgId } }));

  return <SettingsForm orgName={org.name} hasApiKey={org.anthropicApiKeyEncrypted !== null} />;
}
