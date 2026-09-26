import { describe, it, expect, vi, beforeEach } from "vitest";

// ADR 0015: the conversation inbox's handoff-triggered derivation is the
// one piece of real logic here (no schema column, computed from
// ToolCallLog.output at query time) — everything else is a straight
// Prisma read, so this focuses on that derivation and the handoff-only
// filter, mocked at the withOrgContext boundary same as tests/unit/lib/
// ai/chat.test.ts.

const findManyConversations = vi.fn();
const findManyToolCallLogs = vi.fn();
const findUniqueConversation = vi.fn();

vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({
      conversation: { findMany: findManyConversations, findUnique: findUniqueConversation },
      toolCallLog: { findMany: findManyToolCallLogs },
    }),
  ),
}));

import { listConversations, getConversationDetail } from "@/lib/conversations";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listConversations", () => {
  const baseConversation = {
    id: "conv-1",
    botId: "bot-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    bot: { name: "Test Bot" },
    messages: [{ content: "Hello there, this is the latest message" }],
    _count: { messages: 2 },
  };

  it("marks a conversation as handoff-triggered when a tool call output contains handoff_required", async () => {
    findManyConversations.mockResolvedValue([baseConversation]);
    findManyToolCallLogs.mockResolvedValue([
      { conversationId: "conv-1", output: JSON.stringify({ status: "handoff_required" }) },
    ]);

    const rows = await listConversations("org-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].handoffTriggered).toBe(true);
  });

  it("does not mark a conversation as handoff-triggered when no tool call signals it", async () => {
    findManyConversations.mockResolvedValue([baseConversation]);
    findManyToolCallLogs.mockResolvedValue([
      { conversationId: "conv-1", output: JSON.stringify({ status: "found", order: {} }) },
    ]);

    const rows = await listConversations("org-1");
    expect(rows[0].handoffTriggered).toBe(false);
  });

  it("handoffOnly filter excludes non-handoff conversations", async () => {
    const other = { ...baseConversation, id: "conv-2" };
    findManyConversations.mockResolvedValue([baseConversation, other]);
    findManyToolCallLogs.mockResolvedValue([
      { conversationId: "conv-1", output: JSON.stringify({ status: "handoff_required" }) },
    ]);

    const rows = await listConversations("org-1", { handoffOnly: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("conv-1");
  });

  it("truncates the last message preview to 140 characters", async () => {
    const longContent = "a".repeat(200);
    findManyConversations.mockResolvedValue([
      { ...baseConversation, messages: [{ content: longContent }] },
    ]);
    findManyToolCallLogs.mockResolvedValue([]);

    const rows = await listConversations("org-1");
    expect(rows[0].lastMessagePreview).toHaveLength(140);
  });

  it("returns null preview when a conversation has no messages", async () => {
    findManyConversations.mockResolvedValue([{ ...baseConversation, messages: [] }]);
    findManyToolCallLogs.mockResolvedValue([]);

    const rows = await listConversations("org-1");
    expect(rows[0].lastMessagePreview).toBeNull();
  });
});

describe("getConversationDetail", () => {
  it("returns null for a conversation that doesn't exist (or belongs to another org, per RLS)", async () => {
    findUniqueConversation.mockResolvedValue(null);
    const detail = await getConversationDetail("org-1", "missing-id");
    expect(detail).toBeNull();
  });

  it("flags only the tool call whose output signals a handoff", async () => {
    findUniqueConversation.mockResolvedValue({
      id: "conv-1",
      botId: "bot-1",
      createdAt: new Date(),
      bot: { name: "Test Bot" },
      messages: [],
    });
    findManyToolCallLogs.mockResolvedValue([
      {
        id: "call-1",
        toolName: "check_order_status",
        input: { orderNumber: "1" },
        output: JSON.stringify({ status: "found" }),
        createdAt: new Date(),
      },
      {
        id: "call-2",
        toolName: "check_order_status",
        input: { orderNumber: "2" },
        output: JSON.stringify({ status: "handoff_required" }),
        createdAt: new Date(),
      },
    ]);

    const detail = await getConversationDetail("org-1", "conv-1");
    expect(detail?.toolCalls.find((t) => t.id === "call-1")?.isHandoff).toBe(false);
    expect(detail?.toolCalls.find((t) => t.id === "call-2")?.isHandoff).toBe(true);
  });
});
