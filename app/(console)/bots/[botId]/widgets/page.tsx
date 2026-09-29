import { getCurrentSession } from "@/lib/auth";
import { listWidgets } from "@/lib/widgets";
import { WidgetsForm } from "./WidgetsForm";

export default async function WidgetsPage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const widgets = await listWidgets(session.orgId, botId);

  return <WidgetsForm botId={botId} widgets={widgets} />;
}
