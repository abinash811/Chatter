import { getCurrentSession } from "@/lib/auth";
import { listPendingActions } from "@/lib/pendingActions";
import { ApprovalsForm } from "./ApprovalsForm";

export default async function ApprovalsPage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const actions = await listPendingActions(session.orgId, botId);

  return <ApprovalsForm botId={botId} actions={actions} />;
}
