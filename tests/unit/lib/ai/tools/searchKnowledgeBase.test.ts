import { describe, it, expect, vi, beforeEach } from "vitest";

const queryRaw = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: queryRaw })),
}));

const embed = vi.fn().mockResolvedValue([0.1, 0.2]);
vi.mock("@/lib/ai/embeddings", () => ({
  getEmbeddingsProvider: () => ({ embed }),
}));

import { searchKnowledgeBaseTool } from "@/lib/ai/tools/searchKnowledgeBase";

beforeEach(() => {
  vi.clearAllMocks();
  embed.mockResolvedValue([0.1, 0.2]);
});

describe("search_knowledge_base tool", () => {
  it("restates the question alongside the answer for a manually-entered Q&A chunk", async () => {
    queryRaw.mockResolvedValue([{ content: "30 days.", kind: "qa", title: "What is your return policy?" }]);

    const result = await searchKnowledgeBaseTool.handle("org-1", "bot-1", { query: "returns" });

    expect(result).toBe("Q: What is your return policy?\nA: 30 days.");
  });

  it("prefixes a file/url chunk with its source title (ADR 0013)", async () => {
    queryRaw.mockResolvedValue([{ content: "Our store is open 9-5.", kind: "file", title: "hours.pdf" }]);

    const result = await searchKnowledgeBaseTool.handle("org-1", "bot-1", { query: "hours" });

    expect(result).toBe('From "hours.pdf":\nOur store is open 9-5.');
  });

  it("joins multiple chunks with a separator", async () => {
    queryRaw.mockResolvedValue([
      { content: "30 days.", kind: "qa", title: "Return window?" },
      { content: "Free for orders over $50.", kind: "qa", title: "Shipping cost?" },
    ]);

    const result = await searchKnowledgeBaseTool.handle("org-1", "bot-1", { query: "policies" });

    expect(result).toBe("Q: Return window?\nA: 30 days.\n\n---\n\nQ: Shipping cost?\nA: Free for orders over $50.");
  });

  it("returns a plain-language message, not an empty string, when nothing matches", async () => {
    queryRaw.mockResolvedValue([]);
    const result = await searchKnowledgeBaseTool.handle("org-1", "bot-1", { query: "anything" });
    expect(result).toBe("No relevant information found in the knowledge base.");
  });
});

// ADR 0016: the conversation inbox's plain-language summary + issue flag.
describe("search_knowledge_base tool — describeForInbox", () => {
  it("is not an issue when the search found something", () => {
    const { summary, isIssue } = searchKnowledgeBaseTool.describeForInbox!(
      { query: "returns" },
      "Q: What is your return policy?\nA: 30 days.",
    );
    expect(summary).toBe('Searched the knowledge base for "returns".');
    expect(isIssue).toBe(false);
  });

  it("is an issue when nothing was found", () => {
    const { summary, isIssue } = searchKnowledgeBaseTool.describeForInbox!(
      { query: "shipping to Mars" },
      "No relevant information found in the knowledge base.",
    );
    expect(summary).toBe('Searched the knowledge base for "shipping to Mars" — nothing found.');
    expect(isIssue).toBe(true);
  });
});

// Query rewriting (docs/ai-tech-radar.md's Retrieval & search section):
// no new model call — the fix is instructing the model, which already
// sees the full conversation, to resolve context into the query text
// before searching. This can only verify the instruction actually
// shipped in the tool schema Claude receives; it can't verify the model
// follows it without a real ANTHROPIC_API_KEY (documented known gap).
describe("search_knowledge_base tool — query field asks for a self-contained query", () => {
  it("instructs resolving conversational context (pronouns/implicit topic) into the query text", () => {
    const queryDescription = (
      searchKnowledgeBaseTool.inputSchema.properties as { query: { description: string } }
    ).query.description;
    expect(queryDescription).toMatch(/self-contained/i);
    expect(queryDescription).toMatch(/pronoun|implicit topic/i);
  });
});
