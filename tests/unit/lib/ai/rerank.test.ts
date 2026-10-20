import { describe, it, expect, vi, afterEach } from "vitest";
import { getRerankProvider } from "@/lib/ai/rerank";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoyageRerankProvider.rerank", () => {
  it("returns an empty array without calling fetch for no documents", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRerankProvider().rerank("query", [], 5);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the query, documents, model, and top_k in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ index: 1, relevance_score: 0.9 }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRerankProvider().rerank("what is the refund policy", ["doc a", "doc b"], 1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.voyageai.com/v1/rerank");
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      query: "what is the refund policy",
      documents: ["doc a", "doc b"],
      model: "rerank-2",
      top_k: 1,
    });
  });

  it("maps relevance_score (snake_case wire format) to relevanceScore, preserving order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { index: 2, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.4 },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRerankProvider().rerank("q", ["a", "b", "c"], 2);

    expect(result).toEqual([
      { index: 2, relevanceScore: 0.95 },
      { index: 0, relevanceScore: 0.4 },
    ]);
  });

  it("throws with the response status when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(getRerankProvider().rerank("q", ["a"], 1)).rejects.toThrow(/500/);
  });
});
