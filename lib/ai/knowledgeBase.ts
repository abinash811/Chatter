import { withOrgContext } from "@/lib/db";
import { getEmbeddingsProvider } from "@/lib/ai/embeddings";
import { chunkText } from "@/lib/ai/chunking";
import { extractFileText, extractUrlText, KnowledgeIngestionError } from "@/lib/ai/extraction";
import { crawlSite } from "@/lib/ai/crawler";

// Manual Q&A, file, URL, and (ADR 0030) multi-page crawl ingestion
// (docs/product-spec.md's MVP scope: "file upload and/or manual Q&A at
// minimum for v1"). ADR 0013 covers the original file/URL decisions.
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
  kind: "file" | "url" | "text",
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
  // inside prisma.$transaction, and holding it open for however long the
  // embeddings call takes would risk Prisma's default transaction
  // timeout. createQaEntry has the same shape for the same reason, just
  // with a single chunk. embedBatch (not a per-chunk embed() loop) — one
  // provider round trip per up-to-128 chunks instead of one per chunk.
  const embeddings = await getEmbeddingsProvider().embedBatch(chunks);

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

// Real multi-page site crawling (ADR 0030) — crawlSite (lib/ai/
// crawler.ts) does discovery + per-page extraction; this just persists
// each page the same way a single createUrlEntry call already would.
// One page's own chunking failure (e.g. MAX_CHUNKS) skips that page
// rather than aborting the whole crawl, same "one bad item doesn't sink
// the batch" precedent as bulkDeleteEntriesAction (app/(console)/bots/
// [botId]/knowledge/actions.ts) — returns how many pages actually made
// it in, so the console can tell a business owner the real outcome.
export async function createCrawledEntries(orgId: string, botId: string, startUrl: string): Promise<number> {
  const pages = await crawlSite(startUrl);
  let created = 0;
  for (const page of pages) {
    try {
      await createChunkedEntry(orgId, botId, "url", page.title, page.text);
      created++;
    } catch {
      // Skip this page — see function comment.
    }
  }
  if (created === 0) {
    throw new KnowledgeIngestionError("Found pages on that site, but none had content that could be ingested.");
  }
  return created;
}

// Pasted text, no file/URL round trip — the same chunking pipeline as
// file/URL, just skipping extraction since the text is already plain.
export async function createTextEntry(orgId: string, botId: string, title: string, text: string): Promise<void> {
  await createChunkedEntry(orgId, botId, "text", title, text);
}

// Informational only (docs/open-questions.md #6's pricing/billing-tier
// question is unresolved, so there's no plan-based cap to enforce or
// display against — just the raw total, unlike Chatbase's "X KB / 1 MB").
// Sums each chunk's content length, not the original file/upload size,
// since that's what's actually stored.
export async function getTotalKnowledgeBytes(orgId: string, botId: string): Promise<number> {
  const sources = await withOrgContext(orgId, (tx) =>
    tx.knowledgeSource.findMany({ where: { botId }, include: { chunks: true } }),
  );
  return sources.reduce(
    (total, source) => total + source.chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk.content), 0),
    0,
  );
}
