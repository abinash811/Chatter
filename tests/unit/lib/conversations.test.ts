import { describe, it, expect, vi, beforeEach } from "vitest";

// ADR 0015 + ADR 0016: the conversation inbox's "issue" derivation is
// the one piece of real logic here (no schema column, computed from
// each tool's own describeForInbox at query time) — everything else is
// a straight Prisma read, so this focuses on that derivation and the
// issues-only filter, mocked at the withOrgContext boundary same as
// tests/unit/lib/ai/chat.test.ts. describeToolCall uses the *real*
// tool registry (lib/ai/tools/index.ts's side-effect import), so
// "check_order_status" below exercises the real describeForInbox this
// suite's own tests/unit/lib/ai/tools/checkOrderStatus.test.ts covers,
// not a re-mocked stand-in — this is deliberately an integration point.

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

  it("marks a conversation as having an issue when a real tool's describeForInbox says so", async () => {
    findManyConversations.mockResolvedValue([baseConversation]);
    findManyToolCallLogs.mockResolvedValue([
      {
        conversationId: "conv-1",
        toolName: "check_order_status",
        input: { orderNumber: "1" },
        output: JSON.stringify({ status: "handoff_required", reason: "No Shopify store connected for this bot yet." }),
      },
    ]);

    const rows = await listConversations("org-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].hasIssue).toBe(true);
  });

  it("does not mark a conversation as having an issue when every tool call succeeded", async () => {
    findManyConversations.mockResolvedValue([baseConversation]);
    findManyToolCallLogs.mockResolvedValue([
      {
        conversationId: "conv-1",
        toolName: "check_order_status",
        input: { orderNumber: "1" },
        output: JSON.stringify({ status: "found", order: {} }),
      },
    ]);

    const rows = await listConversations("org-1");
    expect(rows[0].hasIssue).toBe(false);
  });

  it("falls back to the generic handoff_required substring check for an unregistered tool", async () => {
    findManyConversations.mockResolvedValue([baseConversation]);
    findManyToolCallLogs.mockResolvedValue([
      { conversationId: "conv-1", toolName: "some_future_tool", input: {}, output: '{"status":"handoff_required"}' },
    ]);

    const rows = await listConversations("org-1");
    expect(rows[0].hasIssue).toBe(true);
  });

  it("issuesOnly filter excludes conversations without an issue", async () => {
    const other = { ...baseConversation, id: "conv-2" };
    findManyConversations.mockResolvedValue([baseConversation, other]);
    findManyToolCallLogs.mockResolvedValue([
      {
        conversationId: "conv-1",
        toolName: "check_order_status",
        input: { orderNumber: "1" },
        output: JSON.stringify({ status: "not_found", orderNumber: "1" }),
      },
    ]);

    const rows = await listConversations("org-1", { issuesOnly: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("conv-1");
  });

  it("truncates the last message preview to 140 characters", async () => {
    const longContent = "a".repeat(200);
    findManyConversations.mockResolvedValue([{ ...baseConversation, messages: [{ content: longContent }] }]);
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

  it("gives each tool call a plain-language summary and flags only the one with an issue", async () => {
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
        output: JSON.stringify({ status: "handoff_required", reason: "No Shopify store connected for this bot yet." }),
        createdAt: new Date(),
      },
    ]);

    const detail = await getConversationDetail("org-1", "conv-1");
    const call1 = detail?.toolCalls.find((t) => t.id === "call-1");
    const call2 = detail?.toolCalls.find((t) => t.id === "call-2");
    expect(call1?.isIssue).toBe(false);
    expect(call1?.summary).toBe("Looked up order #1 — found it.");
    expect(call2?.isIssue).toBe(true);
    expect(call2?.summary).toContain("Handed off to a human");
  });
});
