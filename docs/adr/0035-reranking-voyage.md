# ADR 0035: Reranking via Voyage rerank-2

Status: accepted

Date: 2026-10-02

## Context

`docs/ai-tech-radar.md` already named reranking as the next concrete RAG
item, deliberately sequenced after the hand-rolled eval harness
(`npm run eval:retrieval`) so it would be picked with real numbers, not
reputation — but left the vendor choice open between Voyage `rerank-2`
and Cohere `rerank-v3.5`. This is a real, hard-to-reverse-if-unexamined
vendor choice (CLAUDE.md's process rule), so it was explained to the user
in plain terms before being decided, not picked silently.

Both `docs.voyageai.com` and `api.voyageai.com` are network-blocked in
this environment (consistent with every other vendor-docs site blocked
this session: `prisma.io`, `shopify.dev`, `ui.shadcn.com`). Per CLAUDE.md's
"read the primary source" rule for RAG work, the real, official
`voyageai` npm TypeScript SDK (published by the `voyage-ai` GitHub org)
was installed temporarily (`npm install --no-save voyageai`), its real
source read for the authoritative request/response shape, then removed —
the same technique already used this session to read Prisma's and
Firecrawl's real source when their docs were blocked.

## Decision

**Voyage `rerank-2`**, called via plain `fetch` (no SDK dependency),
matching `VoyageEmbeddingsProvider`'s existing pattern in
`lib/ai/embeddings.ts` — not the official SDK, which was only installed
temporarily to confirm the real API shape. Reasons, explained to the user
before this was approved:

- Same vendor/key (`VOYAGE_API_KEY`) as embeddings already in use — no
  second AI vendor account/key to manage.
- Pricing: ~$0.05/million tokens vs. Cohere's ~$2/1000 documents.
- Voyage's own published benchmarks claim beating Cohere's English and
  multilingual rerankers (a vendor's own claim, not independently
  verified here — flagged as such, not treated as settled fact).

Built behind a new `RerankProvider` interface (`lib/ai/rerank.ts`),
mirroring `ModelGateway`/`EmbeddingsProvider` — the only thing
`lib/ai/retrieval.ts` calls. Switching to Cohere later costs one new
provider class + one new env var (`COHERE_API_KEY`) + a factory-line
change in `getRerankProvider()`; no caller code changes.

**Real API shape, confirmed from the SDK's actual source** (not recalled
or guessed):

- `POST https://api.voyageai.com/v1/rerank`, `Authorization: Bearer
  ${VOYAGE_API_KEY}`.
- Request body (wire format is snake_case, confirmed from the SDK's
  serializer types, not its camelCase TS-facing types): `{ query,
  documents, model, top_k, return_documents?, truncation? }`.
- Response: `{ object, data: [{ index, relevance_score, document? }],
  model, usage: { total_tokens } }` — `data` is already sorted
  descending by `relevance_score`.

**Wiring** (`lib/ai/retrieval.ts`): hybrid search's RRF fusion now
returns a wider candidate pool (`RERANK_POOL_SIZE = 25`, comfortably
above any `matchCount` this app uses) instead of trimming straight to
`matchCount`. Voyage then re-scores that pool and the result is cut to
`matchCount`. If the rerank call fails for any reason (no real key yet,
a transient network error), it falls back to RRF's own order rather than
failing the search — reranking is a quality step on top of a working
hybrid search, not a dependency of it.

**Real environment constraint, stated plainly**: `VOYAGE_API_KEY` is a
placeholder in this environment (same documented gap as the missing real
`ANTHROPIC_API_KEY`), so the rerank endpoint returns 403 here and every
real call exercises the fallback path, confirmed by actually running
`npm run eval:retrieval` against a live local Postgres — the fallback
fired and the eval's P@5/R@5/MRR numbers match plain hybrid search, as
expected. The actual reranking *quality* improvement cannot be measured
for real in this environment; that's a real follow-up once a live key
exists, not something to claim verified here.

## Alternatives considered

- **Cohere `rerank-v3.5`** — a widely-cited strong standalone reranker,
  but a third AI vendor account/key to manage for no measured quality
  gain yet, and ~40x the cost at this app's likely document volumes.
  Stays available as a contained future swap via the same interface if
  Voyage's real-world quality disappoints.
- **Add the `voyageai` SDK as a real dependency** instead of plain
  `fetch` — rejected to match the existing `VoyageEmbeddingsProvider`
  precedent (no SDK, just `fetch` + Bearer auth), keeping one calling
  convention for this one vendor rather than two.
- **No reranking** — the status quo. Rejected per the already-recorded
  roadmap decision that hybrid search's top-30-50 RRF-fused candidates
  benefit from a dedicated re-scoring pass before the ~5 sent to Claude.

## Consequences

Not hard to reverse: one new file (`lib/ai/rerank.ts`), one new call site
in `lib/ai/retrieval.ts`, no schema change. The real open item is
measuring actual quality impact once a live `VOYAGE_API_KEY` exists —
tracked honestly above, not glossed over.
