import { getCurrentSession } from "@/lib/auth";
import { listKnowledgeSources } from "@/lib/ai/knowledgeBase";
import { KnowledgeForm } from "./KnowledgeForm";

export default async function KnowledgePage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const entries = await listKnowledgeSources(session.orgId, botId);

  return (
    <KnowledgeForm
      botId={botId}
      entries={entries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        chunkCount: entry.chunkCount,
        createdAt: entry.createdAt,
      }))}
    />
  );
}
