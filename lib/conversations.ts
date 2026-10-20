import { withOrgContext } from "@/lib/db";
import { getTool } from "@/lib/ai/tools/registry";
import "@/lib/ai/tools";

// ADR 0015 + ADR 0016: the conversation inbox's data layer. "Issue" is
// derived here, not stored — a conversation counts as having an issue if
// any of its ToolCallLog rows describe themselves as one (see each
// tool's own describeForInbox, ADR 0016) — computed at query time so no
// schema change or backfill was needed. Deliberately no "status"/
// "resolved" concept — docs/open-questions.md #7 leaves that definition
// open.

export interface ConversationListFilters {
  botId?: string;
  issuesOnly?: boolean;
  fromDate?: Date;
  /** ADR 0027 — "ongoing" | "paused"; omit for both. */
  status?: string;
}

export interface ConversationListRow {
  id: string;
  botId: string;
  botName: string;
  createdAt: Date;
  messageCount: number;
  lastMessagePreview: string | null;
  hasIssue: boolean;
  status: string;
  source: string;
}

// ADR 0016: each tool decides for itself what a plain-language summary
// and an "issue" mean for its own input/output shape (guardrail #2 — the
// core engine never special-cases a specific tool's meaning). A tool
// that hasn't implemented describeForInbox (or a ToolCallLog row from a
// tool no longer in the registry) gets this generic fallback — the
// literal-substring check ADR 0015 shipped with.
function describeToolCall(
  toolName: string,
  input: unknown,
  output: string,
): { summary: string; isIssue: boolean } {
  const tool = getTool(toolName);
  if (tool?.describeForInbox) {
    return tool.describeForInbox(input as Record<string, unknown>, output);
  }
  return { summary: `Ran ${toolName}.`, isIssue: output.includes("handoff_required") };
}

export async function listConversations(
  orgId: string,
  filters: ConversationListFilters = {},
): Promise<ConversationListRow[]> {
  return withOrgContext(orgId, async (tx) => {
    const conversations = await tx.conversation.findMany({
      where: {
        botId: filters.botId,
        createdAt: filters.fromDate ? { gte: filters.fromDate } : undefined,
        status: filters.status,
      },
      orderBy: { createdAt: "desc" },
      include: {
        bot: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    const toolCallsByConversation = await tx.toolCallLog.findMany({
      where: { conversationId: { in: conversations.map((c) => c.id) } },
      select: { conversationId: true, toolName: true, input: true, output: true },
    });
    const issueConversationIds = new Set(
      toolCallsByConversation
        .filter((log) => describeToolCall(log.toolName, log.input, log.output).isIssue)
        .map((log) => log.conversationId),
    );

    return conversations
      .map((conversation) => ({
        id: conversation.id,
        botId: conversation.botId,
        botName: conversation.bot.name,
        createdAt: conversation.createdAt,
        messageCount: conversation._count.messages,
        lastMessagePreview: conversation.messages[0]?.content.slice(0, 140) ?? null,
        hasIssue: issueConversationIds.has(conversation.id),
        status: conversation.status,
        source: conversation.source,
      }))
      .filter((row) => !filters.issuesOnly || row.hasIssue);
  });
}

export interface ConversationDetailMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ConversationDetailToolCall {
  id: string;
  toolName: string;
  input: unknown;
  output: string;
  createdAt: Date;
  summary: string;
  isIssue: boolean;
}

export interface ConversationDetail {
  id: string;
  botId: string;
  botName: string;
  createdAt: Date;
  messages: ConversationDetailMessage[];
  toolCalls: ConversationDetailToolCall[];
  status: string;
  source: string;
  /** ADR 0027 — the linked Lead's name/email/phone, or null if none was
   * ever collected for this conversation ("Anonymous" in the UI). */
  contact: string | null;
  /** ADR 0027 — MAX(messages.createdAt), no separate column: always
   * accurate, never goes stale relative to the real message log. */
  lastActivityAt: Date | null;
}

export async function getConversationDetail(
  orgId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  return withOrgContext(orgId, async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      include: {
        bot: { select: { name: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) return null;

    const [toolCalls, lead] = await Promise.all([
      tx.toolCallLog.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } }),
      tx.lead.findFirst({ where: { conversationId } }),
    ]);

    const lastMessage = conversation.messages[conversation.messages.length - 1];

    return {
      id: conversation.id,
      botId: conversation.botId,
      botName: conversation.bot.name,
      createdAt: conversation.createdAt,
      status: conversation.status,
      source: conversation.source,
      contact: lead ? (lead.name ?? lead.email ?? lead.phone) : null,
      lastActivityAt: lastMessage?.createdAt ?? null,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      toolCalls: toolCalls.map((t) => {
        const { summary, isIssue } = describeToolCall(t.toolName, t.input, t.output);
        return {
          id: t.id,
          toolName: t.toolName,
          input: t.input,
          output: t.output,
          createdAt: t.createdAt,
          summary,
          isIssue,
        };
      }),
    };
  });
}

// ADR 0027 — pause/resume. Scoped to botId, not just orgId: a
// conversationId is client-supplied (same reasoning as lib/ai/chat.ts's
// own cross-bot check), and an org can have multiple bots.
export async function setConversationStatus(
  orgId: string,
  botId: string,
  conversationId: string,
  status: "ongoing" | "paused",
): Promise<void> {
  await withOrgContext(orgId, (tx) =>
    tx.conversation.updateMany({ where: { id: conversationId, botId }, data: { status } }),
  );
}
