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
    // Postgres native full-text search (tsvector/ts_rank, not a BM25
    // extension — see the ADR for why) via Reciprocal Rank Fusion,
    // matching the pattern Supabase documents and Chatbase's own
    // infrastructure validates. Each candidate set is capped at 30
    // before fusing down to the top 5 actually returned — RRF needs a
    // wider candidate pool than the final result count to have anything
    // meaningful to fuse. rrf_k = 50 matches Supabase's documented
    // default. withOrgContext sets app.org_id for this transaction, so
    // RLS already scopes this query to orgId — the botId filter narrows
    // further to this specific bot's sources within that org.
    const chunks = await withOrgContext(orgId, (tx) =>
      tx.$queryRaw<{ content: string; kind: string; title: string }[]>(Prisma.sql`
        with vector_search as (
          select kc.id, row_number() over (order by kc.embedding <=> ${vectorLiteral}::vector) as rank
          from knowledge_chunks kc
          join knowledge_sources ks on ks.id = kc."sourceId"
          where ks."botId" = ${botId}
          order by kc.embedding <=> ${vectorLiteral}::vector
          limit 30
        ),
        fulltext_search as (
          select kc.id, row_number() over (
            order by ts_rank(kc.content_tsv, websearch_to_tsquery('english', ${query})) desc
          ) as rank
          from knowledge_chunks kc
          join knowledge_sources ks on ks.id = kc."sourceId"
          where ks."botId" = ${botId}
            and kc.content_tsv @@ websearch_to_tsquery('english', ${query})
          limit 30
        )
        select kc.content, ks.kind, ks.title,
          coalesce(1.0 / (50 + v.rank), 0.0) + coalesce(1.0 / (50 + f.rank), 0.0) as score
        from knowledge_chunks kc
        join knowledge_sources ks on ks.id = kc."sourceId"
        left join vector_search v on v.id = kc.id
        left join fulltext_search f on f.id = kc.id
        where v.id is not null or f.id is not null
        order by score desc
        limit 5
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
