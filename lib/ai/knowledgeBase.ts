import { withOrgContext } from "@/lib/db";
import { getEmbeddingsProvider } from "@/lib/ai/embeddings";

// Manual Q&A ingestion (docs/product-spec.md's MVP scope: "file upload
// and/or manual Q&A at minimum for v1"). File upload/URL/crawling are
// separate, larger pieces (chunking strategy, dedup) — deliberately not
// built here; `KnowledgeSource.kind` already supports "file"/"url" for
// when that lands, see docs/open-questions.md #4.
//
// One KnowledgeSource + one KnowledgeChunk per Q&A pair — no multi-chunk
// splitting needed, a Q&A pair is already the right retrieval unit.
// `KnowledgeChunk.embedding` (pgvector, db/migrations/0002_pgvector.sql)
// isn't in the Prisma schema, so it's written via a raw SQL update after
// the Prisma-typed create — same pattern searchKnowledgeBase.ts already
// uses for the read side.

export interface QaEntry {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
}

export async function listQaEntries(orgId: string, botId: string): Promise<QaEntry[]> {
  const sources = await withOrgContext(orgId, (tx) =>
    tx.knowledgeSource.findMany({
      where: { botId, kind: "qa" },
      orderBy: { createdAt: "desc" },
      include: { chunks: true },
    }),
  );
  return sources.map((source) => ({
    id: source.id,
    question: source.title,
    answer: source.chunks[0]?.content ?? "",
    createdAt: source.createdAt,
  }));
}

export async function createQaEntry(orgId: string, botId: string, question: string, answer: string): Promise<void> {
  // Embeds question+answer together, not just the question — a visitor's
  // query tends to resemble the question, but this way a query phrased
  // closer to the answer's own wording still matches.
  const embedding = await getEmbeddingsProvider().embed(`${question}\n${answer}`);
  const vectorLiteral = `[${embedding.join(",")}]`;

  await withOrgContext(orgId, async (tx) => {
    const source = await tx.knowledgeSource.create({
      data: { orgId, botId, kind: "qa", title: question },
    });
    const chunk = await tx.knowledgeChunk.create({
      data: { orgId, sourceId: source.id, content: answer },
    });
    await tx.$executeRaw`update knowledge_chunks set embedding = ${vectorLiteral}::vector where id = ${chunk.id}`;
  });
}

export async function deleteQaEntry(orgId: string, botId: string, sourceId: string): Promise<void> {
  await withOrgContext(orgId, async (tx) => {
    // Scoped to this bot, not just this org — sourceId is a client-
    // supplied form field, and an org can have multiple bots.
    const source = await tx.knowledgeSource.findFirst({ where: { id: sourceId, botId } });
    if (!source) return;
    await tx.knowledgeChunk.deleteMany({ where: { sourceId } });
    await tx.knowledgeSource.delete({ where: { id: sourceId } });
  });
}
