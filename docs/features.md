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
(generic RAG retrieval, every vertical), `collect_lead` (generic contact-
info capture, matches Chatbase's "Collect Leads" — every new tool added
going forward is industry-agnostic by default, per the 2026-09-27
scoping decision; only `check_order_status` stays ecommerce-specific),
`check_order_status` (ecommerce, Shopify Admin API, falls back to
human handoff per guardrail #4 if no integration is connected), and
**custom (business-defined) webhook actions** — see "Custom actions"
below. The first three are independently enable/disable-able per bot
from the bot editor's Tools tab (a card gallery — icon, name,
description, an enable/disable `Switch` per card, added 2026-09-27 to
match Chatbase's own Actions-page card layout, confirmed from real
screenshots, `docs/research/competitive-landscape.md`); custom actions
have their own enable/disable toggle on their own page instead (ADR
0022). **How**: `lib/ai/tools/`, `components/console/OptionCard.tsx`
(the shared card shape, reused by Knowledge's ingestion picker too).

### Custom actions
**Who**: the business owner. **What**: a per-bot "Actions" page
(`/bots/[botId]/actions`) to define a business's own webhook (URL,
method, headers, and what info to collect from the visitor) — matches
Chatbase's Custom Actions. The bot decides when to call it based on the
plain-language description the business owner writes; a failed or
blocked call always degrades to human handoff (guardrail #4), never a
guessed answer. Takes effect immediately on save/toggle, not gated
behind the bot's draft/publish cycle. Headers are encrypted at rest
(`lib/crypto.ts`); the URL is checked against an SSRF guard (https-only,
blocks loopback/private/link-local addresses including the cloud
metadata IP) before every call. No edit yet — delete and recreate.
**How**: `lib/customActions.ts` (CRUD), `lib/ai/tools/customAction.ts`
(the runtime `Tool` factory + SSRF guard), the `CustomAction` model.
ADR 0022.

### Demo data ("Load sample data")
**Who**: a new or non-technical user, or anyone demoing the product.
**What**: a one-click "Load sample data" button (`/bots`, next to "New
bot", and in the empty state) that creates a fully populated example
bot — a real persona, a published config, 3 knowledge Q&A entries, 2
leads, one custom action (disabled by default — its URL is a
placeholder), and 2 sample conversations (one flagged as an issue) —
so every console screen has real content to look at without a live
`ANTHROPIC_API_KEY`/`VOYAGE_API_KEY`. Every write goes through the same
tables and the same `withOrgContext` path a real chat turn or console
action would use — it's fake content, not a fake data path — except
where a step needs a live external call (embeddings, Claude), which
uses the same bypass `tests/e2e/helpers.ts` already used per-feature
(a placeholder embedding vector, direct `Conversation`/`Message`/
`ToolCallLog` writes). **How**: `lib/demoData.ts`, `loadSampleDataAction`
(`app/(console)/bots/actions.ts`).

### Leads
**Who**: the business owner. **What**: a per-bot "Leads" page
(`/bots/[botId]/leads`) listing contact info the `collect_lead` tool
captured — name/email/phone/note, most recent first. Matches Chatbase's
Leads dashboard; no CSV export yet. **How**: `lib/leads.ts`, the `Lead`
model (`prisma/schema.prisma`).

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

### Widget appearance editor
**Who**: the business owner. **What**: greeting text, accent color, an
avatar (a curated emoji, not an uploaded image — no file-storage infra
exists yet, see `docs/roadmap.md`), and widget position (bottom-right/
bottom-left), all editable from the bot editor's Appearance tab and
applied live in `public/widget.js` for every new visitor. **How**:
`lib/ai/appearanceOptions.ts` (the option lists — split out from
`botConfig.ts` so this client-facing form doesn't pull in server-only DB
code), `GET /api/widget/config` (`docs/api.md`).

### Persona template picker
**Who**: the business owner writing a bot's persona for the first time.
**What**: a "Start from a template" dropdown above the Persona tab's
textarea, 3 hardcoded ecommerce use cases (Support, Sales, Lead-gen).
Picking one replaces the persona text only — guardrails and enabled tools
are untouched (decoupled, not a bundle; see `docs/research/persona-
template-ux.md` for why). **How**: `lib/ai/personaTemplates.ts` (pure
data, same zero-dependency pattern as `appearanceOptions.ts`), an
uncontrolled-textarea ref in `BotEditorForm.tsx`.

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
**Who**: the business owner. **What**: list all bots (search, sort by
name/status/created, rename/duplicate/archive per row), edit one bot's
full config, connect/disconnect integrations. **How**: `app/(console)/
bots/`. Design pass done on bot list + bot editor (`docs/design/
preview/bots-list.html`, `bot-editor.html`); integrations still open —
see `docs/roadmap.md`.

### Bot archiving
**Who**: the business owner. **What**: removes a bot from the list and
kills its embed snippet without deleting its conversations, knowledge
base, or integrations — soft delete, not hard delete (ADR 0018, a
user-confirmed decision, not silently picked). No restore UI yet, only
directly against the database. **How**: `app/(console)/bots/actions.ts`'s
`archiveBotAction`, `Bot.archivedAt`. See `docs/business-logic.md`'s
"Bot archiving" section.

### Knowledge base ingestion (Q&A, file upload, URL)
**Who**: the business owner. **What**: three ways to feed a bot's
knowledge base — manual question-and-answer pairs, uploading a PDF/
DOCX/`.txt`/`.md` file, or ingesting a single URL's readable article
text (not a whole site — see `docs/open-questions.md` #4 on crawling).
Closes `docs/product-spec.md`'s MVP ingestion scope. The three entry
points are always-visible `OptionCard`s (2026-09-27, replaced a
DropdownMenu, matching Chatbase's Data sources page — see `docs/
research/competitive-landscape.md`), not a menu you open first. **How**: `lib/ai/
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

### Test your bot (preview)
**Who**: the business owner, before sharing the embed snippet with
anyone. **What**: a "Preview" button in the bot editor opens a slide-
over chat (matches Chatbase's own "Chat as user"/docked preview,
confirmed from real screenshots — `docs/research/competitive-
landscape.md`) that talks to the bot's actual published config through
the real chat loop — not a mock. Requires the bot to be published first
(a real visitor never sees a draft either); shows a plain-language
message instead of an error if it isn't, or if no Claude API key is
configured yet. Preview conversations are written to the same tables a
real visitor's are, so they show up in `/conversations` too — same
behavior as the reference product's own Playground. **How**:
`PreviewSheet.tsx`, `sendPreviewMessageAction` (`app/(console)/bots/
[botId]/actions.ts`), calling `lib/ai/chat.ts`'s `sendMessage` directly.

### Conversation inbox
**Who**: the business owner — a non-technical reviewer, not a developer.
**What**: `/conversations` — a filterable list (by bot, date, "has an
issue") of every widget conversation, and `/conversations/
[conversationId]` — the full message transcript with each tool call
shown as a plain-language summary ("Looked up order #1234 — found it.")
rather than raw JSON; the raw input/output stays available behind a
"Technical details" disclosure. Dashboard-only for v1, no email/Slack
push. **How**: `lib/conversations.ts`, each tool's own
`describeForInbox` (`lib/ai/tools/*.ts`), `components/console/
{ConversationsTable,ConversationFilters,ConversationThread}.tsx`. ADR
0015 + ADR 0016. No `status`/"resolved" concept yet — see `docs/open-
questions.md` #7.

## Planned

See `docs/roadmap.md` (Now/Next/Later). Notable near-term items: write-
capable action tools (refund, address update), resolution-rate
analytics, image input, a design pass on the integrations page.
