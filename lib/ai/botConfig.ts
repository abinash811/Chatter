import type { PrismaClient } from "@prisma/client";
import { withOrgContext } from "@/lib/db";

// Implements the draft/publish design from docs/architecture.md §5.
//
// Versioning model: there is at most one `draft` row per bot at a time.
// Editing updates that row in place. Publishing flips its status to
// `published` — the row itself becomes the immutable snapshot, never
// mutated again. The next edit after that creates a brand-new draft row
// (version + 1), seeded from the version just published, not blank.

export async function getOrCreateDraft(orgId: string, botId: string) {
  return withOrgContext(orgId, async (tx: PrismaClient) => {
    const existingDraft = await tx.botConfigVersion.findFirst({
      where: { botId, status: "draft" },
    });
    if (existingDraft) return existingDraft;

    const latestPublished = await tx.botConfigVersion.findFirst({
      where: { botId, status: "published" },
      orderBy: { version: "desc" },
    });

    return tx.botConfigVersion.create({
      data: {
        orgId,
        botId,
        version: (latestPublished?.version ?? 0) + 1,
        status: "draft",
        persona: latestPublished?.persona ?? "You are a helpful assistant for this business.",
        guardrails: latestPublished?.guardrails ?? "",
        tools: latestPublished?.tools ?? [],
      },
    });
  });
}

export async function saveDraft(
  orgId: string,
  botId: string,
  fields: { persona: string; guardrails: string; tools: string[] },
) {
  const draft = await getOrCreateDraft(orgId, botId);
  await withOrgContext(orgId, (tx) =>
    tx.botConfigVersion.update({
      where: { id: draft.id },
      data: { persona: fields.persona, guardrails: fields.guardrails, tools: fields.tools },
    }),
  );
}

export async function publishDraft(orgId: string, botId: string) {
  const draft = await getOrCreateDraft(orgId, botId);
  await withOrgContext(orgId, (tx) =>
    tx.botConfigVersion.update({
      where: { id: draft.id },
      data: { status: "published", publishedAt: new Date() },
    }),
  );
}
