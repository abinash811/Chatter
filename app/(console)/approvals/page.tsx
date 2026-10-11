import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { listPendingActions } from "@/lib/pendingActions";
import { ApprovalsForm } from "./ApprovalsForm";

// ADR 0038 (2026-10-04): org-wide, not bot-scoped — a review queue is a
// review queue regardless of which bot proposed the request, same
// pattern as /conversations and /leads.
export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ botId?: string }>;
}) {
  const session = await getCurrentSession();
  const { botId } = await searchParams;

  const [actions, bots] = await Promise.all([
    listPendingActions(session.orgId, botId),
    withOrgContext(session.orgId, (tx) =>
      tx.bot.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ),
  ]);

  return <ApprovalsForm actions={actions} bots={bots} />;
}
