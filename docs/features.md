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

### Knowledge base ingestion (Q&A, file upload, URL)
**Who**: the business owner. **What**: three ways to feed a bot's
knowledge base — manual question-and-answer pairs, uploading a PDF/
DOCX/`.txt`/`.md` file, or ingesting a single URL's readable article
text (not a whole site — see `docs/open-questions.md` #4 on crawling).
Closes `docs/product-spec.md`'s MVP ingestion scope. **How**: `lib/ai/
knowledgeBase.ts` (source/chunk writes), `lib/ai/extraction.ts` (PDF via
`pdf-parse`, DOCX via `mammoth`, URL via `jsdom`+`@mozilla/readability`),
`lib/ai/chunking.ts` (hand-rolled recursive splitter for file/URL text),
`app/(console)/bots/[botId]/knowledge/`. ADR 0013. See `docs/business-
logic.md`'s "Knowledge base ingestion" section.

### Onboarding
**Who**: a brand-new signup. **What**: a single combined screen (name
your workspace, name your first bot) instead of a silently
auto-provisioned org and an empty bots list — lands straight in the new
bot's editor. **How**: `lib/onboarding.ts`, `app/onboarding/`. ADR 0012.
No template picker or teammate invites yet — see `docs/business-
logic.md`'s "Onboarding" section.

### Settings + BYOA (bring your own Claude API key)
**Who**: the business owner. **What**: rename the workspace; optionally
plug in their own Anthropic API key so bots run on their own account and
billing instead of our managed key. Off by default. **How**: `app/
(console)/settings/`, `lib/ai/gateway.ts`'s `getModelGateway(apiKey?)`,
`lib/crypto.ts` for encryption at rest. ADR 0012.

### Conversation inbox
**Who**: the business owner, for human handoff. **What**: `/conversations`
— a filterable list (by bot, date, handoff-triggered) of every widget
conversation, and `/conversations/[conversationId]` — the full message
transcript with tool calls rendered inline. Dashboard-only for v1, no
email/Slack push. **How**: `lib/conversations.ts`,
`components/console/{ConversationsTable,ConversationFilters,
ConversationThread}.tsx`. ADR 0015. No `status`/"resolved" concept yet —
see `docs/open-questions.md` #7.

## Planned

See `docs/roadmap.md` (Now/Next/Later). Notable near-term items: write-
capable action tools (refund, address update), resolution-rate
analytics, image input, a design pass on the integrations page.
