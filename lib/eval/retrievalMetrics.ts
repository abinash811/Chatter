// Standard information-retrieval metrics — Precision@K, Recall@K, Mean
// Reciprocal Rank. Deliberately not a framework (RAGAS/DeepEval/TruLens
// are all Python-only; LangSmith needs a cloud account) — these are
// unambiguous, decades-old formulas, not something a vendor's API surface
// can drift on, and the whole harness is ~100 lines without one.
//
// Pure functions, no I/O — the eval runner (scripts/eval-retrieval.ts)
// does the seeding/querying and calls these to score the results.

export function precisionAtK(retrievedIds: string[], relevantIds: string[], k: number): number {
  const topK = retrievedIds.slice(0, k);
  if (topK.length === 0) return 0;
  const relevantSet = new Set(relevantIds);
  const hits = topK.filter((id) => relevantSet.has(id)).length;
  return hits / topK.length;
}

export function recallAtK(retrievedIds: string[], relevantIds: string[], k: number): number {
  if (relevantIds.length === 0) return 0;
  const topK = new Set(retrievedIds.slice(0, k));
  const hits = relevantIds.filter((id) => topK.has(id)).length;
  return hits / relevantIds.length;
}

// Reciprocal rank of the first relevant result within the retrieved list
// (0 if none of the relevant ids appear at all) — averaging this across
// queries gives Mean Reciprocal Rank.
export function reciprocalRank(retrievedIds: string[], relevantIds: string[]): number {
  const relevantSet = new Set(relevantIds);
  const rank = retrievedIds.findIndex((id) => relevantSet.has(id));
  return rank === -1 ? 0 : 1 / (rank + 1);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
