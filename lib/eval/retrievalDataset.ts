// The labeled test set for scripts/eval-retrieval.ts. Each entry names a
// query and which of the seeded chunks below actually answer it — the
// eval script seeds these exact chunks (with real, stable ids) into a
// throwaway org/bot, runs search_knowledge_base's real retrieval query
// against each query, and scores the result against `relevantChunkIds`.
//
// Deliberately small and hand-written, not scraped from real production
// data — there isn't any yet (docs/product-spec.md: no real end-to-end
// verified Claude reply exists). Covers both keyword-heavy queries
// (exact order/SKU numbers — full-text search should nail these) and
// paraphrase-style queries (semantic — only meaningfully measurable once
// a real VOYAGE_API_KEY exists; see scripts/eval-retrieval.ts's header).

export interface EvalChunk {
  id: string;
  content: string;
}

export interface EvalCase {
  query: string;
  relevantChunkIds: string[];
}

export const EVAL_CHUNKS: EvalChunk[] = [
  { id: "chunk-returns", content: "You can return any item within 30 days of delivery for a full refund." },
  {
    id: "chunk-intl-returns",
    content: "International orders can also be returned within 30 days, but the customer pays return shipping.",
  },
  { id: "chunk-shipping", content: "Standard shipping takes 5-7 business days within the continental US." },
  { id: "chunk-shipping-cost", content: "Shipping is free on orders over $50; otherwise it's a flat $5.99." },
  { id: "chunk-sku-4471", content: "SKU-4471 (Wireless Mouse Pro) is currently in stock and ships same-day." },
  { id: "chunk-order-status", content: "You can check your order status anytime from the Orders page in your account." },
  { id: "chunk-hours", content: "Our support team is available Monday through Friday, 9am-5pm Eastern." },
  { id: "chunk-warranty", content: "All electronics come with a 1-year manufacturer warranty against defects." },
];

export const EVAL_CASES: EvalCase[] = [
  { query: "What is your return policy?", relevantChunkIds: ["chunk-returns"] },
  {
    // Query rewriting's exact target case (lib/ai/tools/searchKnowledgeBase.ts):
    // a follow-up that only makes sense with the returns context resolved in.
    query: "refund policy for international orders",
    relevantChunkIds: ["chunk-intl-returns", "chunk-returns"],
  },
  { query: "how long does shipping take", relevantChunkIds: ["chunk-shipping"] },
  { query: "do you offer free shipping", relevantChunkIds: ["chunk-shipping-cost"] },
  // Keyword-heavy — an exact SKU should win regardless of embedding quality,
  // the case hybrid search (ADR 0021) exists to catch.
  { query: "is SKU-4471 in stock", relevantChunkIds: ["chunk-sku-4471"] },
  { query: "where can I see my order status", relevantChunkIds: ["chunk-order-status"] },
  { query: "when is support available", relevantChunkIds: ["chunk-hours"] },
  { query: "is there a warranty on electronics", relevantChunkIds: ["chunk-warranty"] },
];
