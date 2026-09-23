// Model gateway (ADR 0002): every call to an LLM goes through this
// interface, never a provider SDK directly at the call site. Claude is
// the default/primary implementation; swapping providers or Claude model
// tiers later means adding an implementation here, not touching callers.

export interface ModelTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ModelMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateReplyParams {
  /** Stable, cacheable block: persona + template + guardrails. */
  cachedSystemPrompt: string;
  messages: ModelMessage[];
  tools?: ModelTool[];
}

export interface GenerateReplyResult {
  text: string;
  stopReason: string;
  toolUse?: { name: string; input: Record<string, unknown> };
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
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: params.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
        strict: true,
      })),
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    const toolUseBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as { type: "tool_use"; name: string; input: Record<string, unknown> } | undefined;

    return {
      text: textBlock?.text ?? "",
      stopReason: response.stop_reason ?? "end_turn",
      toolUse: toolUseBlock && { name: toolUseBlock.name, input: toolUseBlock.input },
    };
  }
}
