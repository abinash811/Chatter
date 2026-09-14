# Research note: How production AI support/sales agents handle tool-calling

Date: 2026-09-14
Researcher: Claude (web search)
Status: solid grounding on the core question; open items noted below

## Why this research

To answer concretely: for Chatter's bot engine, do we build our own MCP
server for tool-calling (order lookup, booking, etc.), or use native
tool-use? Rather than reasoning from first principles, this looks at what
real, shipping companies in this exact space (AI customer support/sales
agents) actually do in production, plus what the broader "MCP vs function
calling" literature says about where each wins.

## How real competitors architect their live agent loop

None of the major AI customer-support/sales agent products expose their
core, customer-facing conversation loop through MCP. Each runs a
proprietary, custom engine:

- **Intercom Fin** — the "Fin AI Engine," six purpose-built layers: query
  refinement, retrieval (custom `fin-cx-retrieval` model), reranking
  (custom `fin-cx-reranker` model), response generation, accuracy
  validation, engine optimization.
- **Decagon** — "Agent Operating Procedures" (AOPs): modular bundles of
  prompts, logic, actions, and rules per workflow. Reported trade-off:
  powerful for complex workflows, harder to debug as it grows.
- **Sierra** — proprietary system, simulation-based testing, deployed by
  dedicated "Agent Engineers" via a TypeScript SDK. Full implementations
  reported to take months (depth over speed, unlike Decagon).
- **Ada** — a "Unified Reasoning Engine" orchestrating multiple LLM
  providers (OpenAI primary, plus Anthropic/Azure/Bedrock) behind one
  layer so behavior is consistent across channels (chat, phone, WhatsApp).
- **Chatbase** — RAG on top of OpenAI/Anthropic models with a proprietary
  prompt architecture for accuracy/brand-voice consistency across models;
  no MCP mentioned in its architecture.

None of these describe MCP as part of the live customer-facing tool-calling
path.

## MCP vs. native function calling: the actual production split

This is the key finding, from multiple independent sources converging on
the same answer:

- **Function calling** (native tool-use) is what app-specific, in-product,
  production agents use for their hot path. It wins on **reliability,
  token cost, and per-user auth** — no extra network hop, no separate
  process to keep alive, scoping is enforced in the same request context.
- **MCP** is the right fit for **prototypes, internal agents, developer
  tooling, and reusable integrations shared across multiple agents/
  products** — cases where your own engineers supervise the calls and
  setup speed / reusability matters more than shaving latency or cost.
- Hard data point: in a fall-2025 survey of several hundred teams building
  agent integrations, **fewer than 10 kept MCP in production** for their
  core agent loop.
- The common real-world pattern is a **hybrid**, not one-or-the-other: a
  single agent request might use native function calling for in-product
  logic and validation, while also calling out to one or more MCP servers
  for external integrations — in the same turn.

## Implication for Chatter

Two different jobs, two different mechanisms:

1. **The live chat loop** (Claude conversing with a visitor, deciding to
   retrieve or act) → native tool-use, in-process in our backend. This is
   the RAG-retrieval tool and the vertical action-tool *definitions*
   themselves. Matches every real competitor found here, and matches the
   "start narrow, 3-5 precise tools" guidance already logged in
   `docs/research/competitive-landscape.md`.
2. **Where a tool actually reaches into a specific business's external
   system** (their booking software, inventory API, a partner
   institution's API) → this is where an MCP server is the right shape —
   engineer-owned, not part of the model's hot-path reasoning loop, built
   for integration reuse across businesses/verticals. This mirrors the
   pattern the user's own company already runs for external institution
   integrations, and matches MCP's actual production sweet spot from the
   research above (internal, engineer-supervised, reusable integration
   layer).

This resolves `docs/open-questions.md` item 6 ("how do action tools reach a
business's real systems") in favor of: native tool-use tools that, when
they need to reach an external system, call our own MCP server(s), rather
than either (a) a generic ad-hoc webhook per business, or (b) putting MCP
directly in the model's live tool-calling path. Not yet written as an ADR —
holding off per the user's request to decide slowly.

## Security/isolation findings worth designing against explicitly

Relevant to CLAUDE.md guardrails #1 (tenant isolation) and #5 (no secrets
in client code), found directly in the MCP production literature, not
theorized:

- A multi-tenant MCP server must isolate each tenant's credentials, tool
  definitions, and data — the MCP spec itself does not define a model for
  this; it has to be built.
- Real operational pain points reported: token TTL tracking, refresh
  rotation, and exponential backoff per connected tenant; every external
  system (Salesforce, HubSpot, Jira, etc.) has different rate-limit
  behavior, and a fast LLM can trigger 429s easily — circuit breakers and
  retry logic are necessary, not optional.
- Security data point: of 30+ MCP-related CVEs filed in early 2026, 43%
  involved command injection, and 53% of open-source MCP server
  implementations relied on static credentials instead of OAuth. If we
  build our own MCP server, OAuth-based per-tenant credentials (not static
  keys) should be a hard requirement from the start, not a v2 fix.
- Multi-tenant RAG guidance (separate from MCP, but same isolation
  concern): enforce a `tenant_id` filter at the vector database query
  layer itself, not just in application logic above it — matches
  guardrail #1's "enforced at the data layer, not just the application
  layer" language already in `docs/architecture.md`.

## TODO — still open

- Concrete transport choice for our MCP server if/when we build it
  (Streamable HTTP is the recommended transport for remote/multi-tenant
  use per this research; STDIO is for local/single-user only).
- Whether to build one shared multi-tenant MCP server or per-vertical
  instances — still needs an answer from how the user's own company's
  existing console+MCP pattern handles this, asked but not yet answered.
- Vector DB choice for multi-tenant RAG at scale (separate open question,
  tracked in `docs/open-questions.md`).

Sources:
- https://www.braintrust.dev/articles/best-ai-customer-service-agents-2026
- https://fin.ai/learn/fin-vs-sierra
- https://fin.ai/learn/ai-customer-service-agents-compared
- https://cresta.com/guides/decagon-vs-sierra
- https://www.respan.ai/resources/customer-service-architecture
- https://truto.one/blog/what-is-mcp-model-context-protocol-the-2026-guide-for-saas-pms/
- https://workos.com/blog/everything-your-team-needs-to-know-about-mcp-in-2026
- https://albato.com/blog/publications/embedded-multi-tenant-mcp-saas
- https://fast.io/resources/ai-agent-multi-tenant-architecture/
- https://www.actian.com/blog/developer/how-to-build-a-multi-tenant-rag-for-customer-support/
- https://vdf.ai/blog/private-rag-multi-tenant-data-architecture/
- https://www.chatbase.co/blog/chatbase-vs-custom-chatbot
- https://www.ada.cx/platform/
- https://nango.dev/blog/mcp-vs-tool-calls-for-ai-agents
- https://fast.io/resources/function-calling-vs-mcp/
- https://www.arcade.dev/blog/what-is-ai-agent-tool-calling/
