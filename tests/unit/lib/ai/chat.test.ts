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
const findOrg = vi.fn();

vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({
      botConfigVersion: { findFirst: findFirstVersion },
      conversation: { findUniqueOrThrow: findUniqueConversation, create: createConversation },
      message: { create: createMessage },
      toolCallLog: { create: createToolCallLog },
      org: { findUniqueOrThrow: findOrg },
    }),
  ),
}));

// BYOA (ADR 0012) — decrypt is only exercised when an org has its own
// key set; most tests leave anthropicApiKeyEncrypted null (see
// findOrg's default below) so the gateway mock's own default applies.
vi.mock("@/lib/crypto", () => ({ decrypt: vi.fn((s: string) => `decrypted:${s}`) }));

const generateReply = vi.fn();
const getModelGateway = vi.fn(() => ({ generateReply }));
vi.mock("@/lib/ai/gateway", () => ({ getModelGateway }));

vi.mock("@/lib/ai/systemPrompt", () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
}));

const getToolsForNames = vi.fn().mockReturnValue([]);
// The shared spy every mocked Tool's `handle` delegates to — kept as a
// 4-arg (name, orgId, botId, input) signature so assertions read the
// same as before chat.ts started calling tool.handle(...) directly
// instead of registry.runTool(name, ...) (custom actions, ADR 0022,
// aren't registry entries, so chat.ts now looks tools up from its own
// merged list rather than through the registry for every call).
const runTool = vi.fn();
function mockTool(name: string) {
  return { name, handle: (orgId: string, botId: string, input: unknown) => runTool(name, orgId, botId, input) };
}
vi.mock("@/lib/ai/tools/registry", () => ({ getToolsForNames }));
vi.mock("@/lib/ai/tools", () => ({}));
const getEnabledCustomActionTools = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/ai/tools/customAction", () => ({ getEnabledCustomActionTools }));

beforeEach(() => {
  vi.clearAllMocks();
  getToolsForNames.mockReturnValue([]);
  getEnabledCustomActionTools.mockResolvedValue([]);
  findFirstVersion.mockResolvedValue({ id: "version-1", tools: [] });
  createConversation.mockResolvedValue({ id: "conv-new", messages: [] });
  createMessage.mockResolvedValue({});
  findOrg.mockResolvedValue({ id: "org-1", anthropicApiKeyEncrypted: null });
  getModelGateway.mockReturnValue({ generateReply });
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

  it("ADR 0027: a paused conversation records the message but skips the model call entirely, returning a null reply", async () => {
    findUniqueConversation.mockResolvedValue({ id: "conv-1", botId: "bot-1", status: "paused", messages: [] });
    const { sendMessage } = await import("@/lib/ai/chat");

    const result = await sendMessage({ orgId: "org-1", botId: "bot-1", conversationId: "conv-1", userMessage: "hi" });

    expect(result).toEqual({ conversationId: "conv-1", reply: null });
    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "user", content: "hi" }) }),
    );
    expect(generateReply).not.toHaveBeenCalled();
    // Only the visitor's message was persisted — no assistant reply.
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it("a new conversation is created with the given source (ADR 0027), defaulting to widget", async () => {
    generateReply.mockResolvedValue({ content: [{ type: "text", text: "hi" }], stopReason: "end_turn" });
    const { sendMessage } = await import("@/lib/ai/chat");

    await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi", source: "playground" });

    expect(createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: "playground" }) }),
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
    getToolsForNames.mockReturnValue([mockTool("search_knowledge_base")]);
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
    getToolsForNames.mockReturnValue([mockTool("tool_a"), mockTool("tool_b")]);
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
    getToolsForNames.mockReturnValue([mockTool("search_knowledge_base")]);
    runTool.mockResolvedValue("some result");
    const { sendMessage } = await import("@/lib/ai/chat");

    const result = await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" });

    expect(generateReply).toHaveBeenCalledTimes(5);
    expect(result.reply).toBe("Sorry, I wasn't able to finish that — I'll get a human to help you instead.");
  });

  it("BYOA (ADR 0012): uses the managed key (no override) when the org has no key of its own", async () => {
    generateReply.mockResolvedValue({ content: [{ type: "text", text: "hi" }], stopReason: "end_turn" });
    const { sendMessage } = await import("@/lib/ai/chat");

    await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" });

    expect(getModelGateway).toHaveBeenCalledWith(undefined);
  });

  it("ADR 0022: merges enabled custom-action tools with the static registry's tools and can execute one", async () => {
    getEnabledCustomActionTools.mockResolvedValue([mockTool("custom_check_availability")]);
    generateReply
      .mockResolvedValueOnce({
        content: [{ type: "tool_use", id: "call_1", name: "custom_check_availability", input: { date: "2026-10-01" } }],
        stopReason: "tool_use",
      })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "10am is open." }], stopReason: "end_turn" });
    runTool.mockResolvedValue('{"status":"ok"}');
    const { sendMessage } = await import("@/lib/ai/chat");

    const result = await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "is 10am free" });

    expect(result.reply).toBe("10am is open.");
    expect(runTool).toHaveBeenCalledWith("custom_check_availability", "org-1", "bot-1", { date: "2026-10-01" });
  });

  it("BYOA (ADR 0012): decrypts and passes the org's own key when it has set one", async () => {
    findOrg.mockResolvedValue({ id: "org-1", anthropicApiKeyEncrypted: "encrypted-blob" });
    generateReply.mockResolvedValue({ content: [{ type: "text", text: "hi" }], stopReason: "end_turn" });
    const { sendMessage } = await import("@/lib/ai/chat");

    await sendMessage({ orgId: "org-1", botId: "bot-1", userMessage: "hi" });

    expect(getModelGateway).toHaveBeenCalledWith("decrypted:encrypted-blob");
  });
});
