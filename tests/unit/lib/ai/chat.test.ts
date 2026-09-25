import { describe, it, expect, vi, beforeEach } from "vitest";

// sendMessage (lib/ai/chat.ts) is the actual product loop — the most
// valuable thing in this codebase to have real tests for, and (before
// this file) the one thing with zero automated coverage of any kind.
// Every dependency is mocked at the module boundary so this tests the
// loop's own logic (iteration guard, parallel tool calls, traceability
// logging, the conversation-ownership check) without touching a real
// database or a real Claude API call.

const findFirstVersion = vi.fn();
const findUniqueConversation = vi.fn();
const createConversation = vi.fn();
const createMessage = vi.fn();
const createToolCallLog = vi.fn();

vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({
      botConfigVersion: { findFirst: findFirstVersion },
      conversation: { findUniqueOrThrow: findUniqueConversation, create: createConversation },
      message: { create: createMessage },
      toolCallLog: { create: createToolCallLog },
    }),
  ),
}));

const generateReply = vi.fn();
vi.mock("@/lib/ai/gateway", () => ({
  getModelGateway: () => ({ generateReply }),
}));

vi.mock("@/lib/ai/systemPrompt", () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
}));

const getToolsForNames = vi.fn().mockReturnValue([]);
const runTool = vi.fn();
vi.mock("@/lib/ai/tools/registry", () => ({ getToolsForNames, runTool }));
vi.mock("@/lib/ai/tools", () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
  getToolsForNames.mockReturnValue([]);
  findFirstVersion.mockResolvedValue({ id: "version-1", tools: [] });
  createConversation.mockResolvedValue({ id: "conv-new", messages: [] });
  createMessage.mockResolvedValue({});
});

describe("sendMessage", () => {
  it("throws immediately if the bot has no published version — never calls the model", async () => {
    findFirstVersion.mockResolvedValue(null);
    const { sendMessage } = await import("@/lib/ai/chat");

    await expect(sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" })).rejects.toThrow(
      /no published config/i,
    );
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("replies directly and persists both messages when the model doesn't ask for a tool", async () => {
    generateReply.mockResolvedValue({
      content: [{ type: "text", text: "Hello there!" }],
      stopReason: "end_turn",
    });
    const { sendMessage } = await import("@/lib/ai/chat");

    const result = await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" });

    expect(result).toEqual({ conversationId: "conv-new", reply: "Hello there!" });
    expect(generateReply).toHaveBeenCalledTimes(1);
    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "user", content: "hi" }) }),
    );
    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "assistant", content: "Hello there!" }) }),
    );
  });

  it("rejects a conversationId that belongs to a different bot — even though RLS already scopes it by org, this closes the same-org cross-bot case", async () => {
    findUniqueConversation.mockResolvedValue({ id: "conv-1", botId: "other-bot", messages: [] });
    const { sendMessage } = await import("@/lib/ai/chat");

    await expect(
      sendMessage({ orgId: "org-1", botId: "bot-1", conversationId: "conv-1", userMessage: "hi" }),
    ).rejects.toThrow(/does not belong to this bot/);
  });

  it("runs a tool call, logs it for traceability (guardrail #6), and feeds the result back for a final reply", async () => {
    generateReply
      .mockResolvedValueOnce({
        content: [{ type: "tool_use", id: "call_1", name: "search_knowledge_base", input: { query: "hours" } }],
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "We're open 9-5." }],
        stopReason: "end_turn",
      });
    runTool.mockResolvedValue("Store hours: 9-5 daily.");
    const { sendMessage } = await import("@/lib/ai/chat");

    const result = await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "when are you open" });

    expect(result.reply).toBe("We're open 9-5.");
    expect(generateReply).toHaveBeenCalledTimes(2);
    expect(runTool).toHaveBeenCalledWith("search_knowledge_base", "org-1", "bot-1", { query: "hours" });
    expect(createToolCallLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toolName: "search_knowledge_base",
          input: { query: "hours" },
          output: "Store hours: 9-5 daily.",
        }),
      }),
    );
  });

  it("runs parallel tool calls concurrently and logs every one, regardless of which shapes the final answer", async () => {
    generateReply
      .mockResolvedValueOnce({
        content: [
          { type: "tool_use", id: "call_1", name: "tool_a", input: {} },
          { type: "tool_use", id: "call_2", name: "tool_b", input: {} },
        ],
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "done" }], stopReason: "end_turn" });
    runTool.mockImplementation(async (name: string) => `${name} result`);
    const { sendMessage } = await import("@/lib/ai/chat");

    await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" });

    expect(runTool).toHaveBeenCalledTimes(2);
    expect(createToolCallLog).toHaveBeenCalledTimes(2);
  });

  it("stops after MAX_TOOL_ITERATIONS and falls back to a plain-language message instead of looping forever", async () => {
    generateReply.mockResolvedValue({
      content: [{ type: "tool_use", id: "call_x", name: "search_knowledge_base", input: {} }],
      stopReason: "tool_use",
    });
    runTool.mockResolvedValue("some result");
    const { sendMessage } = await import("@/lib/ai/chat");

    const result = await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" });

    expect(generateReply).toHaveBeenCalledTimes(5);
    expect(result.reply).toBe("Sorry, I wasn't able to finish that — I'll get a human to help you instead.");
  });
});
