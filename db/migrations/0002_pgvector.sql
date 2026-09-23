-- Adds the embedding column Prisma can't declare natively.
-- Dimension 1536 matches OpenAI/Voyage-class embedding models; revisit
-- if the embeddings model choice (docs/open-questions.md) picks a
-- different size.

-- Confirmed by a real run (2026-09-23): CREATE EXTENSION requires
-- superuser (or a role granted pg_write_extension / the extension marked
-- trusted). The app's own role can't run this line — a DB admin runs it
-- once per database (as postgres, or via the hosting platform's managed-
-- extensions UI on RDS/Supabase/etc.), then the app role just uses it.
create extension if not exists vector;

alter table knowledge_chunks add column embedding vector(1536);

-- ivfflat needs data present to build well; for now this is a placeholder
-- for the index we'll create once real ingestion volume exists.
create index knowledge_chunks_embedding_idx on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops);
