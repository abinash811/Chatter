// Embeddings provider abstraction — same reasoning as lib/ai/gateway.ts:
// swap providers by adding an implementation, not touching callers.
//
// OPEN DECISION, not yet an ADR: which embeddings model. Anthropic has no
// first-party embeddings endpoint; Voyage AI is Anthropic's recommended
// embeddings partner, so it's the default here pending confirmation.
// Dimension must match db/migrations/0002_pgvector.sql's vector(1536).

export interface EmbeddingsProvider {
  embed(text: string): Promise<number[]>;
}

export function getEmbeddingsProvider(): EmbeddingsProvider {
  return new VoyageEmbeddingsProvider();
}

class VoyageEmbeddingsProvider implements EmbeddingsProvider {
  async embed(text: string): Promise<number[]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text, model: "voyage-3" }),
    });
    if (!res.ok) {
      throw new Error(`Voyage embeddings request failed: ${res.status}`);
    }
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data[0].embedding;
  }
}
