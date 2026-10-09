import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { listLeads } from "@/lib/leads";
import { BotFilterSelect } from "@/components/console/BotFilterSelect";
import { PageHeader } from "@/components/console/PageHeader";
import { LeadsTable } from "./LeadsTable";

// ADR 0038 (2026-10-04): org-wide, not bot-scoped — a lead is a lead
// regardless of which bot collected it, same pattern as /conversations
// (global nav item, optional ?botId= filter, a "Bot" column per row).
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ botId?: string }>;
}) {
  const session = await getCurrentSession();
  const { botId } = await searchParams;

  const [leads, bots] = await Promise.all([
    listLeads(session.orgId, botId),
    withOrgContext(session.orgId, (tx) =>
      tx.bot.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ),
  ]);

  return (
    <div>
      <PageHeader title="Leads" count={leads.length > 0 ? leads.length : undefined} action={<BotFilterSelect bots={bots} />} />
      <LeadsTable leads={leads} />
    </div>
  );
}
