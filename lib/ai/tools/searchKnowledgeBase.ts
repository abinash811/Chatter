import { retrieveKnowledgeChunks } from "@/lib/ai/retrieval";
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
    const chunks = await retrieveKnowledgeChunks(orgId, botId, query);

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
