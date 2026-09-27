# AI/RAG tech radar

A living reference for AI/RAG-specific technology choices — separate from
whatever general product tech radar exists outside this repo, because
model/retrieval/eval tooling moves on its own cycle and needs its own
adopt/trial/assess/hold tracking. Update this in place when a ring
changes (don't just append); it should always reflect the current real
state, not a history log (that's what `docs/adr/` and git history are
for).

**Rings**: **Adopt** (in production, proven) · **Trial** (prioritized,
not yet built — see `docs/roadmap.md`) · **Assess** (worth evaluating,
no decision yet) · **Hold** (explicitly decided against, for now).

Each entry names the real thing (library/vendor/technique, checked via
`npm view`/WebSearch — never recalled, per CLAUDE.md), not a category.

---

## Models & embeddings

**Adopt**
- **Claude** (`@anthropic-ai/sdk`) — the model gateway, `lib/ai/
  gateway.ts`. ADR 0002.
- **Voyage AI embeddings** (`voyage-3`) — `lib/ai/embeddings.ts`.
  Anthropic's recommended embeddings partner; not yet formalized as its
  own ADR (`lib/ai/embeddings.ts`'s own comment flags this).

**Assess**
- **Reranking model** — Voyage `rerank-2` (same vendor/key as
  embeddings, lowest integration cost) vs. Cohere Rerank v3.5 (widely
  cited as the strongest standalone reranker in isolation). No traffic
  yet to justify a second AI vendor, so leaning Voyage first — not yet
  decided. Whichever is picked, build it behind a `RerankProvider`
  interface (same pattern as `ModelGateway`/`EmbeddingsProvider`) so
  switching vendors later is a contained swap: one new provider class +
  one new env var + a factory-line change, no caller code touches the
  vendor directly.

## Retrieval & search

Sequenced 2026-09-27 into 4 phases (`docs/roadmap.md` has the full
write-up); rings below reflect where each phase actually stands, updated
as each ships. Phase 1 shipped same day; phases 2-4 still ahead.

**Adopt**
- **HNSW index** (`db/migrations/0002_pgvector.sql`) — replaced a real
  bug, not a straight upgrade: the index used to be IVFFlat, built while
  the table was empty. IVFFlat's clusters are computed from whatever
  data exists at build time — building on zero rows makes it silently
  degenerate, and it doesn't self-correct as data is added (needs a
  manual `REINDEX`, which nothing here ever ran). HNSW has no
  training-data requirement, so it doesn't have this empty-table failure
  mode. Confirmed supported by the pgvector extension version actually
  installed locally (0.6.0 via `pg_available_extensions`; HNSW has
  shipped since 0.5.0), not assumed — and functionally verified against
  a real local Postgres: applied the migration twice (idempotent, one
  index survives), then ran the exact `ORDER BY embedding <=>` query
  `searchKnowledgeBase.ts` uses against two real 1536-dim vectors and
  confirmed the closer one ranks first.
- **Batched ingestion embeddings** (`lib/ai/embeddings.ts`) —
  `EmbeddingsProvider` gained `embedBatch()`; ingestion
  (`lib/ai/knowledgeBase.ts`) now embeds all of a document's chunks in
  one call (auto-split at Voyage's 128-texts-per-request limit,
  confirmed via WebSearch not recalled) instead of one HTTP round trip
  per chunk in a loop.
- **Query rewriting** (`lib/ai/tools/searchKnowledgeBase.ts`) — no new
  model call: the tool's `query` parameter description now instructs
  Claude (which already sees the full conversation when it decides to
  call this tool) to resolve pronouns/implicit topic into a
  self-contained query before searching, instead of passing a bare
  follow-up straight to the embedder. Verifiable only up to what shipped
  in the schema — whether the model actually follows the instruction
  needs a real `ANTHROPIC_API_KEY` to observe, the same documented gap
  as the rest of the engine's end-to-end behavior.
- **Hybrid retrieval** (`lib/ai/tools/searchKnowledgeBase.ts`,
  `db/migrations/0003_hybrid_search_fts.sql`) — Postgres native
  full-text search (a generated `tsvector` column + GIN index) combined
  with the existing pgvector cosine search via Reciprocal Rank Fusion.
  Matched precisely against Supabase's own reference implementation
  (`supabase/supabase`'s `hybrid-search.mdx`, read directly — not just
  summarized from search results, after an initial pass that only used
  search snippets missed 3 real details): `ts_rank_cd` (cover density —
  accounts for term proximity), not plain `ts_rank`; the candidate-pool
  formula `least(match_count, 30) * 2` (10 here, for our match_count of
  5), not an arbitrary round number; and their exact join structure
  (`full_text FULL OUTER JOIN semantic`, then one join to the base
  table) rather than a less efficient left-join-from-the-base-table
  version. `rrf_k = 50` and equal `full_text_weight`/`semantic_weight`
  (both 1, not yet exposed as tunable) match their defaults. Kept as a
  deliberate divergence: cosine distance (`<=>`, matching our existing
  `vector_cosine_ops` HNSW index and Voyage embeddings, which aren't
  guaranteed pre-normalized), not their inner-product example. Deliberately
  plain `tsvector`, not a BM25 extension — see ADR 0021 and the Hold
  entry below. Functionally verified against a real local Postgres:
  applied the migration twice (idempotent), confirmed
  `websearch_to_tsquery` never throws on empty/malformed input, ran the
  real corrected query through the actual Prisma `$queryRaw` code path
  (not just raw psql) confirming the numeric candidate-limit/match-count
  parameters interpolate correctly, and confirmed an exact keyword match
  ranked #2 in vector-only search correctly wins the fused ranking.
- **RAG eval harness** (`scripts/eval-retrieval.ts`, `lib/eval/`) — hand-
  rolled, not a framework: RAGAS/DeepEval/TruLens are all Python-only
  (checked their real repos directly, not summaries — DeepEval has
  native Claude support and the closest-fit metrics, but Python is still
  a second language/toolchain this all-TypeScript project doesn't have);
  LangSmith has a real TS SDK but requires a LangSmith account/cloud
  service (self-hosting is Enterprise-only). Precision@K/Recall@K/MRR
  are unambiguous, decades-old IR metrics, not something a vendor API
  can drift on — `lib/eval/retrievalMetrics.ts` is under 40 lines.
  `lib/ai/retrieval.ts` was extracted out of `search_knowledge_base` so
  the harness calls the *exact* production hybrid-search query
  (`retrieveKnowledgeChunks`) instead of a second copy that could drift
  from it. Scores against a hand-written 8-query labeled test set
  (`lib/eval/retrievalDataset.ts` — no real production data exists yet).
  Real limitation, stated in the tool's own output every run: with
  `VOYAGE_API_KEY` still a placeholder, semantic search can't be
  measured for real — the script detects this and falls back to a
  crude hash-based mock embedding so the full pipeline (seed → query →
  score) still runs end-to-end, loudly labeled as not a real quality
  signal. Full-text scores are real either way. Verified: ran twice
  (deterministic, same result both times), confirmed no leftover rows
  after cleanup.

**Trial** (prioritized, in this order — see `docs/roadmap.md`)
1. **Reranking** — re-score the top ~30–50 hybrid candidates down to the
   ~5–8 actually sent to the LLM. Vendor: see Assess above. Deliberately
   sequenced *after* the eval harness — measure with real numbers
   instead of picking a vendor on reputation.

**Hold**
- **BM25 extension** (`pg_search`/`pg_textsearch`) — explicitly deferred
  (ADR 0021, 2026-09-27), not rejected outright. AWS RDS for PostgreSQL
  (the chosen DB host) doesn't support either; getting real BM25 would
  mean self-managed Postgres, Neon, or Google Cloud SQL/AlloyDB instead,
  each a bigger decision than the evidence currently justifies. Revisit
  specifically once the RAG eval harness below can show `ts_rank`'s
  weaker ranking is an actual bottleneck for real content and queries,
  not before.

**Assess**
- **Parent-child / contextual retrieval** — search a small chunk,
  answer with its surrounding section/heading context. Real schema
  implications (`KnowledgeChunk` would need a parent/context
  reference); not yet designed.

## Ingestion & parsing

**Adopt**
- **PDF**: `pdf-parse` v2.4.5 — text extraction only today.
- **DOCX**: `mammoth` v1.12.3 — `extractRawText`, text only.
- **URL**: `jsdom` + `@mozilla/readability` — article text only.
- **Chunking**: hand-rolled recursive splitter (`lib/ai/chunking.ts`) —
  one universal strategy for every source kind. ADR 0013.

**Assess**
- **Adaptive chunking** — a Q&A pair, a PDF section, and a URL article
  arguably shouldn't all use the same recursive splitter. Needs a real
  per-kind strategy design, not just "use different constants."
- **Table/OCR-aware parsing** — today's extraction is plain-text-only;
  a table becomes flattened/garbled text, and a scanned (image-only)
  PDF page extracts nothing. Candidates, none verified yet: `pdf-parse`
  v2's own `getTable()` (same vendor already in use, worth checking
  first), `unstructured.io` (hosted API, table/layout-aware), Tesseract
  (`tesseract.js`, OCR for scanned pages), AWS Textract. This is the
  least-defined item on this radar — biggest scope, most open questions
  (self-hosted OCR vs. a paid API, latency/cost impact on the
  synchronous ingestion path ADR 0013 already chose).
- **Cleaning/structuring** — preserving heading hierarchy/structure
  from the source (not just flat extracted text) before chunking, so a
  chunk can carry "this is under the '## Refunds' heading" as context.

**Hold**
- **LangChain/LlamaIndex** for chunking — ADR 0013's explicit call;
  hand-rolled beat both naive fixed windows and (per the research note)
  embedding-similarity "semantic chunking" in 2026 benchmarks.
- **Site crawling** (multi-page ingestion) — `docs/open-questions.md`
  #4, still the user's call, unrelated to this radar's own scope.

## Eval & ops

**Adopt**
- **RAG eval harness** (`npm run eval:retrieval`) — built 2026-09-27; see
  the Retrieval & search section above for the full writeup (why
  hand-rolled instead of RAGAS/DeepEval/TruLens/LangSmith, the
  placeholder-key fallback, verification done).

**Assess**
- **Production feedback loop** (👍/👎 → gap analysis) — no signal
  capture exists yet; depends on the eval harness's data shape being
  settled first so both share one schema.

---

## How this relates to other docs

- `docs/roadmap.md` — when an item here moves from Assess → Trial (a
  real decision to build it, prioritized), it also gets a roadmap
  entry. This radar tracks *what's true about our stack*; roadmap
  tracks *what we're building next*.
- `docs/adr/` — when an Assess item gets decided (schema shape, vendor
  choice), it graduates to an ADR and this radar's entry updates to
  reference it (see ADR 0013's chunking/parsing entries above).
- `docs/research/` — a research note (e.g. `docs/research/knowledge-
  ingestion-libraries.md`) is the one-time evidence; this radar is the
  current-state summary that points back to it.
