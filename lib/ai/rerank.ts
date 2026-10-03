// Reranking provider abstraction — same reasoning as lib/ai/gateway.ts and
// lib/ai/embeddings.ts: swap vendors by adding an implementation, not
// touching callers (lib/ai/retrieval.ts).
//
// ADR 0035: Voyage rerank-2, chosen over Cohere rerank-v3.5 — same
// vendor/key as embeddings already in use, no second AI vendor to manage.
//
// Endpoint/request/response shape confirmed by reading the real,
// official `voyageai` npm package's source (docs.voyageai.com and
// api.voyageai.com are both network-blocked in this environment) —
// installed temporarily via `npm install --no-save`, read, then removed;
// implemented here via plain fetch, matching VoyageEmbeddingsProvider's
// pattern, not as a real SDK dependency.

export interface RerankResult {
  /** Index into the `documents` array passed to rerank(). */
  index: number;
  relevanceScore: number;
}

export interface RerankProvider {
  /** Re-scores `documents` against `query`, returning the `topK` most
   *  relevant, sorted descending by relevance. */
  rerank(query: string, documents: string[], topK: number): Promise<RerankResult[]>;
}

export function getRerankProvider(): RerankProvider {
  return new VoyageRerankProvider();
}

class VoyageRerankProvider implements RerankProvider {
  async rerank(query: string, documents: string[], topK: number): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    const res = await fetch("https://api.voyageai.com/v1/rerank", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        documents,
        model: "rerank-2",
        top_k: topK,
      }),
    });
    if (!res.ok) {
      throw new Error(`Voyage rerank request failed: ${res.status}`);
    }
    const data = (await res.json()) as { data: { index: number; relevance_score: number }[] };
    return data.data.map((d) => ({ index: d.index, relevanceScore: d.relevance_score }));
  }
}
