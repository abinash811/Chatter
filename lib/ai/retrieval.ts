import { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { getEmbeddingsProvider } from "@/lib/ai/embeddings";

// Extracted from lib/ai/tools/searchKnowledgeBase.ts (2026-09-27) so the
// eval harness (scripts/eval-retrieval.ts) can call the exact same query
// production uses instead of duplicating it — a second copy would drift
// from the real one the moment either changed, defeating the point of an
// eval that's supposed to measure real behavior.

export interface RetrievedChunk {
  id: string;
  content: string;
  kind: string;
  title: string;
}

// Hybrid search (ADR 0021): combines pgvector's semantic search with
// Postgres native full-text search via Reciprocal Rank Fusion — the
// exact pattern from Supabase's own reference implementation
// (supabase/supabase's hybrid-search.mdx `hybrid_search()` function,
// read directly, not just summarized), adapted here since our embedding
// index uses cosine distance (vector_cosine_ops, matching Voyage
// embeddings which aren't guaranteed pre-normalized) instead of their
// inner-product example. Matched precisely, not just "close enough":
// ts_rank_cd (cover density — accounts for term proximity, not plain
// ts_rank), the candidate-pool formula least(match_count, 30) * 2 (10
// for the default match_count of 5, not an arbitrary round number),
// full_text_weight/semantic_weight = 1 (implicit, no tuning surface
// yet), and rrf_k = 50 — all their documented defaults. withOrgContext
// sets app.org_id for this transaction, so RLS already scopes this
// query to orgId — the botId filter narrows further to this specific
// bot's sources within that org.
export async function retrieveKnowledgeChunks(
  orgId: string,
  botId: string,
  query: string,
  matchCount = 5,
  // Only used by scripts/eval-retrieval.ts when no real VOYAGE_API_KEY
  // exists, so it can still exercise the real hybrid-search query
  // structurally without a working embeddings provider. Every real
  // caller (search_knowledge_base) omits this and always gets a real
  // embedding — this never changes production behavior.
  queryEmbedding?: number[],
): Promise<RetrievedChunk[]> {
  const embedding = queryEmbedding ?? (await getEmbeddingsProvider().embed(query));
  const vectorLiteral = `[${embedding.join(",")}]`;
  const candidateLimit = Math.min(matchCount, 30) * 2;

  return withOrgContext(orgId, (tx) =>
    tx.$queryRaw<RetrievedChunk[]>(Prisma.sql`
      with full_text as (
        select kc.id, row_number() over (
          order by ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', ${query})) desc
        ) as rank_ix
        from knowledge_chunks kc
        join knowledge_sources ks on ks.id = kc."sourceId"
        where ks."botId" = ${botId}
          and kc.content_tsv @@ websearch_to_tsquery('english', ${query})
        order by rank_ix
        limit ${candidateLimit}
      ),
      semantic as (
        select kc.id, row_number() over (order by kc.embedding <=> ${vectorLiteral}::vector) as rank_ix
        from knowledge_chunks kc
        join knowledge_sources ks on ks.id = kc."sourceId"
        where ks."botId" = ${botId}
        order by rank_ix
        limit ${candidateLimit}
      )
      select kc.id, kc.content, ks.kind, ks.title
      from full_text
      full outer join semantic on full_text.id = semantic.id
      join knowledge_chunks kc on coalesce(full_text.id, semantic.id) = kc.id
      join knowledge_sources ks on ks.id = kc."sourceId"
      order by
        coalesce(1.0 / (50 + full_text.rank_ix), 0.0) +
        coalesce(1.0 / (50 + semantic.rank_ix), 0.0) desc
      limit ${matchCount}
    `),
  );
}
