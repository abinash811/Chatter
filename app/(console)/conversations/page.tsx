import { ConversationsSplitView } from "@/components/console/ConversationsSplitView";
import { loadConversationsListData, type ConversationsSearchParams } from "./shared";

// ADR 0027: split-pane Activity layout — this route renders the list
// with nothing selected; /conversations/[conversationId] renders the
// same list plus a populated right panel. Linear register (docs/design/
// principles.md #4 names "inbox" explicitly).
export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<ConversationsSearchParams>;
}) {
  const params = await searchParams;
  const { bots, conversations } = await loadConversationsListData(params);

  return (
    <ConversationsSplitView
      bots={bots}
      conversations={conversations}
      selectedConversation={null}
      selectedId={null}
    />
  );
}
