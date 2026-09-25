import { describe, it, expect, vi, beforeEach } from "vitest";

// lib/ai/knowledgeBase.ts's own logic (source/chunk shaping, the
// embed-question+answer-together choice, scoping delete to the given
// botId) — mocked at the module boundary same as tests/unit/lib/ai/
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

import { listQaEntries, createQaEntry, deleteQaEntry } from "@/lib/ai/knowledgeBase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listQaEntries", () => {
  it("maps each source's title/first chunk to question/answer", async () => {
    findMany.mockResolvedValue([
      {
        id: "src-1",
        title: "What is your return policy?",
        createdAt: new Date("2026-01-01"),
        chunks: [{ content: "30 days." }],
      },
    ]);

    const result = await listQaEntries("org-1", "bot-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { botId: "bot-1", kind: "qa" } }),
    );
    expect(result).toEqual([
      { id: "src-1", question: "What is your return policy?", answer: "30 days.", createdAt: new Date("2026-01-01") },
    ]);
  });

  it("falls back to an empty answer if a source somehow has no chunk", async () => {
    findMany.mockResolvedValue([{ id: "src-1", title: "Q", createdAt: new Date(), chunks: [] }]);
    const result = await listQaEntries("org-1", "bot-1");
    expect(result[0].answer).toBe("");
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

describe("deleteQaEntry", () => {
  it("deletes the chunk(s) and source when the source belongs to this bot", async () => {
    sourceFindFirst.mockResolvedValue({ id: "src-1" });

    await deleteQaEntry("org-1", "bot-1", "src-1");

    expect(sourceFindFirst).toHaveBeenCalledWith({ where: { id: "src-1", botId: "bot-1" } });
    expect(chunkDeleteMany).toHaveBeenCalledWith({ where: { sourceId: "src-1" } });
    expect(sourceDelete).toHaveBeenCalledWith({ where: { id: "src-1" } });
  });

  it("no-ops instead of throwing when the source doesn't belong to this bot (or doesn't exist) — a stale/tampered form field, not an error worth surfacing", async () => {
    sourceFindFirst.mockResolvedValue(null);

    await deleteQaEntry("org-1", "bot-1", "someone-elses-source");

    expect(chunkDeleteMany).not.toHaveBeenCalled();
    expect(sourceDelete).not.toHaveBeenCalled();
  });
});
