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
human handoff per guardrail #4 if no integration is connected),
`request_order_cancellation` (ecommerce, write-capable, queues for
human approval — see "Order cancellation (approval-gated)" below), and
**custom (business-defined) webhook actions** — see "Custom actions"
below. The first four are independently enable/disable-able per bot
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
**"Test this action"** (2026-09-29): a Test button in the Add-action
dialog fires a real request with typed-in sample values, before saving
— closes the biggest gap found comparing against Chatbase's own real
custom-action builder (which offers the same "test with live data"
step; read from their actual docs, not a summary). Shows the raw HTTP
status and response body, so a business owner can confirm their own
endpoint actually works without needing a developer, rather than
finding out it's broken from a real visitor. Reuses the exact same
request-building code (`performActionRequest`,
`lib/ai/tools/customAction.ts`) the live bot tool call uses once saved,
so a passing test means the real thing behaves the same way; runs the
same SSRF guard. Nothing from a test is stored. **How**:
`lib/customActions.ts` (CRUD), `lib/ai/tools/customAction.ts` (the
runtime `Tool` factory + SSRF guard + shared `performActionRequest`),
`testCustomActionAction` (`actions.ts`), the `CustomAction` model. ADR
0022.

**Known remaining gaps vs. Chatbase's real custom-action builder**
(compared against their actual docs, not a summary): no typed inputs
(everything is a plain string, not Text/Number/Boolean), no separate
query-parameter section distinct from the body (routing is inferred
from HTTP method only), and no JSON body templating (the body is
always the flat input object, can't target a nested/specific shape).
Not started — flagged to the user, not silently deferred.

### In-chat widgets
**Who**: the business owner (builds the widget) and the bot's visitor
(fills it in). **What**: a form the bot can render inline in the chat
— up to 4 typed fields (text/number/checkbox/dropdown) — instead of
collecting structured info through plain back-and-forth text. Matches
the smallest useful slice of Chatbase's real "Widgets" feature (read
from their actual docs, not guessed — see ADR 0028): a Schema-driven
form, not yet their fuller Functions/States/rich-component system. A
new `/bots/[botId]/widgets` console page defines each widget (name,
when the bot should show it, its fields); the bot decides when to
trigger one based on the plain-language trigger description, exactly
like any other tool. The visitor's filled-in answers come back as
their own next chat message — no separate submission endpoint. Not
draft/publish-gated, same precedent as Custom actions (ADR 0022):
takes effect immediately on save/toggle. **How**: `lib/widgets.ts`
(CRUD + JSON Schema conversion), `lib/ai/tools/widget.ts` (the dynamic
tool factory — `handle()` returns a tagged JSON string, the same
structured-signaling pattern every other tool already uses),
`lib/ai/chat.ts` (merges enabled widget tools into every turn, scans
tool results for the tag), `public/widget.js` + `PreviewSheet.tsx`
(inline form rendering — vanilla JS and React respectively, both
matching each surface's own design system). ADR 0028.

**Phase 2 — Functions (2026-09-30)**: a widget's submit can optionally
call a real API instead of just collecting text. The Add dialog gains a
"Call an API when this form is submitted" checkbox (progressive
disclosure — collection-only widgets never see Method/URL/Headers);
checking it stores an encrypted-header, SSRF-guarded (reuses
`isBlockedActionUrl`/`performActionRequest` from Custom Actions, ADR
0022) endpoint on the widget. A write-capable Function never calls the
API directly — it queues the same `PendingAction` human-approval queue
write-capable Custom Actions use (ADR 0023); approving it dispatches
the real call via `executeWidgetSubmission`. The widgets table shows
the outcome at a glance: "Message only" / "Calls API" / "Calls API —
needs approval". **How**: `lib/ai/tools/widget.ts`'s
`buildWidgetSubmitTool`/`executeWidgetSubmission`,
`app/(console)/bots/[botId]/approvals/actions.ts` (dispatches on the
`submit_widget_` tool-name prefix). ADR 0028.

**Deliberately not built** (States/multi-view widgets and a richer
component library beyond the 4 field types above — `docs/open-
questions.md` #9).

### Order cancellation (approval-gated)
**Who**: the bot proposes it, the business owner decides. **What**: a
write-capable action tool — the first one, and a new risk category
(ADR 0023). `request_order_cancellation` never calls Shopify itself: it
validates the order exists and isn't already cancelled, then queues a
`PendingAction` and tells the visitor a human will review it — it never
claims the order is cancelled. The business owner reviews and
approves/rejects from a new per-bot "Approvals" page
(`/bots/[botId]/approvals`); only approving actually calls Shopify's
`orderCancel` GraphQL mutation. A failed approved-execution (e.g. no
Shopify integration connected, or Shopify's own `userErrors`) shows the
real failure reason on the row, never a false success. Requires the
`write_orders` OAuth scope — a store connected before this change must
reconnect. **How**: `lib/ai/tools/cancelOrder.ts` (the tool + the
separately-exported `executeOrderCancellation`), `lib/pendingActions.ts`
(the generic queue, deliberately with no knowledge of any specific
tool), `app/(console)/bots/[botId]/approvals/` (the console page + the
one place that maps a toolName to its executor), the `PendingAction`
model. ADR 0023.

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
exists yet, see `docs/roadmap.md`), widget position (bottom-right/
bottom-left), and up to 3 suggested-reply buttons (2026-09-27, matches
Chatbase's own reference UI — confirmed from real screenshots,
`docs/research/competitive-landscape.md`) shown once, under the widget's
first message, so a visitor has something to tap instead of a blank
input — clicking one sends it exactly like typing it. All editable from
the bot editor's Appearance tab and applied live in `public/widget.js`
for every new visitor. **How**: `lib/ai/appearanceOptions.ts` (the
option lists — split out from `botConfig.ts` so this client-facing form
doesn't pull in server-only DB code), `GET /api/widget/config`
(`docs/api.md`).

### Persona template picker
**Who**: the business owner writing a bot's persona for the first time.
**What**: a "Start from a template" dropdown above the Persona tab's
textarea, 3 hardcoded ecommerce use cases (Support, Sales, Lead-gen).
Picking one replaces the persona text only — guardrails and enabled tools
are untouched (decoupled, not a bundle; see `docs/research/persona-
template-ux.md` for why). **How**: `lib/ai/personaTemplates.ts` (pure
data, same zero-dependency pattern as `appearanceOptions.ts`), an
uncontrolled-textarea ref in `BotEditorForm.tsx`.

### Model tier + temperature picker
**Who**: the business owner configuring a bot's underlying AI behavior.
**What**: a "Model" card in the Persona tab (below the persona text) —
an AI Model dropdown (Sonnet/Haiku/Opus, all Claude, no multi-vendor
picker) and a Temperature slider that's genuinely adjustable only for
Haiku — the Anthropic API rejects any non-1.0 temperature on models
released after Claude Opus 4.6, which covers Sonnet and Opus, verified
against the SDK's own type definitions (ADR 0026). Switching to a
temperature-locked model disables the slider and resets it to 1.0 with
a plain-language explanation, rather than leaving a control that would
silently no-op or fail in production. **How**: `BotConfigVersion.model`/
`.temperature` (defaults match the engine's pre-existing hardcoded
values, so no backfill needed), `lib/ai/modelOptions.ts` (tier data +
the `supportsTemperature` flag), `ModelTabContent.tsx`, enforced
independently server-side in `actions.ts`'s `saveDraftAction` (never
trusting the disabled-control convention alone).

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

### Data sources / knowledge base ingestion (Q&A, file, URL, text snippet)
**Who**: the business owner. **What**: four ways to feed a bot's
knowledge base — manual question-and-answer pairs, uploading a PDF/
DOCX/`.txt`/`.md` file, ingesting a URL (a single page's readable
article text by default, or the "Crawl this site" checkbox to pull up
to 20 pages via real sitemap-first, robots.txt-respecting crawling,
2026-09-30, ADR 0030), or pasting a raw text snippet directly
(2026-09-29, no file/URL round trip). Closes `docs/product-spec.md`'s
MVP ingestion scope. The four entry points are always-visible
`OptionCard`s (matching Chatbase's Data sources page — see `docs/
research/competitive-landscape.md`), not a menu you open first. The
page itself (renamed "Knowledge base" → "Data sources," 2026-09-29,
matching Chatbase's own naming) also has search, a type filter, a sort
dropdown (Newest/Oldest/Title — same `@tanstack/react-table` + `nuqs`
URL-persisted pattern as the bots list, ADR 0024), a bulk-select mode
with checkboxes and a bulk-delete confirm dialog, and an informational
total-size indicator (no plan-based cap — `docs/open-questions.md`
#6's billing-tier question is unresolved, so there's nothing to show a
cap against, unlike Chatbase's "X KB / 1 MB"). JS-rendered pages (a
React/Vue site whose real content only exists after its own JavaScript
runs) now ingest correctly too — `extractUrlText` retries with a real
headless Chromium when a plain fetch finds too little text (2026-10-02,
ADR 0031; self-hosted, not a rented vendor). Scheduled re-crawling
stays explicitly deferred (ADR 0030 — no background-job infrastructure
yet). Notion-page and helpdesk-ticket sources are out of scope — Notion
needs a full OAuth connector build, and tickets is Chatbase's own
paywalled helpdesk integration, not a generic knowledge source. **How**:
`lib/ai/knowledgeBase.ts` (source/chunk writes, `createTextEntry`,
`createCrawledEntries`, `getTotalKnowledgeBytes`), `lib/ai/
extraction.ts` (PDF via `pdf-parse`, DOCX via `mammoth`, URL via
`jsdom`+`@mozilla/readability`, JS-rendering fallback via `playwright`),
`lib/ai/crawler.ts` (`crawlSite` — `robots-parser` + `sitemapper`
discovery, ADR 0030), `lib/ai/chunking.ts` (hand-rolled recursive
splitter for file/URL/text),
`app/(console)/bots/[botId]/knowledge/`. ADR 0013, ADR 0030, ADR 0031. See
`docs/business-logic.md`'s "Knowledge base ingestion" section.

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

### Conversation inbox (Activity)
**Who**: the business owner — a non-technical reviewer, not a developer.
**What**: `/conversations` — a split-pane Activity layout (list left,
Chat/Details panel right), rebuilt 2026-09-29 (ADR 0027) to match
Chatbase's own real Activity section (recreated from their actual docs,
`docs/user-guides/chatbot/activity` and the pause/resume API reference —
not guessed). Filterable by bot, date, "has an issue", and status
(ongoing/paused). Clicking a row opens `/conversations/[conversationId]`
with two tabs: **Chat** — the full transcript, each tool call shown as a
plain-language summary ("Looked up order #1234 — found it.") rather than
raw JSON, the raw input/output behind a "Technical details" disclosure
(ADR 0016); **Details** — Contact (from a linked Lead, else
"Anonymous"), Source (Widget/Playground), Status, message count, Created,
Last activity, and the Conversation ID. Sentiment and Country show
honest "Not analyzed"/"Not tracked" states rather than fabricated values
— matches Chatbase's own real "unanalyzed" UI, not invented data
(guardrail #4). A business owner can **pause/resume** a conversation
(the bot stops replying but still records incoming visitor messages,
`public/widget.js` degrades gracefully when `reply` is `null`) and
**bulk-select + export to CSV**. Dashboard-only for v1, no email/Slack
push. **How**: `lib/conversations.ts` (`status`/`source`/`contact`/
`lastActivityAt`, `setConversationStatus`), `app/(console)/conversations/
shared.ts` (the list-data loader shared by both routes, since
`searchParams` isn't available in a shared layout), `app/(console)/
conversations/actions.ts` (`toggleConversationPauseAction`),
`components/console/{ConversationsSplitView,ConversationListPane,
ConversationDetailPanel,ConversationFilters,ConversationThread}.tsx`,
`lib/csvExport.ts`. ADR 0015 + ADR 0016 + ADR 0027. **Not built**, same
as Chatbase docs would require real work we haven't scoped: Sentiment
analysis, Country/IP geolocation, a Confidence-score metric, voice
sessions (out of scope, `docs/north-star.md`), Procedures. `docs/open-
questions.md` #7 ("resolved" status semantics) is still open — the new
`status` field is about AI-reply availability (ongoing/paused), a
different concept from "resolved for analytics."

### Guardrails Phase 1 — rate limiting + spam detection
**Who**: the business owner (configures) and the bot's visitor (subject
to it). **What**: opt-in abuse protection on the bot editor's Guardrails
tab, a second Card ("Abuse protection") below the existing content-
guardrail textarea — off by default, no change to an existing bot until
enabled. **Rate limiting**: a max-messages-per-window cap (custom
"limit reached" message) enforced per conversation. **Spam detection**:
at message-count checkpoints (2nd/4th/8th/16th), a cheap Haiku call
classifies recent messages against the business's own guidance text; a
flagged conversation is auto-paused, reusing the same pause mechanism a
human uses (ADR 0027). Matches Chatbase's own documented "Guardrails"
feature, minus country/IP blocking (deferred, `docs/open-questions.md`
#10 — needs a geolocation-vendor decision). **How**:
`lib/ai/abuseProtectionOptions.ts` (types/defaults/parsing),
`lib/ai/abuseProtection.ts` (`checkRateLimit`, `isSpamCheckpoint`,
`classifyRecentMessagesAsSpam`), wired into `lib/ai/chat.ts`'s
`sendMessage` before the model call, `BotConfigVersion.abuseProtection`
(JSON), `AbuseProtectionTabContent.tsx`. ADR 0029.

## Planned

See `docs/roadmap.md` (Now/Next/Later). Notable near-term items: write-
capable action tools (refund, address update), resolution-rate
analytics, image input, a design pass on the integrations page.
