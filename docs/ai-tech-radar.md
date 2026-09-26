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

**Trial** (prioritized — see `docs/roadmap.md`)
- **Hybrid retrieval** — Postgres native full-text search (`tsvector`/
  `tsquery`, no new infra) combined with pgvector's existing cosine-
  distance search. No dedicated search engine (Elasticsearch/Typesense)
  needed at this scale.
- **Reranking** — re-score the top ~30–50 hybrid candidates down to the
  ~5–8 actually sent to the LLM. Vendor: see Assess above.
- **Query rewriting** — fold recent conversation turns into a
  standalone retrieval query before searching (e.g. "what about
  international orders?" → "refund policy for international orders"),
  using the existing Claude call already in the loop — no new model
  needed.

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

**Assess**
- **RAG eval harness** — no test-set/regression check exists today.
  Plan: adopt an open-source framework rather than hand-roll (e.g.
  RAGAS, DeepEval, TruLens — none evaluated yet, re-check current
  practice before picking, per CLAUDE.md) once a real labeled Q&A test
  set exists to run it against.
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
