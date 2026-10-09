-- Adds the embedding column Prisma can't declare natively.
-- Dimension 1536 matches OpenAI/Voyage-class embedding models; revisit
-- if the embeddings model choice (docs/open-questions.md) picks a
-- different size.
--
-- Idempotent by design — runs on every deploy (see
-- scripts/apply-sql-migrations.mjs), same reasoning as 0001.

-- Confirmed locally (2026-09-23): plain Postgres requires superuser (or
-- a role granted pg_write_extension / the extension marked trusted) to
-- run CREATE EXTENSION — the app's own role can't. Confirmed different
-- on Render (2026-09-24): Render Postgres allow-lists pgvector for the
-- app's own default role, so this line runs as-is there. On a different
-- host, this line may need to move to an admin/superuser step instead —
-- see the RDS/Supabase note this replaced.
create extension if not exists vector;

alter table knowledge_chunks add column if not exists embedding vector(1536);

-- Real bug, found 2026-09-27: this used to be an ivfflat index, built
-- while the table was empty. IVFFlat's clusters are computed from
-- whatever data exists at build time — building on zero rows makes it
-- silently degenerate (near-arbitrary clustering), and it doesn't
-- self-correct as data is added; it needs a manual REINDEX once real
-- volume exists, which nothing here ever did. Switched to HNSW, which
-- has no training-data requirement, so it doesn't have this empty-table
-- failure mode — confirmed supported by the pgvector extension version
-- actually installed locally (0.6.0, HNSW has shipped since 0.5.0) via
-- `select installed_version from pg_available_extensions where
-- name='vector'`, not assumed. The drop is required, not just the
-- create-if-not-exists below: an existing ivfflat index from a prior
-- deploy has the same name and isn't replaced by "if not exists".
drop index if exists knowledge_chunks_embedding_idx;
create index if not exists knowledge_chunks_embedding_hnsw_idx on knowledge_chunks
  using hnsw (embedding vector_cosine_ops);
