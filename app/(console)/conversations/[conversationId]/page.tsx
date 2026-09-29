import { getCurrentSession } from "@/lib/auth";
import { getConversationDetail } from "@/lib/conversations";
import { ConversationsSplitView } from "@/components/console/ConversationsSplitView";
import { loadConversationsListData, type ConversationsSearchParams } from "../shared";

export default async function ConversationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<ConversationsSearchParams>;
}) {
  const session = await getCurrentSession();
  const { conversationId } = await params;
  const searchParamsValue = await searchParams;

  const [{ bots, conversations }, conversation] = await Promise.all([
    loadConversationsListData(searchParamsValue),
    getConversationDetail(session.orgId, conversationId),
  ]);
  // Matches the existing bot-editor convention (findUniqueOrThrow) — a
  // missing/cross-tenant id throws into app/error.tsx's plain-language
  // boundary rather than Next's unstyled default 404, which no route in
  // this app has ever opted into.
  if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

  return (
    <ConversationsSplitView
      bots={bots}
      conversations={conversations}
      selectedConversation={conversation}
      selectedId={conversationId}
    />
  );
}
