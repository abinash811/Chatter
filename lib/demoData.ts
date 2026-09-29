import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { getOrCreateDraft, saveDraft, publishDraft, DEFAULT_APPEARANCE } from "@/lib/ai/botConfig";
import { DEFAULT_MODEL_ID, DEFAULT_TEMPERATURE } from "@/lib/ai/modelOptions";
import { PERSONA_TEMPLATES } from "@/lib/ai/personaTemplates";

// "Load sample data" (2026-09-27 user directive: seed realistic demo
// data across the app, not just per-feature test helpers) — a one-click
// way to see every screen populated without a real ANTHROPIC_API_KEY/
// VOYAGE_API_KEY. Every write here goes through the same tables and the
// same withOrgContext path a real chat turn or console action would use
// — it's fake *content*, not a fake data path — except where a step
// would need a live external API call (embeddings, Claude), matching
// the exact bypass tests/e2e/helpers.ts already uses for the same
// placeholder-key gap (seedKnowledgeEntry's zero vector,
// seedConversations' direct Conversation/Message/ToolCallLog writes).

const SAMPLE_QA: { question: string; answer: string }[] = [
  { question: "What are your shipping times?", answer: "Standard shipping takes 3-5 business days; express takes 1-2." },
  { question: "What's your return policy?", answer: "Returns are accepted within 30 days of delivery, unused and in original packaging." },
  { question: "Do you ship internationally?", answer: "Yes, to most countries — international orders typically take 7-14 business days." },
];

const SAMPLE_LEADS: { name: string; email: string; note: string }[] = [
  { name: "Priya Sharma", email: "priya@example.com", note: "Asked about bulk pricing for 50+ units." },
  { name: "Jordan Lee", email: "jordan@example.com", note: "Wanted a callback about a delayed order." },
];

async function seedKnowledge(orgId: string, botId: string): Promise<void> {
  const zeroVector = `[${Array(1536).fill(0).join(",")}]`;
  await withOrgContext(orgId, async (tx) => {
    for (const { question, answer } of SAMPLE_QA) {
      const source = await tx.knowledgeSource.create({ data: { orgId, botId, kind: "qa", title: question } });
      const chunk = await tx.knowledgeChunk.create({ data: { orgId, sourceId: source.id, content: answer } });
      await tx.$executeRaw`update knowledge_chunks set embedding = ${zeroVector}::vector where id = ${chunk.id}`;
    }
  });
}

async function seedLeads(orgId: string, botId: string): Promise<void> {
  await withOrgContext(orgId, (tx) =>
    tx.lead.createMany({ data: SAMPLE_LEADS.map((lead) => ({ orgId, botId, ...lead })) }),
  );
}

async function seedCustomAction(orgId: string, botId: string): Promise<void> {
  // Disabled by default — its URL is a placeholder, not a real endpoint,
  // so it stays off until the business owner points it at their own
  // webhook (guardrail #4 would otherwise degrade every call to handoff).
  await withOrgContext(orgId, (tx) =>
    tx.customAction.create({
      data: {
        orgId,
        botId,
        name: "check_appointment_availability",
        description: "Example only — replace the URL with your own booking system before enabling this.",
        method: "POST",
        url: "https://api.example.com/availability",
        enabled: false,
        inputSchema: {
          type: "object",
          properties: { date: { type: "string", description: "the date to check" } },
          required: ["date"],
          additionalProperties: false,
        },
      },
    }),
  );
}

async function seedConversations(orgId: string, botId: string, configVersionId: string): Promise<void> {
  const resolved = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.createMany({
      data: [
        { orgId, conversationId: resolved.id, role: "user", content: "What's your return policy?" },
        {
          orgId,
          conversationId: resolved.id,
          role: "assistant",
          content: "Returns are accepted within 30 days of delivery, unused and in original packaging.",
        },
      ],
    }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.toolCallLog.create({
      data: {
        orgId,
        conversationId: resolved.id,
        toolName: "search_knowledge_base",
        input: { query: "return policy" },
        output: "Q: What's your return policy?\nA: Returns are accepted within 30 days of delivery, unused and in original packaging.",
      },
    }),
  );

  const withIssue = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.createMany({
      data: [
        { orgId, conversationId: withIssue.id, role: "user", content: "Where is my order #ORD5821?" },
        {
          orgId,
          conversationId: withIssue.id,
          role: "assistant",
          content: "I've noted your order number and will connect you with a human.",
        },
      ],
    }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.toolCallLog.create({
      data: {
        orgId,
        conversationId: withIssue.id,
        toolName: "check_order_status",
        input: { orderNumber: "ORD5821" },
        output: JSON.stringify({
          status: "handoff_required",
          reason: "No Shopify store connected for this bot yet.",
          collected: { orderNumber: "ORD5821" },
        }),
      },
    }),
  );
}

// Creates a fully populated example bot — persona, published config,
// knowledge, leads, a (disabled) custom action, and two sample
// conversations — so every console screen has real content to look at
// without needing a live Claude/Voyage key. Returns the new bot's id.
export async function createDemoBot(orgId: string): Promise<string> {
  const bot = await withOrgContext(orgId, (tx) =>
    tx.bot.create({ data: { orgId, name: "Demo Support Bot (Sample)" } }),
  );

  const draft = await getOrCreateDraft(orgId, bot.id);
  await saveDraft(orgId, bot.id, {
    persona: PERSONA_TEMPLATES.find((t) => t.id === "support")!.persona,
    guardrails: "Never quote a final shipping cost — always say it's calculated at checkout.",
    tools: ["search_knowledge_base", "collect_lead", "check_order_status"],
    appearance: DEFAULT_APPEARANCE,
    model: DEFAULT_MODEL_ID,
    temperature: DEFAULT_TEMPERATURE,
  });
  await publishDraft(orgId, bot.id);

  await seedKnowledge(orgId, bot.id);
  await seedLeads(orgId, bot.id);
  await seedCustomAction(orgId, bot.id);
  await seedConversations(orgId, bot.id, draft.id);
  await getOrCreateBotPublicKey(orgId, bot.id);

  return bot.id;
}
