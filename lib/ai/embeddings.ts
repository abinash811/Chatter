// Embeddings provider abstraction — same reasoning as lib/ai/gateway.ts:
// swap providers by adding an implementation, not touching callers.
//
// OPEN DECISION, not yet an ADR: which embeddings model. Anthropic has no
// first-party embeddings endpoint; Voyage AI is Anthropic's recommended
// embeddings partner, so it's the default here pending confirmation.
// Dimension must match db/migrations/0002_pgvector.sql's vector(1536).

export interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>;
  /** Same result as calling embed() once per text, but batched into as
   *  few HTTP requests as the provider allows — use this for anything
   *  embedding more than one text at a time (e.g. a multi-chunk
   *  document), never a loop of embed() calls. */
  embedBatch(texts: string[]): Promise<number[][]>;
}

export function getEmbeddingsProvider(): EmbeddingsProvider {
  return new VoyageEmbeddingsProvider();
}

class VoyageEmbeddingsProvider implements EmbeddingsProvider {
  // Voyage's documented per-request limit (confirmed via WebSearch,
  // 2026-09-27 — not recalled) — this class splits a larger batch into
  // sub-requests of this size rather than pushing that constraint onto
  // every caller.
  private static readonly MAX_BATCH = 128;

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += VoyageEmbeddingsProvider.MAX_BATCH) {
      const batch = texts.slice(i, i + VoyageEmbeddingsProvider.MAX_BATCH);
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: batch, model: "voyage-3" }),
      });
      if (!res.ok) {
        throw new Error(`Voyage embeddings request failed: ${res.status}`);
      }
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      results.push(...data.data.map((d) => d.embedding));
    }
    return results;
  }
}
