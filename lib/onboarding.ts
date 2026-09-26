import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";

// ADR 0012: a single combined step (org name + first bot name) —
// replaces the silent auto-provisioned "{email}'s workspace" org and
// the empty /bots list a brand-new account used to land on.
export async function completeOnboarding(
  orgId: string,
  orgName: string,
  firstBotName: string,
): Promise<{ botId: string }> {
  const bot = await withOrgContext(orgId, async (tx) => {
    await tx.org.update({ where: { id: orgId }, data: { name: orgName, onboardedAt: new Date() } });
    return tx.bot.create({ data: { orgId, name: firstBotName } });
  });
  await getOrCreateBotPublicKey(orgId, bot.id);
  return { botId: bot.id };
}
