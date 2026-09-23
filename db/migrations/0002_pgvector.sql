-- Adds the embedding column Prisma can't declare natively.
-- Dimension 1536 matches OpenAI/Voyage-class embedding models; revisit
-- if the embeddings model choice (docs/open-questions.md) picks a
-- different size.

create extension if not exists vector;

alter table knowledge_chunks add column embedding vector(1536);

-- ivfflat needs data present to build well; for now this is a placeholder
-- for the index we'll create once real ingestion volume exists.
create index knowledge_chunks_embedding_idx on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops);
