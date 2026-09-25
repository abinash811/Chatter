import { describe, it, expect, vi, beforeEach } from "vitest";

// gateway.ts lazily requires @anthropic-ai/sdk inside the ClaudeGateway
// constructor (so importing this module never needs ANTHROPIC_API_KEY set
// unless a gateway is actually instantiated) — mock the SDK's default
// export as a class whose instances expose messages.create.
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  // A regular function, not an arrow — arrow functions can never be
  // called with `new`, and ClaudeGateway does `new Anthropic()`.
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: createMock } };
  }),
}));

beforeEach(() => {
  createMock.mockReset();
});

describe("ClaudeGateway (the exact Anthropic SDK boundary — getting this wrong breaks every conversation)", () => {
  it("maps a ModelMessage/tool request into the SDK's call shape, with prompt caching on the system block", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "hello" }],
      stop_reason: "end_turn",
    });
    const { getModelGateway } = await import("@/lib/ai/gateway");
    const gateway = getModelGateway();

    await gateway.generateReply({
      cachedSystemPrompt: "You are a helpful bot.",
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      tools: [{ name: "search", description: "search things", inputSchema: { type: "object" } }],
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-5",
        system: [{ type: "text", text: "You are a helpful bot.", cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        tools: [
          expect.objectContaining({
            name: "search",
            description: "search things",
            input_schema: { type: "object" },
            strict: true,
          }),
        ],
      }),
    );
  });

  it("maps tool_use and tool_result blocks correctly, preserving the id that correlates a call with its result", async () => {
    createMock.mockResolvedValue({ content: [], stop_reason: "tool_use" });
    const { getModelGateway } = await import("@/lib/ai/gateway");
    const gateway = getModelGateway();

    await gateway.generateReply({
      cachedSystemPrompt: "x",
      messages: [
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "call_1", name: "search", input: { q: "socks" } }],
        },
        {
          role: "user",
          content: [{ type: "tool_result", toolUseId: "call_1", content: "found 3 results" }],
        },
      ],
    });

    const call = createMock.mock.calls[0][0];
    expect(call.messages[0].content[0]).toEqual({ type: "tool_use", id: "call_1", name: "search", input: { q: "socks" } });
    expect(call.messages[1].content[0]).toEqual({
      type: "tool_result",
      tool_use_id: "call_1",
      content: "found 3 results",
    });
  });

  it("maps the SDK's response content and stop_reason back to the generic shape", async () => {
    createMock.mockResolvedValue({
      content: [
        { type: "text", text: "Let me check that." },
        { type: "tool_use", id: "call_2", name: "search", input: { q: "hi" } },
      ],
      stop_reason: "tool_use",
    });
    const { getModelGateway } = await import("@/lib/ai/gateway");
    const result = await getModelGateway().generateReply({
      cachedSystemPrompt: "x",
      messages: [],
    });

    expect(result.stopReason).toBe("tool_use");
    expect(result.content).toEqual([
      { type: "text", text: "Let me check that." },
      { type: "tool_use", id: "call_2", name: "search", input: { q: "hi" } },
    ]);
  });

  it("defaults stopReason to end_turn when the SDK omits it", async () => {
    createMock.mockResolvedValue({ content: [], stop_reason: null });
    const { getModelGateway } = await import("@/lib/ai/gateway");
    const result = await getModelGateway().generateReply({ cachedSystemPrompt: "x", messages: [] });
    expect(result.stopReason).toBe("end_turn");
  });

  it("throws on a content block type Claude isn't expected to return", async () => {
    createMock.mockResolvedValue({ content: [{ type: "some_future_block_type" }], stop_reason: "end_turn" });
    const { getModelGateway } = await import("@/lib/ai/gateway");
    await expect(getModelGateway().generateReply({ cachedSystemPrompt: "x", messages: [] })).rejects.toThrow(
      /Unexpected content block type/,
    );
  });
});
