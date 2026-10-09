// RAG eval harness (docs/ai-tech-radar.md's Retrieval & search section):
// measures retrieval quality against the labeled test set in
// lib/eval/retrievalDataset.ts, using the exact same retrieveKnowledgeChunks
// query production uses (lib/ai/retrieval.ts) — not a reimplementation,
// so this measures real behavior, not an approximation of it.
//
// Built before reranking on purpose (user decision, 2026-09-27): so that
// decision, and every future retrieval tuning change, is measured against
// real numbers instead of guessed.
//
// Hand-rolled, not a framework (RAGAS/DeepEval/TruLens are Python-only;
// LangSmith needs a cloud account) — Precision@K/Recall@K/MRR are
// unambiguous, well-established IR metrics, not something a vendor API
// surface can drift on, and the whole harness is under 150 lines.
//
// REAL LIMITATION, stated plainly: VOYAGE_API_KEY is a placeholder in
// every environment this has run in (same documented gap as the missing
// ANTHROPIC_API_KEY) — so semantic (vector) search can't be measured for
// real here. This script detects that automatically: if the real
// embeddings call fails, it falls back to a crude deterministic
// hash-based "embedding" purely so the pipeline (seeding, querying,
// scoring) can be verified end-to-end — those numbers are NOT a real
// retrieval-quality signal and the report says so loudly. Full-text
// search needs no embeddings at all, so its contribution to the score is
// real either way.
//
// Usage: npm run eval:retrieval (needs DATABASE_URL set, with
// migrations 0001-0003 already applied).

import { withOrgContext } from "../lib/db";
import { getEmbeddingsProvider } from "../lib/ai/embeddings";
import { retrieveKnowledgeChunks } from "../lib/ai/retrieval";
import { EVAL_CHUNKS, EVAL_CASES } from "../lib/eval/retrievalDataset";
import { precisionAtK, recallAtK, reciprocalRank, mean } from "../lib/eval/retrievalMetrics";

const EMBEDDING_DIMENSIONS = 1536;
const MATCH_COUNT = 5;

// Crude, deterministic, NOT a real embedding — a bag-of-words hash into a
// 1536-dim vector, so lexically similar text lands closer together than
// unrelated text (some real signal), but nothing like a trained model's
// semantic understanding (e.g. it won't know "SKU-4471" and "wireless
// mouse" refer to the same product). Only used when the real embeddings
// provider is unavailable — see the header comment.
function mockEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    vector[hash % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function detectRealEmbeddings(): Promise<boolean> {
  try {
    await getEmbeddingsProvider().embed("probe");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const useRealEmbeddings = await detectRealEmbeddings();
  if (!useRealEmbeddings) {
    console.warn(
      "\n⚠ VOYAGE_API_KEY is a placeholder — falling back to a mock embedding for this run.\n" +
        "  Full-text scores below are real. Any vector/hybrid score is NOT a real\n" +
        "  retrieval-quality signal, only proof the pipeline runs end-to-end.\n",
    );
  }

  const orgId = crypto.randomUUID();
  const botId = crypto.randomUUID();
  const sourceId = crypto.randomUUID();

  await withOrgContext(orgId, (tx) => tx.org.create({ data: { id: orgId, name: "Eval harness org" } }));
  await withOrgContext(orgId, (tx) => tx.bot.create({ data: { id: botId, orgId, name: "Eval harness bot" } }));
  await withOrgContext(orgId, (tx) =>
    tx.knowledgeSource.create({ data: { id: sourceId, orgId, botId, kind: "qa", title: "eval dataset" } }),
  );

  const embeddings = useRealEmbeddings
    ? await getEmbeddingsProvider().embedBatch(EVAL_CHUNKS.map((c) => c.content))
    : EVAL_CHUNKS.map((c) => mockEmbedding(c.content));

  await withOrgContext(orgId, async (tx) => {
    for (let i = 0; i < EVAL_CHUNKS.length; i++) {
      await tx.knowledgeChunk.create({
        data: { id: EVAL_CHUNKS[i].id, orgId, sourceId, content: EVAL_CHUNKS[i].content },
      });
      const vectorLiteral = `[${embeddings[i].join(",")}]`;
      await tx.$executeRaw`update knowledge_chunks set embedding = ${vectorLiteral}::vector where id = ${EVAL_CHUNKS[i].id}`;
    }
  });

  const rows: { query: string; p: number; r: number; rr: number }[] = [];
  for (const evalCase of EVAL_CASES) {
    // retrieveKnowledgeChunks already wraps its own query in
    // withOrgContext (lib/ai/retrieval.ts) — the real production call
    // shape, not re-wrapped here.
    const queryEmbedding = useRealEmbeddings ? undefined : mockEmbedding(evalCase.query);
    const results = await retrieveKnowledgeChunks(orgId, botId, evalCase.query, MATCH_COUNT, queryEmbedding);
    const retrievedIds = results.map((r) => r.id);
    rows.push({
      query: evalCase.query,
      p: precisionAtK(retrievedIds, evalCase.relevantChunkIds, MATCH_COUNT),
      r: recallAtK(retrievedIds, evalCase.relevantChunkIds, MATCH_COUNT),
      rr: reciprocalRank(retrievedIds, evalCase.relevantChunkIds),
    });
  }

  console.log(`Retrieval eval — ${EVAL_CASES.length} queries, match_count=${MATCH_COUNT}\n`);
  console.log(`${"query".padEnd(45)} P@${MATCH_COUNT}   R@${MATCH_COUNT}   RR`);
  for (const row of rows) {
    console.log(
      `${row.query.slice(0, 44).padEnd(45)} ${row.p.toFixed(2)}   ${row.r.toFixed(2)}   ${row.rr.toFixed(2)}`,
    );
  }
  console.log(
    `\nMean Precision@${MATCH_COUNT}: ${mean(rows.map((r) => r.p)).toFixed(3)}` +
      `\nMean Recall@${MATCH_COUNT}:    ${mean(rows.map((r) => r.r)).toFixed(3)}` +
      `\nMRR:              ${mean(rows.map((r) => r.rr)).toFixed(3)}`,
  );

  // Cleanup — leave the DB as we found it.
  await withOrgContext(orgId, (tx) => tx.knowledgeChunk.deleteMany({ where: { orgId } }));
  await withOrgContext(orgId, (tx) => tx.knowledgeSource.deleteMany({ where: { orgId } }));
  await withOrgContext(orgId, (tx) => tx.bot.deleteMany({ where: { orgId } }));
  await withOrgContext(orgId, (tx) => tx.org.deleteMany({ where: { id: orgId } }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
