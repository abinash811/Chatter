import { describe, it, expect, vi } from "vitest";

const findFirst = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({ botConfigVersion: { findFirst } }),
  ),
}));

describe("buildSystemPrompt", () => {
  it("joins persona and guardrails from the bot's published config version", async () => {
    findFirst.mockResolvedValue({ persona: "You are Fred the friendly bot.", guardrails: "Never give legal advice." });
    const { buildSystemPrompt } = await import("@/lib/ai/systemPrompt");

    const prompt = await buildSystemPrompt("org-1", "bot-1");

    expect(prompt).toBe("You are Fred the friendly bot.\n\nNever give legal advice.");
  });

  it("queries only the published version, most recent first — a draft edit must never affect a live visitor", async () => {
    findFirst.mockResolvedValue({ persona: "p", guardrails: "g" });
    const { buildSystemPrompt } = await import("@/lib/ai/systemPrompt");

    await buildSystemPrompt("org-1", "bot-1");

    expect(findFirst).toHaveBeenCalledWith({
      where: { botId: "bot-1", status: "published" },
      orderBy: { version: "desc" },
    });
  });

  it("throws when the bot has no published config — it isn't servable yet", async () => {
    findFirst.mockResolvedValue(null);
    const { buildSystemPrompt } = await import("@/lib/ai/systemPrompt");

    await expect(buildSystemPrompt("org-1", "bot-1")).rejects.toThrow(/no published config/i);
  });
});
