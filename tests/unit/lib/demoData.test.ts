import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  botCreate,
  knowledgeSourceCreate,
  knowledgeChunkCreate,
  executeRaw,
  leadCreateMany,
  customActionCreate,
  conversationCreate,
  messageCreateMany,
  toolCallLogCreate,
  getOrCreateBotPublicKey,
} = vi.hoisted(() => ({
  botCreate: vi.fn(),
  knowledgeSourceCreate: vi.fn(),
  knowledgeChunkCreate: vi.fn(),
  executeRaw: vi.fn(),
  leadCreateMany: vi.fn(),
  customActionCreate: vi.fn(),
  conversationCreate: vi.fn(),
  messageCreateMany: vi.fn(),
  toolCallLogCreate: vi.fn(),
  getOrCreateBotPublicKey: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({
      bot: { create: botCreate },
      knowledgeSource: { create: knowledgeSourceCreate },
      knowledgeChunk: { create: knowledgeChunkCreate },
      lead: { createMany: leadCreateMany },
      customAction: { create: customActionCreate },
      conversation: { create: conversationCreate },
      message: { createMany: messageCreateMany },
      toolCallLog: { create: toolCallLogCreate },
      $executeRaw: executeRaw,
    }),
  ),
  getOrCreateBotPublicKey,
}));

const { getOrCreateDraft, saveDraft, publishDraft } = vi.hoisted(() => ({
  getOrCreateDraft: vi.fn(),
  saveDraft: vi.fn(),
  publishDraft: vi.fn(),
}));
vi.mock("@/lib/ai/botConfig", () => ({
  getOrCreateDraft,
  saveDraft,
  publishDraft,
  DEFAULT_APPEARANCE: { greeting: "hi", accentColor: "test-accent", avatarEmoji: "💬", position: "bottom-right" },
  DEFAULT_ABUSE_PROTECTION: {
    rateLimitEnabled: false,
    rateLimitMaxMessages: 20,
    rateLimitWindowMinutes: 1,
    rateLimitMessage: "test-limit-message",
    spamDetectionEnabled: false,
    spamGuidance: "test-guidance",
  },
}));

import { createDemoBot } from "@/lib/demoData";

beforeEach(() => {
  vi.clearAllMocks();
  botCreate.mockResolvedValue({ id: "demo-bot-1" });
  knowledgeSourceCreate.mockResolvedValue({ id: "source-1" });
  knowledgeChunkCreate.mockResolvedValue({ id: "chunk-1" });
  conversationCreate.mockResolvedValue({ id: "conv-1" });
  getOrCreateDraft.mockResolvedValue({ id: "version-1" });
});

describe("createDemoBot", () => {
  it("creates a bot and returns its id", async () => {
    const botId = await createDemoBot("org-1");
    expect(botId).toBe("demo-bot-1");
    expect(botCreate).toHaveBeenCalledWith({ data: { orgId: "org-1", name: "Demo Support Bot (Sample)" } });
  });

  it("saves and publishes a draft with search_knowledge_base and collect_lead enabled", async () => {
    await createDemoBot("org-1");

    expect(saveDraft).toHaveBeenCalledWith(
      "org-1",
      "demo-bot-1",
      expect.objectContaining({
        tools: expect.arrayContaining(["search_knowledge_base", "collect_lead"]),
      }),
    );
    expect(publishDraft).toHaveBeenCalledWith("org-1", "demo-bot-1");
  });

  it("seeds knowledge Q&A entries with a placeholder embedding, not a real API call", async () => {
    await createDemoBot("org-1");

    expect(knowledgeSourceCreate).toHaveBeenCalledTimes(3);
    expect(knowledgeChunkCreate).toHaveBeenCalledTimes(3);
    expect(executeRaw).toHaveBeenCalledTimes(3);
  });

  it("seeds sample leads in one batch", async () => {
    await createDemoBot("org-1");

    expect(leadCreateMany).toHaveBeenCalledTimes(1);
    const { data } = leadCreateMany.mock.calls[0][0];
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ orgId: "org-1", botId: "demo-bot-1" });
  });

  it("seeds a custom action that is disabled by default (placeholder URL)", async () => {
    await createDemoBot("org-1");

    expect(customActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ enabled: false }) }),
    );
  });

  it("seeds two conversations, each with messages and a logged tool call", async () => {
    await createDemoBot("org-1");

    expect(conversationCreate).toHaveBeenCalledTimes(2);
    expect(messageCreateMany).toHaveBeenCalledTimes(2);
    expect(toolCallLogCreate).toHaveBeenCalledTimes(2);
    expect(toolCallLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ toolName: "check_order_status" }) }),
    );
  });

  it("provisions a widget public key for the new bot", async () => {
    await createDemoBot("org-1");
    expect(getOrCreateBotPublicKey).toHaveBeenCalledWith("org-1", "demo-bot-1");
  });
});
