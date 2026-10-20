// Guardrails Phase 1 enforcement (ADR 0029) — rate limiting + spam
// detection. Called from lib/ai/chat.ts's sendMessage, before the main
// model call, for every turn of a bot with either mechanism enabled.
// Deliberately generic (no vertical logic — guardrail #2 / bot-engine
// rule #3): every check here operates on the conversation/message shape
// alone, never on what industry the bot serves.

import { withOrgContext } from "@/lib/db";
import type { ModelGateway } from "@/lib/ai/gateway";
import { SPAM_CHECK_MESSAGE_COUNTS, type AbuseProtectionConfig } from "@/lib/ai/abuseProtectionOptions";
import { MODEL_TIER_OPTIONS } from "@/lib/ai/modelOptions";

// Always Haiku, regardless of the bot's own configured tier — a
// classification call is a fixed, cheap, internal operation, not a
// user-facing reply, so it shouldn't inherit a bot's Sonnet/Opus choice.
const SPAM_CLASSIFIER_MODEL_ID = MODEL_TIER_OPTIONS.find((m) => m.id.includes("haiku"))!.id;

export interface RateLimitResult {
  limited: boolean;
  message: string;
}

// Per-conversation, not per-device (ADR 0029's Context explains why: no
// persistent visitor identity exists yet). Counts real Message rows —
// no new in-memory or cross-request state, matching chat.ts's own
// "stateless by design" note.
export async function checkRateLimit(
  orgId: string,
  conversationId: string,
  config: AbuseProtectionConfig,
): Promise<RateLimitResult> {
  if (!config.rateLimitEnabled) return { limited: false, message: "" };

  const windowStart = new Date(Date.now() - config.rateLimitWindowMinutes * 60_000);
  const count = await withOrgContext(orgId, (tx) =>
    tx.message.count({
      where: { conversationId, role: "user", createdAt: { gte: windowStart } },
    }),
  );

  return count > config.rateLimitMaxMessages
    ? { limited: true, message: config.rateLimitMessage }
    : { limited: false, message: "" };
}

// Only true at Chatbase's own documented checkpoints — every other
// turn, this is a plain number comparison, no DB/model call at all.
export function isSpamCheckpoint(userMessageCount: number): boolean {
  return (SPAM_CHECK_MESSAGE_COUNTS as readonly number[]).includes(userMessageCount);
}

// A real classification call (bot-engine rule #1 — implements the
// existing ModelGateway interface, no bypass), not a keyword list: asks
// a cheap model for a strict two-word verdict given the bot's own
// configured guidance. Never throws on an ambiguous/malformed response —
// defaults to "not spam" so a classification hiccup can never itself
// take a conversation offline (guardrail #4's spirit: degrade safely).
export async function classifyRecentMessagesAsSpam(
  gateway: ModelGateway,
  recentUserMessages: string[],
  guidance: string,
): Promise<boolean> {
  const result = await gateway.generateReply({
    cachedSystemPrompt:
      `You are a spam/abuse classifier for a customer-support chat widget. ` +
      `Given the visitor's most recent messages, respond with exactly one word: ` +
      `"SPAM" if they match this business's own guidance below, or "OK" otherwise. ` +
      `Never explain your answer.\n\nGuidance: ${guidance}`,
    messages: [{ role: "user", content: [{ type: "text", text: recentUserMessages.join("\n") }] }],
    model: SPAM_CLASSIFIER_MODEL_ID,
  });
  const textBlock = result.content.find((b) => b.type === "text");
  const verdict = textBlock?.type === "text" ? textBlock.text.trim().toUpperCase() : "";
  return verdict.startsWith("SPAM");
}
