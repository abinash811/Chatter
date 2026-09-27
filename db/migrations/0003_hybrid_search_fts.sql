-- Hybrid search (ADR 0021): adds Postgres native full-text search
-- alongside the existing pgvector column, combined via Reciprocal Rank
-- Fusion in lib/ai/tools/searchKnowledgeBase.ts. Deliberately plain
-- tsvector/ts_rank, not a BM25 extension (pg_search/pg_textsearch) —
-- neither is supported on AWS RDS for PostgreSQL (the chosen DB host),
-- and Supabase's own published hybrid-search numbers (vector-only ~62%
-- precision -> hybrid with plain tsvector ~84%) show the big quality
-- jump is from combining lexical + semantic search at all, not from
-- which lexical ranking algorithm. See docs/adr/0021 and
-- docs/research/competitive-landscape.md's 2026-09-27 section.
--
-- Idempotent by design — runs on every deploy (see
-- scripts/apply-sql-migrations.mjs), same reasoning as 0001/0002.
--
-- Generated column, not application-maintained: Postgres recomputes
-- content_tsv automatically from `content` on every insert/update, so
-- lib/ai/knowledgeBase.ts's ingestion code needs zero changes to keep it
-- in sync — same "invisible to Prisma, written via raw SQL" pattern the
-- embedding column already uses (content_tsv isn't in prisma/schema.prisma
-- either).
alter table knowledge_chunks
  add column if not exists content_tsv tsvector generated always as (to_tsvector('english', content)) stored;

create index if not exists knowledge_chunks_content_tsv_idx on knowledge_chunks
  using gin (content_tsv);
