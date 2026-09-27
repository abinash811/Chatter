import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ withOrgContext: vi.fn() }));

import { parseAppearance, DEFAULT_APPEARANCE } from "@/lib/ai/botConfig";

describe("parseAppearance", () => {
  it("returns all defaults for an empty/null value (a brand-new draft's seed)", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance({})).toEqual(DEFAULT_APPEARANCE);
  });

  it("passes through a fully valid stored appearance untouched", () => {
    const stored = { greeting: "Yo!", accentColor: "#123456", avatarEmoji: "🤖", position: "bottom-left" }; // allow-raw-color — test fixture data, not rendered UI
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
});
