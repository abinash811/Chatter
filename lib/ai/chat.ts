import { withOrgContext } from "@/lib/db";
import { getModelGateway, type ModelMessage } from "@/lib/ai/gateway";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { getToolsForNames, runTool } from "@/lib/ai/tools/registry";
import "@/lib/ai/tools";

// Per Claude Agent SDK guidance (docs/research/competitive-landscape.md):
// implement max iteration guards on any agentic loop.
const MAX_TOOL_ITERATIONS = 5;

export interface SendMessageParams {
  orgId: string;
  botId: string;
  /** Omit to start a new conversation. */
  conversationId?: string;
  userMessage: string;
}

export interface SendMessageResult {
  conversationId: string;
  reply: string;
}

// Stateless by design (README.md, docs/architecture.md's scaling note):
// every call loads what it needs from Postgres and persists what
// changed — nothing lives in server memory between requests, so any
// instance can handle any request.
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { orgId, botId, userMessage } = params;

  const publishedVersion = await withOrgContext(orgId, (tx) =>
    tx.botConfigVersion.findFirst({
      where: { botId, status: "published" },
      orderBy: { version: "desc" },
    }),
  );
  if (!publishedVersion) {
    throw new Error(`Bot ${botId} has no published config — cannot serve this bot yet.`);
  }

  // RLS already prevents reading another org's conversation; this extra
  // check closes the narrower case of a visitor holding one bot's botKey
  // supplying a conversationId that belongs to a *different* bot in the
  // same org.
  const conversation = params.conversationId
    ? await withOrgContext(orgId, async (tx) => {
        const found = await tx.conversation.findUniqueOrThrow({
          where: { id: params.conversationId! },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
        if (found.botId !== botId) {
          throw new Error("conversationId does not belong to this bot");
        }
        return found;
      })
    : await withOrgContext(orgId, (tx) =>
        tx.conversation.create({
          data: { orgId, botId, configVersionId: publishedVersion.id },
          include: { messages: true },
        }),
      );

  // The system prompt always reflects this bot's current published
  // version — not the conversation's pinned configVersionId. Pinning
  // matters for *behavioral* continuity within a turn's tool loop, not
  // for which persona greets a returning visitor; revisit if that
  // distinction ever needs to be stricter.
  const systemPrompt = await buildSystemPrompt(orgId, botId);
  const tools = getToolsForNames(publishedVersion.tools as string[]);

  const history: ModelMessage[] = conversation.messages.map((m) => ({
    role: m.role,
    content: [{ type: "text", text: m.content }],
  }));
  history.push({ role: "user", content: [{ type: "text", text: userMessage }] });

  await withOrgContext(orgId, (tx) =>
    tx.message.create({
      data: { orgId, conversationId: conversation.id, role: "user", content: userMessage },
    }),
  );

  const gateway = getModelGateway();
  let finalText = "";

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await gateway.generateReply({
      cachedSystemPrompt: systemPrompt,
      messages: history,
      tools,
    });

    history.push({ role: "assistant", content: result.content });

    const toolUseBlocks = result.content.filter((b) => b.type === "tool_use");
    if (result.stopReason !== "tool_use" || toolUseBlocks.length === 0) {
      const textBlock = result.content.find((b) => b.type === "text");
      finalText = textBlock?.type === "text" ? textBlock.text : "";
      break;
    }

    // Parallel tool calls: run them concurrently, return all results in
    // one user message — required so the model isn't trained to stop
    // making parallel calls (see the tool-use pattern note in the
    // Claude API skill). Every call is logged regardless of whether its
    // result ends up shaping the final answer — guardrail #6.
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        if (block.type !== "tool_use") throw new Error("unreachable");
        const content = await runTool(block.name, orgId, botId, block.input);
        await withOrgContext(orgId, (tx) =>
          tx.toolCallLog.create({
            data: {
              orgId,
              conversationId: conversation.id,
              toolName: block.name,
              input: block.input,
              output: content,
            },
          }),
        );
        return { type: "tool_result" as const, toolUseId: block.id, content };
      }),
    );
    history.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText =
      "Sorry, I wasn't able to finish that — I'll get a human to help you instead.";
  }

  await withOrgContext(orgId, (tx) =>
    tx.message.create({
      data: { orgId, conversationId: conversation.id, role: "assistant", content: finalText },
    }),
  );

  return { conversationId: conversation.id, reply: finalText };
}
