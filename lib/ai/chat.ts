import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getModelGateway, type ModelMessage } from "@/lib/ai/gateway";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { getToolsForNames } from "@/lib/ai/tools/registry";
import { getEnabledCustomActionTools } from "@/lib/ai/tools/customAction";
import { getEnabledWidgetTools, parseRenderWidgetPayload, type RenderWidgetPayload } from "@/lib/ai/tools/widget";
import { setConversationStatus } from "@/lib/conversations";
import { parseAbuseProtection } from "@/lib/ai/abuseProtectionOptions";
import { checkRateLimit, isSpamCheckpoint, classifyRecentMessagesAsSpam } from "@/lib/ai/abuseProtection";
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
  /** ADR 0027 — only meaningful when starting a new conversation; an
   * existing conversation keeps the source it was created with. */
  source?: "widget" | "playground";
}

export interface SendMessageResult {
  conversationId: string;
  /** ADR 0027 — null when the conversation is paused: the visitor's
   * message is still recorded (below), but no AI reply is generated,
   * matching Chatbase's own documented pause behavior exactly. */
  reply: string | null;
  /** ADR 0028 — set when this turn triggered an in-chat widget (a form
   * to render inline, alongside `reply`'s accompanying text). The
   * visitor's filled-in answers come back as their own next chat
   * message, not a special endpoint. */
  widget?: RenderWidgetPayload;
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
          data: { orgId, botId, configVersionId: publishedVersion.id, source: params.source ?? "widget" },
          include: { messages: true },
        }),
      );

  // The system prompt always reflects this bot's current published
  // version — not the conversation's pinned configVersionId. Pinning
  // matters for *behavioral* continuity within a turn's tool loop, not
  // for which persona greets a returning visitor; revisit if that
  // distinction ever needs to be stricter.
  const systemPrompt = await buildSystemPrompt(orgId, botId);
  // Custom (business-defined) actions aren't in publishedVersion.tools —
  // they're not registry entries and aren't draft/publish-gated (ADR
  // 0022); every enabled one for this bot is always in the mix.
  const staticTools = getToolsForNames(publishedVersion.tools as string[]);
  const customTools = await getEnabledCustomActionTools(orgId, botId);
  // Same "not draft/publish-gated" precedent as custom actions (ADR
  // 0028, following ADR 0022) — every enabled widget is always in the
  // mix, not a publishedVersion.tools entry.
  const widgetTools = await getEnabledWidgetTools(orgId, botId);
  const tools = [...staticTools, ...customTools, ...widgetTools];
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

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

  // ADR 0027: a paused conversation still records the visitor's message
  // (just did, above) but generates no AI reply — matches Chatbase's own
  // documented pause behavior exactly ("stops receiving AI replies but
  // still records incoming messages"). No model call, no tool loop.
  if (conversation.status === "paused") {
    return { conversationId: conversation.id, reply: null };
  }

  // Guardrails Phase 1 (ADR 0029) — off by default; both checks no-op
  // (no extra DB/model call) unless a business owner has opted in.
  const abuseProtection = parseAbuseProtection(publishedVersion.abuseProtection);
  const priorUserMessages = conversation.messages.filter((m) => m.role === "user");

  const rateLimit = await checkRateLimit(orgId, conversation.id, abuseProtection);
  if (rateLimit.limited) {
    await withOrgContext(orgId, (tx) =>
      tx.message.create({
        data: { orgId, conversationId: conversation.id, role: "assistant", content: rateLimit.message },
      }),
    );
    return { conversationId: conversation.id, reply: rateLimit.message };
  }

  // BYOA (ADR 0012): an org's own key if they've set one, else the
  // gateway falls back to our managed ANTHROPIC_API_KEY.
  const org = await withOrgContext(orgId, (tx) => tx.org.findUniqueOrThrow({ where: { id: orgId } }));
  const apiKey = org.anthropicApiKeyEncrypted ? decrypt(org.anthropicApiKeyEncrypted) : undefined;
  const gateway = getModelGateway(apiKey);

  if (abuseProtection.spamDetectionEnabled && isSpamCheckpoint(priorUserMessages.length + 1)) {
    const recentUserMessages = [...priorUserMessages.map((m) => m.content), userMessage].slice(-5);
    const isSpam = await classifyRecentMessagesAsSpam(gateway, recentUserMessages, abuseProtection.spamGuidance);
    if (isSpam) {
      // Same setConversationStatus a human clicking "Pause" already
      // calls (ADR 0027) — the first non-human caller of that function.
      // No reply this turn either, matching the paused-conversation
      // branch above exactly, so every future message on this
      // conversation hits that same code path automatically.
      await setConversationStatus(orgId, botId, conversation.id, "paused");
      return { conversationId: conversation.id, reply: null };
    }
  }

  let finalText = "";
  // ADR 0028 — the last widget triggered this turn, if any. The model's
  // own next turn (after seeing the tool result) naturally produces the
  // accompanying text ("Sure, please fill this out:"), so no early-exit
  // branching is needed in the loop below — this just captures the
  // structured signal alongside whatever finalText the loop settles on.
  let widget: RenderWidgetPayload | undefined;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await gateway.generateReply({
      cachedSystemPrompt: systemPrompt,
      messages: history,
      tools,
      model: publishedVersion.model,
      temperature: publishedVersion.temperature,
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
        const tool = toolsByName.get(block.name);
        if (!tool) throw new Error(`Unknown tool "${block.name}"`);
        const content = await tool.handle(orgId, botId, block.input, conversation.id);
        await withOrgContext(orgId, (tx) =>
          tx.toolCallLog.create({
            data: {
              orgId,
              conversationId: conversation.id,
              toolName: block.name,
              input: block.input as Prisma.InputJsonValue,
              output: content,
            },
          }),
        );
        const renderWidget = parseRenderWidgetPayload(content);
        if (renderWidget) widget = renderWidget;
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

  return { conversationId: conversation.id, reply: finalText, widget };
}
