import { describe, it, expect, vi, beforeEach } from "vitest";

// lib/ai/knowledgeBase.ts's own logic (source/chunk shaping, the
// embed-question+answer-together choice, scoping delete to the given
// botId, the file/url chunking+multi-chunk-embed path added by ADR
// 0013) — mocked at the module boundary same as tests/unit/lib/ai/
// chat.test.ts. The real DB/RLS/raw-SQL-vector-write path was verified
// separately against a real Postgres+pgvector instance before this file
// was written (CLAUDE.md's "never commit code that hasn't actually been
// run" — VOYAGE_API_KEY is a placeholder in this environment, so the
// embeddings call itself couldn't be exercised for real, same class of
// gap as the documented missing ANTHROPIC_API_KEY).

const findMany = vi.fn();
const sourceCreate = vi.fn();
const chunkCreate = vi.fn();
const sourceFindFirst = vi.fn();
const chunkDeleteMany = vi.fn();
const sourceDelete = vi.fn();
const executeRaw = vi.fn();

vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({
      knowledgeSource: { findMany, create: sourceCreate, findFirst: sourceFindFirst, delete: sourceDelete },
      knowledgeChunk: { create: chunkCreate, deleteMany: chunkDeleteMany },
      $executeRaw: executeRaw,
    }),
  ),
}));

const embed = vi.fn();
vi.mock("@/lib/ai/embeddings", () => ({
  getEmbeddingsProvider: () => ({ embed }),
}));

const { extractFileText, extractUrlText, KnowledgeIngestionError } = vi.hoisted(() => ({
  extractFileText: vi.fn(),
  extractUrlText: vi.fn(),
  KnowledgeIngestionError: class KnowledgeIngestionError extends Error {},
}));
vi.mock("@/lib/ai/extraction", () => ({ extractFileText, extractUrlText, KnowledgeIngestionError }));

import {
  listKnowledgeSources,
  createQaEntry,
  createFileEntry,
  createUrlEntry,
  deleteKnowledgeSource,
} from "@/lib/ai/knowledgeBase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listKnowledgeSources", () => {
  it("maps every source (any kind) with its chunk count", async () => {
    findMany.mockResolvedValue([
      { id: "src-1", kind: "qa", title: "Return policy?", createdAt: new Date("2026-01-01"), chunks: [{}] },
      { id: "src-2", kind: "file", title: "handbook.pdf", createdAt: new Date("2026-01-02"), chunks: [{}, {}, {}] },
    ]);

    const result = await listKnowledgeSources("org-1", "bot-1");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { botId: "bot-1" } }));
    expect(result).toEqual([
      { id: "src-1", kind: "qa", title: "Return policy?", chunkCount: 1, createdAt: new Date("2026-01-01") },
      { id: "src-2", kind: "file", title: "handbook.pdf", chunkCount: 3, createdAt: new Date("2026-01-02") },
    ]);
  });
});

describe("createQaEntry", () => {
  it("embeds the question and answer together, then creates a source+chunk and writes the embedding via raw SQL", async () => {
    embed.mockResolvedValue([0.1, 0.2, 0.3]);
    sourceCreate.mockResolvedValue({ id: "src-1" });
    chunkCreate.mockResolvedValue({ id: "chunk-1" });

    await createQaEntry("org-1", "bot-1", "What is your return policy?", "30 days.");

    expect(embed).toHaveBeenCalledWith("What is your return policy?\n30 days.");
    expect(sourceCreate).toHaveBeenCalledWith({
      data: { orgId: "org-1", botId: "bot-1", kind: "qa", title: "What is your return policy?" },
    });
    expect(chunkCreate).toHaveBeenCalledWith({
      data: { orgId: "org-1", sourceId: "src-1", content: "30 days." },
    });
    expect(executeRaw).toHaveBeenCalled();
  });
});

describe("createFileEntry", () => {
  it("extracts text, chunks it, embeds each chunk, and creates one source with one chunk per piece", async () => {
    extractFileText.mockResolvedValue("Short handbook content.");
    embed.mockResolvedValue([0.1, 0.2]);
    sourceCreate.mockResolvedValue({ id: "src-1" });
    chunkCreate.mockResolvedValue({ id: "chunk-1" });

    await createFileEntry("org-1", "bot-1", "handbook.pdf", "application/pdf", Buffer.from("fake-pdf-bytes"));

    expect(extractFileText).toHaveBeenCalledWith("handbook.pdf", "application/pdf", Buffer.from("fake-pdf-bytes"));
    expect(sourceCreate).toHaveBeenCalledWith({
      data: { orgId: "org-1", botId: "bot-1", kind: "file", title: "handbook.pdf" },
    });
    // Short text fits in a single chunk (lib/ai/chunking.ts).
    expect(chunkCreate).toHaveBeenCalledTimes(1);
    expect(chunkCreate).toHaveBeenCalledWith({
      data: { orgId: "org-1", sourceId: "src-1", content: "Short handbook content." },
    });
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it("creates one chunk per split piece for long text, embedding each", async () => {
    const longText = Array.from({ length: 5 }, (_, i) => `Paragraph ${i}. `.repeat(200)).join("\n\n");
    extractFileText.mockResolvedValue(longText);
    embed.mockResolvedValue([0.1]);
    sourceCreate.mockResolvedValue({ id: "src-1" });
    chunkCreate.mockResolvedValue({ id: "chunk-x" });

    await createFileEntry("org-1", "bot-1", "big.txt", "text/plain", Buffer.from(longText));

    expect(chunkCreate.mock.calls.length).toBeGreaterThan(1);
    expect(embed).toHaveBeenCalledTimes(chunkCreate.mock.calls.length);
  });

  it("throws a plain-language error instead of creating anything when extraction yields no text", async () => {
    extractFileText.mockResolvedValue("   ");

    await expect(createFileEntry("org-1", "bot-1", "empty.txt", "text/plain", Buffer.from(""))).rejects.toThrow(
      /no readable text/i,
    );
    expect(sourceCreate).not.toHaveBeenCalled();
  });
});

describe("createUrlEntry", () => {
  it("extracts the article's title+text, then chunks and embeds it the same way as a file", async () => {
    extractUrlText.mockResolvedValue({ title: "Our Return Policy", text: "You can return items within 30 days." });
    embed.mockResolvedValue([0.1, 0.2]);
    sourceCreate.mockResolvedValue({ id: "src-1" });
    chunkCreate.mockResolvedValue({ id: "chunk-1" });

    await createUrlEntry("org-1", "bot-1", "https://example.com/returns");

    expect(extractUrlText).toHaveBeenCalledWith("https://example.com/returns");
    expect(sourceCreate).toHaveBeenCalledWith({
      data: { orgId: "org-1", botId: "bot-1", kind: "url", title: "Our Return Policy" },
    });
    expect(chunkCreate).toHaveBeenCalledWith({
      data: { orgId: "org-1", sourceId: "src-1", content: "You can return items within 30 days." },
    });
  });
});

describe("deleteKnowledgeSource", () => {
  it("deletes the chunk(s) and source when the source belongs to this bot", async () => {
    sourceFindFirst.mockResolvedValue({ id: "src-1" });

    await deleteKnowledgeSource("org-1", "bot-1", "src-1");

    expect(sourceFindFirst).toHaveBeenCalledWith({ where: { id: "src-1", botId: "bot-1" } });
    expect(chunkDeleteMany).toHaveBeenCalledWith({ where: { sourceId: "src-1" } });
    expect(sourceDelete).toHaveBeenCalledWith({ where: { id: "src-1" } });
  });

  it("no-ops instead of throwing when the source doesn't belong to this bot (or doesn't exist) — a stale/tampered form field, not an error worth surfacing", async () => {
    sourceFindFirst.mockResolvedValue(null);

    await deleteKnowledgeSource("org-1", "bot-1", "someone-elses-source");

    expect(chunkDeleteMany).not.toHaveBeenCalled();
    expect(sourceDelete).not.toHaveBeenCalled();
  });
});
