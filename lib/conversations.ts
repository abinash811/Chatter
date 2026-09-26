import { withOrgContext } from "@/lib/db";

// ADR 0015: the conversation inbox's data layer. "Handoff-triggered" is
// derived here, not stored — a conversation counts as handoff-triggered
// if any of its ToolCallLog rows carried a handoff_required result (see
// lib/ai/tools/checkOrderStatus.ts), computed at query time so no schema
// change or backfill was needed. Deliberately no "status"/"resolved"
// concept — docs/open-questions.md #7 leaves that definition open.

export interface ConversationListFilters {
  botId?: string;
  handoffOnly?: boolean;
  fromDate?: Date;
}

export interface ConversationListRow {
  id: string;
  botId: string;
  botName: string;
  createdAt: Date;
  messageCount: number;
  lastMessagePreview: string | null;
  handoffTriggered: boolean;
}

// A tool call's raw output is a JSON string (ToolCallLog.output is a
// String column, not Json — see prisma/schema.prisma), so this checks
// the substring rather than parsing every row's JSON up front.
function outputSignalsHandoff(output: string): boolean {
  return output.includes("handoff_required");
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
      select: { conversationId: true, output: true },
    });
    const handoffConversationIds = new Set(
      toolCallsByConversation.filter((log) => outputSignalsHandoff(log.output)).map((log) => log.conversationId),
    );

    return conversations
      .map((conversation) => ({
        id: conversation.id,
        botId: conversation.botId,
        botName: conversation.bot.name,
        createdAt: conversation.createdAt,
        messageCount: conversation._count.messages,
        lastMessagePreview: conversation.messages[0]?.content.slice(0, 140) ?? null,
        handoffTriggered: handoffConversationIds.has(conversation.id),
      }))
      .filter((row) => !filters.handoffOnly || row.handoffTriggered);
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
  isHandoff: boolean;
}

export interface ConversationDetail {
  id: string;
  botId: string;
  botName: string;
  createdAt: Date;
  messages: ConversationDetailMessage[];
  toolCalls: ConversationDetailToolCall[];
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

    const toolCalls = await tx.toolCallLog.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return {
      id: conversation.id,
      botId: conversation.botId,
      botName: conversation.bot.name,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      toolCalls: toolCalls.map((t) => ({
        id: t.id,
        toolName: t.toolName,
        input: t.input,
        output: t.output,
        createdAt: t.createdAt,
        isHandoff: outputSignalsHandoff(t.output),
      })),
    };
  });
}
