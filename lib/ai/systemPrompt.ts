import { withOrgContext } from "@/lib/db";

// Assembles the cacheable system-prompt prefix from a bot's current
// *published* config version (docs/architecture.md §5) — never the draft,
// so a business editing their bot never affects a live visitor mid-edit.
export async function buildSystemPrompt(orgId: string, botId: string): Promise<string> {
  const version = await withOrgContext(orgId, (tx) =>
    tx.botConfigVersion.findFirst({
      where: { botId, status: "published" },
      orderBy: { version: "desc" },
    }),
  );

  if (!version) {
    throw new Error(`No published config for bot ${botId} — cannot serve this bot yet.`);
  }

  // Stays plain concatenation deliberately: the whole point is this block
  // is byte-stable per published version, so it caches correctly (see
  // docs/architecture.md §2's prompt-caching note). Don't inject anything
  // request-specific (timestamps, request IDs) here — that would silently
  // invalidate the cache on every message.
  return [version.persona, version.guardrails].join("\n\n");
}
