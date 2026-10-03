import { getCurrentSession } from "@/lib/auth";
import { listCustomActions } from "@/lib/customActions";
import { ActionsForm } from "./ActionsForm";

export default async function ActionsPage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const actions = await listCustomActions(session.orgId, botId);

  return <ActionsForm botId={botId} actions={actions} />;
}
