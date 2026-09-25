import { getCurrentSession } from "@/lib/auth";
import { listQaEntries } from "@/lib/ai/knowledgeBase";
import { KnowledgeForm } from "./KnowledgeForm";

export default async function KnowledgePage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const entries = await listQaEntries(session.orgId, botId);

  return (
    <KnowledgeForm
      botId={botId}
      entries={entries.map((entry) => ({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
      }))}
    />
  );
}
