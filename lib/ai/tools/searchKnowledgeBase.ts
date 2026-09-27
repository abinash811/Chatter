import { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/db";
import { getEmbeddingsProvider } from "@/lib/ai/embeddings";
import { registerTool, type Tool } from "@/lib/ai/tools/registry";

// Generic across every vertical (guardrail #2) — RAG retrieval as a tool
// call, not a hardcoded context prepend, per docs/architecture.md §2.
export const searchKnowledgeBaseTool: Tool = {
  name: "search_knowledge_base",
  description:
    "Search this business's knowledge base (docs, FAQs, catalog) for information relevant to the visitor's question. Use this whenever you need a fact you don't already have in the conversation.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        // Query rewriting (docs/ai-tech-radar.md's Retrieval & search
        // section): the query is embedded and searched on its own, with
        // no other conversation context — a bare follow-up like "what
        // about international ones?" embeds and matches poorly on its
        // own. Since this model already sees the full conversation when
        // deciding to call this tool, the fix costs no new model call —
        // just instructing it to resolve context into the query text
        // itself before searching.
        description:
          "What to search for — a fully self-contained question, not a bare follow-up. Resolve any pronouns or implicit topic from earlier in the conversation into the query text itself. For example, if the visitor previously asked about the refund policy and then says \"what about international orders?\", search for \"refund policy for international orders\", not \"international orders\" alone.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },

  async handle(orgId, botId, input) {
    const query = input.query as string;
    const embedding = await getEmbeddingsProvider().embed(query);
    const vectorLiteral = `[${embedding.join(",")}]`;

    // Hybrid search (ADR 0021): combines pgvector's semantic search with
    // Postgres native full-text search via Reciprocal Rank Fusion — the
    // exact pattern from Supabase's own reference implementation
    // (supabase/supabase's hybrid-search.mdx `hybrid_search()` function,
    // read directly, not just summarized), adapted here since our
    // embedding index uses cosine distance (vector_cosine_ops, matching
    // Voyage embeddings which aren't guaranteed pre-normalized) instead
    // of their inner-product example. Matched precisely, not just "close
    // enough": ts_rank_cd (cover density — accounts for term proximity,
    // not plain ts_rank), the candidate-pool formula
    // least(match_count, 30) * 2 (10 here, for our match_count of 5, not
    // an arbitrary round number), full_text_weight/semantic_weight = 1
    // (implicit, no tuning surface yet), and rrf_k = 50 — all their
    // documented defaults. withOrgContext sets app.org_id for this
    // transaction, so RLS already scopes this query to orgId — the botId
    // filter narrows further to this specific bot's sources within that
    // org.
    const MATCH_COUNT = 5;
    const CANDIDATE_LIMIT = Math.min(MATCH_COUNT, 30) * 2;
    const chunks = await withOrgContext(orgId, (tx) =>
      tx.$queryRaw<{ content: string; kind: string; title: string }[]>(Prisma.sql`
        with full_text as (
          select kc.id, row_number() over (
            order by ts_rank_cd(kc.content_tsv, websearch_to_tsquery('english', ${query})) desc
          ) as rank_ix
          from knowledge_chunks kc
          join knowledge_sources ks on ks.id = kc."sourceId"
          where ks."botId" = ${botId}
            and kc.content_tsv @@ websearch_to_tsquery('english', ${query})
          order by rank_ix
          limit ${CANDIDATE_LIMIT}
        ),
        semantic as (
          select kc.id, row_number() over (order by kc.embedding <=> ${vectorLiteral}::vector) as rank_ix
          from knowledge_chunks kc
          join knowledge_sources ks on ks.id = kc."sourceId"
          where ks."botId" = ${botId}
          order by rank_ix
          limit ${CANDIDATE_LIMIT}
        )
        select kc.content, ks.kind, ks.title
        from full_text
        full outer join semantic on full_text.id = semantic.id
        join knowledge_chunks kc on coalesce(full_text.id, semantic.id) = kc.id
        join knowledge_sources ks on ks.id = kc."sourceId"
        order by
          coalesce(1.0 / (50 + full_text.rank_ix), 0.0) +
          coalesce(1.0 / (50 + semantic.rank_ix), 0.0) desc
        limit ${MATCH_COUNT}
      `),
    );

    if (chunks.length === 0) {
      return "No relevant information found in the knowledge base.";
    }
    // A manually-entered Q&A pair (lib/ai/knowledgeBase.ts) reads better
    // to the model with its question restated alongside the answer, not
    // just the bare answer text. A file/URL chunk is one fragment of a
    // larger document (ADR 0013) — naming its source title gives the
    // model the same kind of context the qa case gets for free.
    return chunks
      .map((c) => (c.kind === "qa" ? `Q: ${c.title}\nA: ${c.content}` : `From "${c.title}":\n${c.content}`))
      .join("\n\n---\n\n");
  },

  // ADR 0016: unlike check_order_status, this tool's output is a plain
  // string, not structured JSON — its own "nothing found" sentence
  // (returned above) is the one signal this tool has for "the visitor
  // didn't get an answer," so it's matched literally rather than parsed.
  describeForInbox(input, output) {
    const query = input.query as string;
    const noResults = output === "No relevant information found in the knowledge base.";
    return {
      summary: noResults
        ? `Searched the knowledge base for "${query}" — nothing found.`
        : `Searched the knowledge base for "${query}".`,
      isIssue: noResults,
    };
  },
};

registerTool(searchKnowledgeBaseTool);
