import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { listConversations } from "@/lib/conversations";
import { ConversationFilters } from "@/components/console/ConversationFilters";
import { ConversationsTable } from "@/components/console/ConversationsTable";
import { Inbox } from "lucide-react";

const RANGE_TO_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// ADR 0015: dashboard-only conversation inbox. Linear register (docs/
// design/principles.md #4 names "inbox" explicitly) — dense list, same
// Table pattern as /bots. Filters are URL-driven so this stays a plain
// server component; ConversationFilters (client) owns updating the URL.
export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ botId?: string; range?: string; handoff?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;

  const bots = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  );

  const rangeMs = params.range ? RANGE_TO_MS[params.range] : undefined;
  const conversations = await listConversations(session.orgId, {
    botId: params.botId,
    handoffOnly: params.handoff === "1",
    fromDate: rangeMs ? new Date(Date.now() - rangeMs) : undefined,
  });

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          Conversations
          {conversations.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">{conversations.length}</span>
          )}
        </h1>
        <ConversationFilters bots={bots} />
      </div>

      {conversations.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No conversations yet</p>
          <p className="text-sm text-muted-foreground">
            Conversations started through a bot&apos;s widget will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border shadow-xs">
          <ConversationsTable conversations={conversations} />
        </div>
      )}
    </div>
  );
}
