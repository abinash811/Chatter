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
      query: { type: "string", description: "What to search for." },
    },
    required: ["query"],
    additionalProperties: false,
  },

  async handle(orgId, botId, input) {
    const query = input.query as string;
    const embedding = await getEmbeddingsProvider().embed(query);
    const vectorLiteral = `[${embedding.join(",")}]`;

    // withOrgContext sets app.org_id for this transaction, so RLS already
    // scopes this query to orgId — the botId filter narrows further to
    // this specific bot's sources within that org.
    const chunks = await withOrgContext(orgId, (tx) =>
      tx.$queryRaw<{ content: string }[]>(Prisma.sql`
        select kc.content
        from knowledge_chunks kc
        join knowledge_sources ks on ks.id = kc."sourceId"
        where ks."botId" = ${botId}
        order by kc.embedding <=> ${vectorLiteral}::vector
        limit 5
      `),
    );

    if (chunks.length === 0) {
      return "No relevant information found in the knowledge base.";
    }
    return chunks.map((c) => c.content).join("\n\n---\n\n");
  },
};

registerTool(searchKnowledgeBaseTool);
