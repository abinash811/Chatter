import { withOrgContext } from "@/lib/db";
import { getEmbeddingsProvider } from "@/lib/ai/embeddings";
import { chunkText } from "@/lib/ai/chunking";
import { extractFileText, extractUrlText, KnowledgeIngestionError } from "@/lib/ai/extraction";

// Manual Q&A, file, and URL ingestion (docs/product-spec.md's MVP scope:
// "file upload and/or manual Q&A at minimum for v1"). Site crawling
// (multi-page, link-following) stays separate, deferred scope — see
// docs/open-questions.md #4. ADR 0013 covers the file/URL decisions.
//
// Manual Q&A: one KnowledgeSource + one KnowledgeChunk per pair — no
// multi-chunk splitting needed, a Q&A pair is already the right
// retrieval unit. File/URL: one KnowledgeSource, one KnowledgeChunk per
// chunk (lib/ai/chunking.ts). `KnowledgeChunk.embedding` (pgvector,
// db/migrations/0002_pgvector.sql) isn't in the Prisma schema, so it's
// written via a raw SQL update after the Prisma-typed create — same
// pattern searchKnowledgeBase.ts already uses for the read side.

// Caps total chunks (not just raw file size) at a synchronous request —
// a small file can still expand into a lot of text (e.g. a
// dense-but-short PDF), and each chunk is one sequential embeddings
// call. 200 chunks is already generous (~400K characters) for v1's
// synchronous-with-limits processing model (ADR 0013); a document
// needing more than this should be split, or wait for background-job
// processing if that's ever built.
const MAX_CHUNKS = 200;

export interface KnowledgeSourceRow {
  id: string;
  kind: string;
  title: string;
  chunkCount: number;
  createdAt: Date;
}

export async function listKnowledgeSources(orgId: string, botId: string): Promise<KnowledgeSourceRow[]> {
  const sources = await withOrgContext(orgId, (tx) =>
    tx.knowledgeSource.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
      include: { chunks: true },
    }),
  );
  return sources.map((source) => ({
    id: source.id,
    kind: source.kind,
    title: source.title,
    chunkCount: source.chunks.length,
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

// Generic across all three kinds (qa/file/url) — deleting a source
// always means "remove it and its chunks," regardless of how they got
// there.
export async function deleteKnowledgeSource(orgId: string, botId: string, sourceId: string): Promise<void> {
  await withOrgContext(orgId, async (tx) => {
    // Scoped to this bot, not just this org — sourceId is a client-
    // supplied form field, and an org can have multiple bots.
    const source = await tx.knowledgeSource.findFirst({ where: { id: sourceId, botId } });
    if (!source) return;
    await tx.knowledgeChunk.deleteMany({ where: { sourceId } });
    await tx.knowledgeSource.delete({ where: { id: sourceId } });
  });
}

async function createChunkedEntry(
  orgId: string,
  botId: string,
  kind: "file" | "url",
  title: string,
  text: string,
): Promise<void> {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new KnowledgeIngestionError("No readable text was found.");
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new KnowledgeIngestionError(
      "That document is too long to ingest in one piece. Try splitting it into smaller files.",
    );
  }

  // Embed before opening the transaction below — withOrgContext runs
  // inside prisma.$transaction, and a sequential embeddings call per
  // chunk would otherwise hold that transaction (and Prisma's default
  // transaction timeout) open for however long the embeddings provider
  // takes across every chunk. createQaEntry has the same shape for the
  // same reason, just with a single chunk.
  const embeddings: number[][] = [];
  for (const content of chunks) {
    embeddings.push(await getEmbeddingsProvider().embed(content));
  }

  await withOrgContext(orgId, async (tx) => {
    const source = await tx.knowledgeSource.create({ data: { orgId, botId, kind, title } });
    for (let i = 0; i < chunks.length; i++) {
      const chunk = await tx.knowledgeChunk.create({ data: { orgId, sourceId: source.id, content: chunks[i] } });
      const vectorLiteral = `[${embeddings[i].join(",")}]`;
      await tx.$executeRaw`update knowledge_chunks set embedding = ${vectorLiteral}::vector where id = ${chunk.id}`;
    }
  });
}

export async function createFileEntry(
  orgId: string,
  botId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<void> {
  const text = await extractFileText(filename, mimeType, buffer);
  await createChunkedEntry(orgId, botId, "file", filename, text);
}

export async function createUrlEntry(orgId: string, botId: string, url: string): Promise<void> {
  const { title, text } = await extractUrlText(url);
  await createChunkedEntry(orgId, botId, "url", title, text);
}
