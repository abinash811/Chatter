import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { listConversations, type ConversationListRow } from "@/lib/conversations";

// Shared between page.tsx (no selection) and [conversationId]/page.tsx
// (a selection) — ADR 0027's split-pane layout needs the same list on
// the left regardless of which route rendered it, and Next.js only
// passes `searchParams` to a Page, not a Layout, so this can't just
// live in conversations/layout.tsx.

const RANGE_TO_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export interface ConversationsSearchParams {
  botId?: string;
  range?: string;
  issues?: string;
  status?: string;
}

export interface ConversationsListData {
  orgId: string;
  bots: { id: string; name: string }[];
  conversations: ConversationListRow[];
}

export async function loadConversationsListData(
  searchParams: ConversationsSearchParams,
): Promise<ConversationsListData> {
  const session = await getCurrentSession();

  const bots = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  );

  const rangeMs = searchParams.range ? RANGE_TO_MS[searchParams.range] : undefined;
  const conversations = await listConversations(session.orgId, {
    botId: searchParams.botId,
    issuesOnly: searchParams.issues === "1",
    fromDate: rangeMs ? new Date(Date.now() - rangeMs) : undefined,
    status: searchParams.status,
  });

  return { orgId: session.orgId, bots, conversations };
}
