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

-- ivfflat needs data present to build well; for now this is a placeholder
-- for the index we'll create once real ingestion volume exists.
create index if not exists knowledge_chunks_embedding_idx on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops);
