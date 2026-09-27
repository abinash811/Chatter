# ADR 0021: AWS RDS for PostgreSQL, native tsvector hybrid search (not BM25)

Status: accepted

Date: 2026-09-27

## Context

ADR 0020 dropped Render and reopened hosting entirely
(`docs/open-questions.md` #8). The user then named AWS as the deploy
target, but "AWS" alone doesn't pick a database — that needed its own
decision, especially since it directly affects the hybrid-search work
already scoped in `docs/ai-tech-radar.md`.

Checked (WebSearch, not recalled) whether AWS RDS for PostgreSQL supports
a real BM25 extension for lexical search: it does not. RDS supports
~78 extensions including pgvector (0.8.2, HNSW included) and `pg_trgm`,
but neither `pg_search` (ParadeDB) nor `pg_textsearch` (Tiger Data) — the
two real BM25-for-Postgres implementations — are on its supported list.
Getting real BM25 would mean either self-managed Postgres (full extension
control, but real ongoing ops burden — backups, patching, failover — for
a team with none of that infrastructure today) or a different managed
host entirely (Neon has `pg_search`; Google Cloud SQL/AlloyDB got
`pg_textsearch` natively on 2026-09-21, but that's a second cloud
provider alongside AWS for compute).

The deciding input was competitive research, not a guess: Chatbase (the
closest competitor) migrated *off* Pinecone *onto* Postgres+pgvector via
Supabase — validating our own architecture directly, not just a similar
one. Supabase's own official hybrid-search guide uses plain
`tsvector`/`ts_rank` + pgvector + Reciprocal Rank Fusion, **not BM25**,
and publishes real measured numbers: vector-only retrieval hit ~62%
precision; adding hybrid search (with plain `tsvector`, no BM25) reached
~84%. The large jump came from combining lexical + semantic search at
all — BM25 vs. `ts_rank` is a smaller, second-order refinement on top of
that, not the source of the big win. (Gorgias, by contrast, uses Zilliz
Cloud/Milvus — a dedicated vector database with BM25 built in — a
different architectural choice, not a Postgres-extension comparison.)

## Decision

Database: **AWS RDS for PostgreSQL**. Hybrid search: native
`tsvector`/`ts_rank` combined with the existing pgvector cosine search
via Reciprocal Rank Fusion — the same pattern Supabase documents and
Chatbase's own infrastructure choice validates, not a BM25 extension.
Real BM25 (via Neon, self-managed Postgres, or a different host) stays
an explicitly deferred, evidence-gated future upgrade: build the RAG
eval harness first (`docs/ai-tech-radar.md`), and only revisit BM25 if
that harness shows lexical ranking quality is actually the bottleneck.
App compute (App Runner vs. ECS Fargate vs. EC2) is a separate, still
open decision — `docs/open-questions.md` #8 stays open for that half.

No new local-dev compatibility concern: local development already runs
plain Postgres 16 + pgvector, the same engine RDS runs — this decision
changes nothing about `db/migrations/*.sql` or how they're verified.

## Alternatives considered

- **Self-managed Postgres on AWS (EC2/container)** — rejected for now:
  unlocks real BM25, but adds backups/patching/failover/security-update
  ownership with zero of that infrastructure existing today, for a gain
  the competitive data above suggests is second-order compared to
  having hybrid search at all.
- **Neon** — rejected for this decision: `pg_search` is real and
  production-ready there, but picking it now would be optimizing for
  BM25 specifically before there's any evidence (via the eval harness)
  that `ts_rank`'s weaker ranking is an actual bottleneck for our
  content and queries.
- **Google Cloud SQL / AlloyDB** — rejected: real BM25 support, but adds
  a second cloud provider relationship alongside AWS for compute, for
  the same not-yet-evidenced gain.

## Consequences

- Not hard to reverse: RDS is the same PostgreSQL engine as everywhere
  else this project touches Postgres, so moving to Neon, self-managed,
  or another host later is a `pg_dump`/restore and a `DATABASE_URL`
  change, not a rewrite — the schema, RLS policies, and application code
  are all engine-agnostic already.
- Unblocks the hybrid-search build (`lib/ai/tools/searchKnowledgeBase.ts`,
  `docs/ai-tech-radar.md` phase 2) — no more waiting on a hosting
  decision to write it.
- Real BM25 stays a known, documented gap, not a silently-dropped one —
  revisit specifically once the eval harness (still unbuilt) can show
  whether it would actually move retrieval quality for real content.
