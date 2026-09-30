// Pure data + parsing, zero server deps — same split as
// appearanceOptions.ts (a client component needs the defaults/types
// without pulling lib/db.ts's PrismaClient into the browser bundle).
// ADR 0029 — Guardrails Phase 1 (rate limiting + spam detection).

export interface AbuseProtectionConfig {
  rateLimitEnabled: boolean;
  /** Visitor messages allowed within `rateLimitWindowMinutes`. */
  rateLimitMaxMessages: number;
  rateLimitWindowMinutes: number;
  /** Shown to the visitor (and persisted as the assistant's reply)
   * instead of calling the model, once the cap is hit. */
  rateLimitMessage: string;
  spamDetectionEnabled: boolean;
  /** Free-text guidance fed to the classification call — mirrors
   * Chatbase's own "customizable up to 2,000 characters" field. */
  spamGuidance: string;
}

// Off by default — an empty `{}` (every existing bot, before this ADR)
// parses to this, so shipping this feature changes no existing bot's
// behavior until a business owner opts in.
export const DEFAULT_ABUSE_PROTECTION: AbuseProtectionConfig = {
  rateLimitEnabled: false,
  rateLimitMaxMessages: 20,
  rateLimitWindowMinutes: 1,
  rateLimitMessage: "You're sending messages a bit fast — please wait a moment and try again.",
  spamDetectionEnabled: false,
  spamGuidance:
    "Unsolicited commercial promotions, scams, or repetitive gibberish unrelated to this business.",
};

// Matches parseAppearance's own shape (lib/ai/botConfig.ts) — lenient on
// missing/malformed fields, never throws on stored JSON from an older
// shape.
export function parseAbuseProtection(value: unknown): AbuseProtectionConfig {
  const v = (value ?? {}) as Partial<AbuseProtectionConfig>;
  return {
    rateLimitEnabled: v.rateLimitEnabled === true,
    rateLimitMaxMessages:
      typeof v.rateLimitMaxMessages === "number" && v.rateLimitMaxMessages > 0
        ? Math.floor(v.rateLimitMaxMessages)
        : DEFAULT_ABUSE_PROTECTION.rateLimitMaxMessages,
    rateLimitWindowMinutes:
      typeof v.rateLimitWindowMinutes === "number" && v.rateLimitWindowMinutes > 0
        ? Math.floor(v.rateLimitWindowMinutes)
        : DEFAULT_ABUSE_PROTECTION.rateLimitWindowMinutes,
    rateLimitMessage:
      typeof v.rateLimitMessage === "string" && v.rateLimitMessage.trim().length > 0
        ? v.rateLimitMessage
        : DEFAULT_ABUSE_PROTECTION.rateLimitMessage,
    spamDetectionEnabled: v.spamDetectionEnabled === true,
    spamGuidance:
      typeof v.spamGuidance === "string" && v.spamGuidance.trim().length > 0
        ? v.spamGuidance.slice(0, 2000)
        : DEFAULT_ABUSE_PROTECTION.spamGuidance,
  };
}

// Chatbase's own documented checkpoint schedule (docs/research/
// competitive-landscape.md's 2026-09-28 update) — bounds the added
// classification-call cost to a handful per conversation, not one per
// turn.
export const SPAM_CHECK_MESSAGE_COUNTS = [2, 4, 8, 16] as const;
