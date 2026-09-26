import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { getConversationDetail } from "@/lib/conversations";
import { ConversationThread } from "@/components/console/ConversationThread";
import { relativeTime } from "@/lib/utils";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await getCurrentSession();
  const { conversationId } = await params;

  const conversation = await getConversationDetail(session.orgId, conversationId);
  // Matches the existing bot-editor convention (findUniqueOrThrow) — a
  // missing/cross-tenant id throws into app/error.tsx's plain-language
  // boundary rather than Next's unstyled default 404, which no route in
  // this app has ever opted into.
  if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

  return (
    <div>
      <Link
        href="/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Conversations
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{conversation.botName}</h1>
        <span className="text-sm text-muted-foreground">Started {relativeTime(conversation.createdAt)}</span>
      </div>

      <div className="rounded-lg border border-border bg-soft-background p-6 shadow-xs">
        <ConversationThread messages={conversation.messages} toolCalls={conversation.toolCalls} />
      </div>
    </div>
  );
}
