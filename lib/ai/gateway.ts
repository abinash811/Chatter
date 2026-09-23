// Model gateway (ADR 0002): every call to an LLM goes through this
// interface, never a provider SDK directly at the call site. Claude is
// the default/primary implementation; swapping providers or Claude model
// tiers later means adding an implementation here, not touching callers.
//
// Content is block-based (not a flat string) because a real tool-use loop
// requires correlating each tool call with its result by ID — Claude,
// OpenAI, and Gemini all have an equivalent concept (tool_use_id /
// tool_call_id / functionCall-functionResponse pairing), so this shape
// stays generic across providers without losing that correctness.

export interface ModelTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ModelContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; toolUseId: string; content: string };

export interface ModelMessage {
  role: "user" | "assistant";
  content: ModelContentBlock[];
}

export interface GenerateReplyParams {
  /** Stable, cacheable block: persona + template + guardrails. */
  cachedSystemPrompt: string;
  messages: ModelMessage[];
  tools?: ModelTool[];
}

export interface GenerateReplyResult {
  content: ModelContentBlock[];
  stopReason: string;
}

export interface ModelGateway {
  generateReply(params: GenerateReplyParams): Promise<GenerateReplyResult>;
}

export function getModelGateway(): ModelGateway {
  // Only implementation for now; a provider/tier switch is a new
  // implementation + a change here, not a rewrite of callers.
  return new ClaudeGateway();
}

class ClaudeGateway implements ModelGateway {
  private client: import("@anthropic-ai/sdk").default;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Anthropic = require("@anthropic-ai/sdk").default;
    this.client = new Anthropic();
  }

  async generateReply(params: GenerateReplyParams): Promise<GenerateReplyResult> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: params.cachedSystemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content.map(toAnthropicBlock),
      })),
      tools: params.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
        strict: true,
      })),
    });

    return {
      content: response.content.map(fromAnthropicBlock),
      stopReason: response.stop_reason ?? "end_turn",
    };
  }
}

// --- Anthropic content-block <-> generic ModelContentBlock mapping ---
// Isolated here so provider-specific block shapes never leak past this file.

function toAnthropicBlock(block: ModelContentBlock) {
  switch (block.type) {
    case "text":
      return { type: "text" as const, text: block.text };
    case "tool_use":
      return { type: "tool_use" as const, id: block.id, name: block.name, input: block.input };
    case "tool_result":
      return {
        type: "tool_result" as const,
        tool_use_id: block.toolUseId,
        content: block.content,
      };
  }
}

function fromAnthropicBlock(block: {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}): ModelContentBlock {
  if (block.type === "text") return { type: "text", text: block.text ?? "" };
  if (block.type === "tool_use") {
    return { type: "tool_use", id: block.id!, name: block.name!, input: block.input ?? {} };
  }
  throw new Error(`Unexpected content block type from Claude: ${block.type}`);
}
