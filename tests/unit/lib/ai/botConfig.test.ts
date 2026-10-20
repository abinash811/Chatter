import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ withOrgContext: vi.fn() }));

import { parseAppearance, DEFAULT_APPEARANCE } from "@/lib/ai/botConfig";

describe("parseAppearance", () => {
  it("returns all defaults for an empty/null value (a brand-new draft's seed)", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance({})).toEqual(DEFAULT_APPEARANCE);
  });

  it("passes through a fully valid stored appearance untouched", () => {
    const stored = {
      greeting: "Yo!",
      accentColor: "#123456", // allow-raw-color — test fixture data, not rendered UI
      avatarEmoji: "🤖",
      position: "bottom-left",
      suggestedReplies: ["What are your hours?", "Track my order"],
      autoOpenAfterSeconds: 15,
    };
    expect(parseAppearance(stored)).toEqual(stored);
  });

  it("falls back to the default avatar for a value outside the curated set", () => {
    // Defends against a stale/tampered stored value (e.g. an emoji
    // removed from AVATAR_EMOJI_OPTIONS after being saved) rendering as
    // whatever arbitrary string was stored instead of a known-good icon.
    const result = parseAppearance({ avatarEmoji: "🦄" });
    expect(result.avatarEmoji).toBe(DEFAULT_APPEARANCE.avatarEmoji);
  });

  it("falls back to the default position for an invalid value", () => {
    const result = parseAppearance({ position: "top-center" });
    expect(result.position).toBe(DEFAULT_APPEARANCE.position);
  });

  it("filters blank/non-string suggested replies and caps the list at MAX_SUGGESTED_REPLIES", () => {
    const result = parseAppearance({
      suggestedReplies: ["Real one", "  ", "", 42, "Second real one", "Third", "Fourth (dropped)"],
    });
    expect(result.suggestedReplies).toEqual(["Real one", "Second real one", "Third"]);
  });

  it("falls back to no suggested replies when the stored value isn't an array", () => {
    const result = parseAppearance({ suggestedReplies: "not an array" });
    expect(result.suggestedReplies).toEqual([]);
  });

  // Nudges (ADR 0041) — null means disabled, not a fallback number, so
  // this needs its own validation branch distinct from every other
  // field here.
  it("accepts a valid autoOpenAfterSeconds, including zero", () => {
    expect(parseAppearance({ autoOpenAfterSeconds: 30 }).autoOpenAfterSeconds).toBe(30);
    expect(parseAppearance({ autoOpenAfterSeconds: 0 }).autoOpenAfterSeconds).toBe(0);
  });

  it("falls back to null (disabled) for a missing, negative, or non-numeric autoOpenAfterSeconds", () => {
    expect(parseAppearance({}).autoOpenAfterSeconds).toBeNull();
    expect(parseAppearance({ autoOpenAfterSeconds: -5 }).autoOpenAfterSeconds).toBeNull();
    expect(parseAppearance({ autoOpenAfterSeconds: "30" }).autoOpenAfterSeconds).toBeNull();
    expect(parseAppearance({ autoOpenAfterSeconds: NaN }).autoOpenAfterSeconds).toBeNull();
  });
});
