import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_ABUSE_PROTECTION, parseAbuseProtection } from "@/lib/ai/abuseProtectionOptions";

// ADR 0029 — Guardrails Phase 1. Every dependency is mocked at the
// module boundary, same discipline as tests/unit/lib/ai/chat.test.ts.

const countMessages = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ message: { count: countMessages } })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseAbuseProtection", () => {
  it("an empty stored value parses to fully-disabled defaults — no behavior change for an existing bot", () => {
    expect(parseAbuseProtection({})).toEqual(DEFAULT_ABUSE_PROTECTION);
    expect(parseAbuseProtection(null)).toEqual(DEFAULT_ABUSE_PROTECTION);
  });

  it("ignores an invalid stored shape field-by-field rather than throwing", () => {
    const result = parseAbuseProtection({
      rateLimitEnabled: true,
      rateLimitMaxMessages: -5,
      rateLimitWindowMinutes: "not a number",
      spamGuidance: 12345,
    });
    expect(result.rateLimitEnabled).toBe(true);
    expect(result.rateLimitMaxMessages).toBe(DEFAULT_ABUSE_PROTECTION.rateLimitMaxMessages);
    expect(result.rateLimitWindowMinutes).toBe(DEFAULT_ABUSE_PROTECTION.rateLimitWindowMinutes);
    expect(result.spamGuidance).toBe(DEFAULT_ABUSE_PROTECTION.spamGuidance);
  });

  it("caps spamGuidance at 2000 characters, matching Chatbase's own documented limit", () => {
    const long = "x".repeat(3000);
    expect(parseAbuseProtection({ spamGuidance: long }).spamGuidance).toHaveLength(2000);
  });
});

describe("checkRateLimit", () => {
  it("never queries the database when rate limiting is disabled", async () => {
    const { checkRateLimit } = await import("@/lib/ai/abuseProtection");

    const result = await checkRateLimit("org-1", "conv-1", DEFAULT_ABUSE_PROTECTION);

    expect(result.limited).toBe(false);
    expect(countMessages).not.toHaveBeenCalled();
  });

  it("blocks once the message count within the window exceeds the configured cap", async () => {
    countMessages.mockResolvedValue(21);
    const config = { ...DEFAULT_ABUSE_PROTECTION, rateLimitEnabled: true, rateLimitMaxMessages: 20 };
    const { checkRateLimit } = await import("@/lib/ai/abuseProtection");

    const result = await checkRateLimit("org-1", "conv-1", config);

    expect(result.limited).toBe(true);
    expect(result.message).toBe(config.rateLimitMessage);
    expect(countMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ conversationId: "conv-1", role: "user" }),
      }),
    );
  });

  it("does not block at or under the cap", async () => {
    countMessages.mockResolvedValue(20);
    const config = { ...DEFAULT_ABUSE_PROTECTION, rateLimitEnabled: true, rateLimitMaxMessages: 20 };
    const { checkRateLimit } = await import("@/lib/ai/abuseProtection");

    const result = await checkRateLimit("org-1", "conv-1", config);

    expect(result.limited).toBe(false);
  });
});

describe("isSpamCheckpoint", () => {
  it("is true only at Chatbase's own documented message-count checkpoints", async () => {
    const { isSpamCheckpoint } = await import("@/lib/ai/abuseProtection");

    expect(isSpamCheckpoint(2)).toBe(true);
    expect(isSpamCheckpoint(4)).toBe(true);
    expect(isSpamCheckpoint(8)).toBe(true);
    expect(isSpamCheckpoint(16)).toBe(true);
    expect(isSpamCheckpoint(1)).toBe(false);
    expect(isSpamCheckpoint(3)).toBe(false);
    expect(isSpamCheckpoint(17)).toBe(false);
  });
});

describe("classifyRecentMessagesAsSpam", () => {
  it("flags spam only on an exact SPAM verdict from the classifier", async () => {
    const generateReply = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "SPAM" }], stopReason: "end_turn" });
    const { classifyRecentMessagesAsSpam } = await import("@/lib/ai/abuseProtection");

    const result = await classifyRecentMessagesAsSpam({ generateReply }, ["buy cheap watches now"], "no spam");

    expect(result).toBe(true);
    expect(generateReply).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5-20251001" }),
    );
  });

  it("degrades to not-spam on an ambiguous or malformed classifier response — never takes a conversation offline on a hiccup", async () => {
    const generateReply = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "uh, maybe?" }], stopReason: "end_turn" });
    const { classifyRecentMessagesAsSpam } = await import("@/lib/ai/abuseProtection");

    const result = await classifyRecentMessagesAsSpam({ generateReply }, ["hello"], "no spam");

    expect(result).toBe(false);
  });

  it("treats a response with no text block as not-spam", async () => {
    const generateReply = vi.fn().mockResolvedValue({ content: [], stopReason: "end_turn" });
    const { classifyRecentMessagesAsSpam } = await import("@/lib/ai/abuseProtection");

    const result = await classifyRecentMessagesAsSpam({ generateReply }, ["hello"], "no spam");

    expect(result).toBe(false);
  });
});
