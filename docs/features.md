# Feature list

Every feature in one place — what it is, who it's for, how it works, and
whether it's built. Update this in the same PR as the code that ships or
changes a feature. For what's coming next, see `docs/roadmap.md`; this
file is the catalog, not the plan.

## Built

### Embeddable chat widget
**Who**: a business's site visitors. **What**: a script tag embeds a
chat widget, shadow-DOM isolated from host-site CSS, grounded only in
that business's knowledge. **How**: `app/api/widget/config/route.ts`
resolves the public `botKey` server-side (never a client-supplied
orgId/botId — `lib/db.ts`'s `resolveBotPublicKey`); `app/api/chat/
route.ts` runs the stateless chat loop.

### Bot engine (chat loop + tool calling)
**Who**: every conversation, every vertical. **What**: a model-gateway-
backed chat loop that calls Claude, retrieves knowledge via RAG, and
calls action tools when needed. **How**: `lib/ai/gateway.ts` (provider-
agnostic model interface, ADR 0002), `lib/ai/chat.ts` (the loop, parallel
tool calls, iteration guard), `lib/ai/systemPrompt.ts` (assembly +
prompt caching), `lib/ai/tools/registry.ts` (interface/connector split).

### Action tools
**Who**: the bot, mid-conversation. **What**: `search_knowledge_base`
(generic RAG retrieval, every vertical) and `check_order_status`
(ecommerce, Shopify Admin API, falls back to human handoff per
guardrail #4 if no integration is connected). **How**: `lib/ai/tools/`.

### Tool-call traceability
**Who**: whoever's debugging a bad answer. **What**: every tool call
during a chat turn is logged — input, output, whether its result made
the final answer — independent of the outcome. **How**: `ToolCallLog`
model, written from `lib/ai/chat.ts` (guardrail #6).

### Draft/publish bot configuration
**Who**: the business owner configuring their bot. **What**: editing
persona/guardrails/tools/appearance always updates the current draft;
publishing snapshots it and pins in-flight conversations to whatever
version they started on. **How**: `lib/ai/botConfig.ts`, `BotConfigVersion`
model (`docs/architecture.md` §5).

### Shopify connect flow
**Who**: an ecommerce business. **What**: self-serve OAuth "Connect
Shopify" from the console; once connected, `check_order_status` can look
up real orders instead of falling back to handoff. **How**: `lib/
integrations/provider.ts` (generic `IntegrationProvider` interface, so
adding a second platform doesn't touch the console UI), `shopify.ts`
adapter, `app/api/integrations/[provider]/callback/route.ts`.

### Console auth (email + password)
**Who**: business owners/admins signing into the console. **What**:
sign up, log in, session-based access to the console, auto-provisioned
org on first login. **How**: `lib/auth.ts` (Auth.js Credentials
provider), `lib/password.ts` (scrypt hashing), `app/login/`, `app/
signup/`. ADR 0006, superseding ADR 0004's Google OAuth.

### Tenant isolation
**Who**: every business, implicitly — this is what makes multi-tenancy
safe. **What**: one business's data (bots, knowledge, conversations,
config) can never leak into another's, enforced at the database layer,
not just application code. **How**: Postgres Row-Level Security,
`withOrgContext` (`lib/db.ts`), policies in `db/migrations/
0001_init_rls.sql`. ADR 0003. See `docs/security.md`.

### Console: bot list + bot editor + integrations page
**Who**: the business owner. **What**: list all bots, edit one bot's
full config, connect/disconnect integrations. **How**: `app/(console)/
bots/`. Design pass done on bot list + bot editor (`docs/design/
preview/bots-list.html`, `bot-editor.html`); integrations still open —
see `docs/roadmap.md`.

### Knowledge base ingestion (manual Q&A)
**Who**: the business owner. **What**: add/remove question-and-answer
pairs the bot can search when it needs a fact it doesn't already have —
closes the one gap that was keeping `search_knowledge_base` unusable in
practice (real retrieval, nothing to retrieve). **How**: `lib/ai/
knowledgeBase.ts`, `app/(console)/bots/[botId]/knowledge/`. File/URL
ingestion is separate, not-yet-built scope — see `docs/business-
logic.md`'s "Knowledge base ingestion" section.

## Planned

See `docs/roadmap.md` (Now/Next/Later). Notable near-term items: write-
capable action tools (refund, address update), resolution-rate
analytics, image input, file/URL knowledge ingestion, a design pass on
the integrations page.
