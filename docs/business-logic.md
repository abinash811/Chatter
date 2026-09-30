# Business logic

How Chatter's core flows actually work — consolidated here instead of
only existing as scattered code comments. See `docs/glossary.md` for
any unfamiliar term. Update this in the same PR as the code it
describes, or it goes stale exactly like the thing it exists to
prevent.

## Onboarding (`lib/onboarding.ts`, ADR 0012)

A brand-new account's org is auto-provisioned at first login
(`lib/auth.ts`'s `jwt` callback) with a placeholder name and
`onboardedAt: null`. `app/(console)/layout.tsx` redirects every console
page to `/onboarding` until that's set — there's no way to reach `/bots`
(or any other console page) with an unnamed org and zero bots.

`/onboarding` is a single combined screen (workspace name + first bot's
name), deliberately not a multi-step wizard: there's no template picker
step at all (ADR 0019 — no vertical-template layer), and inviting
teammates is separate, larger scope with no design done yet. Submitting sets
`org.name` + `org.onboardedAt`, creates the first bot, and redirects
straight into that bot's editor — a brand-new account never sees an
empty `/bots` list.

A brand-new account never sees the empty `/bots` list at signup — but
archiving that first (and only) bot reaches it again; see "Bot archiving"
below.

## Bot archiving (`app/(console)/bots/actions.ts`, ADR 0018)

Removing a bot from the console sets `Bot.archivedAt`, never a real
`DELETE` — see ADR 0018 for why (a business's conversation history is
exactly the data guardrail #6's traceability requirement exists to keep
around). An archived bot: disappears from `/bots` and every bot picker
(top-bar switcher, conversations filter), 404s via the plain-language
error boundary if its console URL is visited directly, and stops
resolving via the widget's `botKey` (`lib/db.ts`'s
`resolveBotPublicKey` now checks `archivedAt` after resolving the key,
returning the same "invalid botKey" response as a key that never
existed). Its config versions, knowledge sources, integrations, and
conversations are untouched.

There is no restore path in the console yet — only directly against the
database. Every bot-fetching query in the app must filter
`archivedAt: null`; there's no structural enforcement for this the way
`withOrgContext` enforces tenant isolation, so a new query that forgets
the filter is a real, silent way for an archived bot to reappear.

**Duplicate** (`duplicateBotAction`) clones a bot's latest persona/
guardrails/tools/appearance into a brand-new bot and redirects into its
editor. It deliberately does not copy conversations, knowledge sources,
or integrations — those belong to the source bot's own history/
connections, not to "what this bot is configured to do."

## BYOA — bring your own Anthropic API key (`/settings`, ADR 0012)

Optional, per-org, off by default. `Org.anthropicApiKeyEncrypted` is
null unless a business sets their own key from `/settings`; `lib/ai/
chat.ts` decrypts it (if set) and passes it to `getModelGateway(apiKey)`
— `lib/ai/gateway.ts`'s `ClaudeGateway` uses it for the Anthropic SDK
client instead of the SDK's own `ANTHROPIC_API_KEY` env default. One
lookup per request, reused across every bot in that org (an API key is
a billing-account-level credential, not a per-bot one). Nothing past
that point — tools, RAG, the chat loop itself — knows or cares which
key served the call.

The real key is never sent back to the browser once saved: `/settings`
shows only "a key is set" and a masked input, never the decrypted
value. See "Secrets encryption at rest" below.

## Secrets encryption at rest (`lib/crypto.ts`, ADR 0012)

AES-256-GCM via Node's built-in `crypto`, keyed by `ENCRYPTION_KEY` (a
32-byte key, base64, required env var). Applied to both
`Org.anthropicApiKeyEncrypted` (BYOA, above) and `Integration.
accessToken` (Shopify OAuth tokens) — the latter had stood with a
literal "encryption mechanism TODO" comment until this closed it in the
same pass BYOA was built, rather than leaving two different
plaintext-secret gaps side by side. Authenticated encryption: a
tampered or corrupted ciphertext fails to decrypt instead of silently
returning garbage. No key-rotation tooling exists yet — rotating
`ENCRYPTION_KEY` would require re-encrypting every stored secret by
hand; a known gap, not a v1 blocker (see ADR 0012's Consequences).

## Draft / publish (bot configuration)

A bot has at most one **draft** row at a time (`BotConfigVersion` with
`status: draft`). Editing persona/guardrails/tools/appearance always
updates that same row in place — it's a live scratchpad, not a new
version per keystroke.

**Publishing** flips that row's status to `published` and stamps
`publishedAt`. That row is now immutable — never touched again. The
next edit after publishing creates a brand-new draft row, seeded from
what was just published (not blank).

**Why this matters**: a visitor mid-conversation is pinned to whatever
was published when their conversation started (`Conversation.
configVersionId`). A business editing their bot never changes what an
in-progress visitor experiences mid-chat — see `lib/ai/botConfig.ts`.

## The chat loop (`lib/ai/chat.ts`'s `sendMessage`)

1. Load the bot's current **published** config (not draft — a bot with
   no published version can't be talked to yet).
2. Load or create the conversation, pinned to that published version's
   ID.
3. Assemble the **system prompt**: `persona + guardrails`, concatenated
   plain text, kept byte-identical per published version so it caches
   correctly (see "System prompt caching" below).
4. Send the conversation history + system prompt + the bot's enabled
   tools to Claude.
5. If Claude's response calls a tool: run every requested tool call **in
   parallel**, log each one to `ToolCallLog` (guardrail #6 — every call
   logged regardless of whether its result shapes the final answer),
   feed all results back, and loop — up to `MAX_TOOL_ITERATIONS` (5)
   times, so a confused model can't loop forever.
6. If Claude responds with plain text (no tool call): that's the reply,
   loop ends.
7. If 5 iterations pass with no final text: falls back to a fixed
   handoff message rather than returning nothing (guardrail #4).
8. Both the visitor's message and the bot's reply are persisted to
   `Message` before returning — the whole loop is stateless between
   requests (see `docs/architecture.md`'s scaling note), so any server
   instance can handle any request.

Between step 2 and step 4, two opt-in Guardrails checks run (off by
default): rate limiting and spam detection —
`lib/ai/abuseProtection.ts`, ADR 0029, full detail in `docs/changelog.md`.

## System prompt caching

`buildSystemPrompt` deliberately does plain string concatenation, never
anything request-specific (a timestamp, a request ID). The point: the
system prompt for a given published version is byte-identical on every
call, which is what makes prompt caching actually work — inject
anything variable and the cache silently stops hitting. See ADR 0002.

## Tool calling — how a bot decides what it can do

Every tool (`lib/ai/tools/*.ts`) registers itself in a single registry
(`lib/ai/tools/registry.ts`) with a name, description, and input schema
— what Claude sees — plus a `handle` function — the actual
fulfillment, kept separate so swapping *how* a tool is fulfilled (a
direct API call today, an MCP client call later) never touches what
Claude sees (`docs/architecture.md`'s interface/connector split).

A bot's published config stores which tool *names* it's allowed to use.
`getToolsForNames` resolves those names against the registry at request
time — a bot can never use a tool it isn't explicitly configured for,
even if the tool exists in the codebase.

Every tool degrades gracefully (guardrail #4): if a business hasn't
connected the real integration a tool needs (e.g. Shopify for
`check_order_status`), the tool falls back to "collect info, hand off
to a human" — never a fabricated answer.

## Write-capable action tools & approvals (`lib/pendingActions.ts`, ADR 0023)

A write-capable tool — one whose effect can't be undone by "the AI was
wrong" — never executes itself. `request_order_cancellation`
(`lib/ai/tools/cancelOrder.ts`) validates the order (exists, not
already cancelled) and, if valid, writes a `pending` `PendingAction`
row instead of calling Shopify; the visitor is told a human will
review it, never that it's done. A business owner reviews queued
requests from `/bots/[botId]/approvals` and approves or rejects each
one. Only approving calls the tool's separately-exported executor
(`executeOrderCancellation`, the real `orderCancel` GraphQL mutation) —
rejecting just marks the row `rejected` and does nothing external.

`lib/pendingActions.ts` is deliberately generic — it has no knowledge
of `request_order_cancellation` or any other specific tool, so a
future write tool's own `handle()` can call `createPendingAction`
without creating a circular import. The one place that maps a
`toolName` to its executor is the console layer
(`app/(console)/bots/[botId]/approvals/actions.ts`'s `EXECUTORS` map)
— the next write-capable tool adds one line there, not a change to the
generic queue.

## In-chat widgets (`lib/widgets.ts`, `lib/ai/tools/widget.ts`, ADR 0028)

A widget is a form the bot can render inline in the chat — Phase 1 of
Chatbase's real "Widgets" feature, read from their actual docs, not
guessed (ADR 0028): Schema-driven forms only, not yet their fuller
Functions/States system. Per-bot, not draft/publish-gated, same
precedent as Custom actions (ADR 0022) — a widget takes effect
immediately on save/toggle.

**Trigger mechanism — no chat-loop special-casing needed.** A widget
is built into a real `Tool` the same way a custom action is
(`buildWidgetTool`, `lib/ai/tools/widget.ts`), merged into every turn's
tool list by `lib/ai/chat.ts` alongside the static registry and custom
actions. The tool takes no input — the widget itself collects data
from the *visitor*, not the model — and its `handle()` returns a
tagged JSON string, `{"type":"render_widget", widgetId, name,
submitLabel, schema}`, the exact same structured-signaling pattern
every other tool already uses for its own output shape
(`handoff_required`, `ok`/`result`). Because the model sees this tool
call "succeed" like any other, its own next turn naturally produces
the accompanying text ("Sure, please fill this out:") — no special
early-exit branching was needed in the tool loop. `sendMessage` just
scans each turn's tool results for the tag and attaches the last one
found to `SendMessageResult.widget`, alongside `reply`.

**Rendering and submission.** `public/widget.js` (vanilla JS, shadow-
DOM styled) and `PreviewSheet.tsx` (React + `components/ui/`
primitives) each build a form from the widget's JSON Schema
(`properties`/`required`/`enum`) independently, matching their own
surface's design system rather than sharing a renderer neither can use
directly. On submit, the collected field values are formatted as plain
text (`"Your name: Priya, Party size: 4"`) and sent as the visitor's
own next chat message over the existing `/api/chat` endpoint — no new
endpoint, no separate submission concept.

**Schema format is JSON Schema**, confirmed by the user (2026-09-29)
over a custom shape mirroring Chatbase's own internal structure — an
actual standard already used by this codebase's tool-input schemas and
Claude's own tool-calling API, versus a private format that would only
buy cosmetic parity with a competitor's builder. `lib/widgets.ts`
converts between the console's typed field builder (name/label/type/
required/options) and the stored JSON Schema, the same
fields-to-schema/schema-to-fields round trip `lib/customActions.ts`
already established for its own input schema.

**Phase 2 — Functions (2026-09-30).** A widget with an `apiUrl` gets a
second tool, `submit_widget_<name>` (`buildWidgetSubmitTool`), called
right after the visitor submits. Non-write-capable: calls
`performActionRequest` (Custom Actions' SSRF-guarded, encrypted-header
helper, ADR 0022) directly, returning `{"status":"ok",...}` or
degrading to `{"status":"handoff_required",...}` on failure (guardrail
#4). Write-capable: never touches the API from the tool call — queues a
`PendingAction` (ADR 0023) instead; approving it in
`/bots/[botId]/approvals` dispatches on the `submit_widget_` prefix to
`executeWidgetSubmission`, which re-resolves the widget fresh by name
(a `PendingAction` stores only the tool name + input, not the widget's
URL/headers) and performs the one real call. The Add dialog's "Call an
API when this form is submitted" checkbox is progressive disclosure —
unchecked, a widget behaves exactly as Phase 1 did. The URL is rejected
server-side by the same `isBlockedActionUrl` guard before it's ever
stored.

**Deliberately not built** (`docs/open-questions.md` #9): multi-view
widgets driven by conditions (States), and field types beyond text/
number/boolean/dropdown.

## Knowledge base ingestion

`docs/product-spec.md`'s MVP scope: "file upload and/or manual Q&A at
minimum for v1" — now fully built, four ways in
(`lib/ai/knowledgeBase.ts`, `/bots/[botId]/knowledge`, "Data sources"
as of 2026-09-29). Site crawling (multi-page, link-following) stays
separate, deferred scope (`docs/open-questions.md` #3) — everything
here is single-Q&A/single-file/single-URL/single-text-snippet. ADR
0013 covers the file/URL decisions in full.

**Manual Q&A**: one `KnowledgeSource` (`kind: "qa"`, `title` = the
question) + one `KnowledgeChunk` (`content` = the answer) per pair — no
multi-chunk splitting needed, a Q&A pair is already the right retrieval
unit. The embedding is computed from the question *and* answer together
(not just the question) so a visitor query phrased closer to either
still matches.

**File upload** (`lib/ai/extraction.ts`'s `extractFileText`): PDF via
`pdf-parse`, DOCX via `mammoth`, `.txt`/`.md` read directly (no
library). Capped at 5MB (`MAX_FILE_BYTES`) before extraction even runs.

**URL ingestion** (`extractUrlText`): fetches the URL, builds a `JSDOM`
document, and runs `@mozilla/readability`'s `Readability.parse()` to
pull just the article content — not nav/footer/ad chrome. Guarded by
`assertPublicHttpUrl` (a basic SSRF check: `http`/`https` only, and the
literal hostname is rejected if it's `localhost`/loopback/private/link-
local — see `docs/security.md` for what this guard does *not* cover).

**Text snippet** (`createTextEntry`, 2026-09-29): a title + pasted text,
no extraction step — reuses the same chunking pipeline as file/URL
(`kind: "text"`). The smallest of the four entry points since there's
no file parsing or network fetch involved.

**Total size indicator** (`getTotalKnowledgeBytes`): sums each stored
chunk's content length across a bot's sources — informational only, no
plan-based cap enforced or displayed against it (`docs/open-
questions.md` #6's billing-tier question is unresolved, so there's
nothing to cap against yet, unlike Chatbase's "X KB / 1 MB").

**Chunking** (`lib/ai/chunking.ts`'s `chunkText`, file/URL only — a Q&A
pair never needs it): a hand-rolled recursive splitter, paragraph →
sentence → hard character-cutoff fallback, ~2000 chars (~500 tokens) per
chunk, ~200 char (~10%) overlap between consecutive chunks. Grounded in
2026 RAG chunking benchmarks — see `docs/research/knowledge-ingestion-
libraries.md`. `MAX_CHUNKS` (200) rejects a document that would expand
into too many sequential embeddings calls for v1's synchronous
processing model (no background job queue exists in this codebase).

**Embeddings happen outside the DB transaction** for file/URL entries:
`withOrgContext` wraps its callback in `prisma.$transaction`, so
embedding every chunk *inside* it would hold that transaction open for
as long as the embeddings provider takes across every chunk (`createQaEntry`
has the same shape for its one chunk). All chunks are embedded first,
then one transaction creates the source and writes every chunk + its
raw-SQL vector update (`KnowledgeChunk.embedding`, pgvector,
`db/migrations/0002_pgvector.sql` — not in the Prisma schema since
Prisma can't declare a `vector` column natively, same pattern
`searchKnowledgeBaseTool` uses on the read side).

`searchKnowledgeBaseTool` restates the question alongside the answer for
a `kind: "qa"` chunk (`Q: ...\nA: ...`), and names the source title for
a `kind: "file"`/`"url"` chunk (`From "<title>": ...`) — a document
fragment reads better to the model with its origin stated, same
reasoning as the qa case.

Errors a business owner might actually cause (unsupported file type, a
file over 5MB, a malformed/private URL, a page with no extractable
article content, a document too long to chunk) throw
`KnowledgeIngestionError` and surface as-is in a toast; anything
unexpected (a corrupt file crashing a library, a network failure) is
logged server-side and shown as a generic message instead — never a raw
error, per guardrail #4.

**Verification note**: this environment's `VOYAGE_API_KEY` is a
placeholder (same class of gap as the documented missing
`ANTHROPIC_API_KEY`), so the actual embeddings call has never been
exercised against the real Voyage API here. Everything up to that
boundary — the raw SQL vector write/read, the RLS isolation specific to
`knowledge_sources`/`knowledge_chunks`, the console UI's list/add/
delete flow, and (for file/URL) the real extraction libraries
themselves — was verified for real: `pdf-parse` against a real hand-
built PDF, `mammoth` against a real bundled `.docx` fixture, `jsdom`+
`@mozilla/readability` against real sample HTML, a directly-seeded
file/url source+chunk against a real Postgres+pgvector instance
(confirming `listKnowledgeSources`/`deleteKnowledgeSource`'s generic-
across-kinds behavior and that `search_knowledge_base`'s raw query
retrieves file/url chunks the same way as qa chunks), and a real browser
upload of that same hand-built PDF through the full server-action
pipeline (multipart file → buffer → `extractFileText` → chunking),
which correctly reached the embeddings-call boundary rather than
erroring anywhere in extraction. `tests/e2e/knowledge.spec.ts` covers
what's reachable without a real key: the empty states, all three Add
dialogs, a real `.txt` upload's extraction+chunking, the SSRF guard
rejecting a real `localhost` URL end-to-end, and — a real bug this
caught, on the qa path — that a failed save doesn't silently wipe the
question/answer fields a business owner just typed (`useActionState`'s
`<form>` resets uncontrolled fields on any action completion, success or
failure, unless the action's returned state re-seeds them via
`defaultValue`; same fix already shipped for `/login`'s email field).

## Conversation inbox / Activity (`lib/conversations.ts`, ADR 0015 + ADR 0016 + ADR 0027)

`Conversation`, `Message`, and `ToolCallLog` were written on every chat
turn since `lib/ai/chat.ts`'s `sendMessage` first shipped, but no console
route ever read them back — `/conversations` (list) and `/conversations/
[conversationId]` (detail) close that gap. Dashboard-only for v1, per
ADR 0015 (resolving the previously-open "human handoff channel" question):
no email/Slack push in this pass. Built for a non-technical business
owner to review real conversations and spot problems, per ADR 0016 — not
a developer debugging screen. Rebuilt 2026-09-29 (ADR 0027) into a
split-pane layout matching Chatbase's own real Activity section, read
from their actual docs, not guessed.

**List** (`listConversations`): one row per `Conversation`, joined to its
bot's name and its most recent `Message` for a preview, filterable by
`botId`, a `fromDate` (the console's date-range presets), and
`issuesOnly`. **"Has an issue" is derived, not stored** — a conversation
counts as having an issue if any of its `ToolCallLog` rows' own
`describeForInbox` (ADR 0016) says so. Each tool decides for itself what
an issue means for its own output shape (guardrail #2 — the core engine
never special-cases a specific tool): `check_order_status` flags both
`handoff_required` and `not_found` (either way the visitor didn't get an
answer), `search_knowledge_base` flags its own "nothing found" outcome.
A tool without `describeForInbox` falls back to a generic
`output.includes("handoff_required")` check. None of this needed a
schema change or backfill — computed at query time from data that
already existed.

**Detail** (`getConversationDetail`): the full message transcript and
every `ToolCallLog` row for one conversation, merged into a single
chronological timeline by the console (`ConversationThread.tsx`) — a
tool call renders inline next to the messages around it, not in a
separate tab a reviewer has to cross-reference by timestamp. Each tool
call shows its plain-language `describeForInbox` summary as the primary,
always-visible line (e.g. "Looked up order #1234 — found it." or
"Searched the knowledge base for \"shipping to Mars\" — nothing
found.") — the raw tool name/input/output JSON stays real and available
(guardrail #6 traceability) but tucked behind a native `<details>`
"Technical details" disclosure, not deleted, so an engineer debugging a
bad answer can still get at it from the same page a business owner uses.

**Pause/resume** (ADR 0027, `setConversationStatus`): a business owner
can pause a conversation from its Details panel. A paused conversation
still records incoming visitor messages — `lib/ai/chat.ts`'s
`sendMessage` persists the user message, then returns `{ reply: null }`
before any model call or tool loop, matching Chatbase's own documented
behavior ("stops receiving AI replies but still records incoming
messages") exactly. `app/api/chat/route.ts` and `public/widget.js`
degrade gracefully — `appendMessage` is simply skipped when `reply` is
`null`, no error surfaced to the visitor.

**Source** (`Conversation.source`, `"widget" | "playground"`): set once
at conversation creation, from whichever caller started it —
`app/api/chat/route.ts` (defaults to `"widget"`) or
`sendPreviewMessageAction` (`"playground"`, the bot editor's Test-your-
bot preview). Shown on the Details tab so a reviewer can tell a real
visitor conversation from an internal test one.

**Contact** (`getConversationDetail`): resolved from a `Lead` row linked
by `conversationId`, if `collect_lead` was called during that
conversation; otherwise shown as "Anonymous" — never fabricated.

**Deliberately not built, grounded in what Chatbase's own UI actually
shows** (confirmed from real screenshots, not guessed): Sentiment
analysis and Country/IP geolocation both render as honest "Not
analyzed"/"Not tracked" states — matching Chatbase's own real
"unanalyzed" UI, not invented values (guardrail #4). Also not built: a
Confidence-score metric, voice sessions (out of scope per `docs/north-
star.md`), and Procedures (a named trigger+ordered-steps workflow — a
real middle ground between the flat tool registry and the deferred
visual-flow-builder idea, tracked as a future Build sub-area). A
`status`/"resolved for analytics" concept (distinct from the new
ongoing/paused `status` field, which is about AI-reply availability) is
still not built. `docs/roadmap.md`'s "Resolution-rate analytics" already
flagged this as needing a real product definition first (closed by
visitor leaving satisfied? no issue triggered? something else?) — ADR
0015 left it undefined rather than silently picking one while building
the inbox; tracked as `docs/open-questions.md` #7.

**Bulk select + export**: the "..." menu's "Select" enters bulk-select
mode (checkboxes on each list row); selected rows (or, via "Export
all", every currently-filtered row) export to CSV client-side
(`lib/csvExport.ts` — a `Blob` + `URL.createObjectURL` + a synthetic
`<a download>` click, no new API route, since the data is already
server-rendered into the page).

**Verification note**: conversations can't be created through the
console UI — they're only ever written by the widget chat API
(`app/api/chat/route.ts`), which needs a real `ANTHROPIC_API_KEY` (a
placeholder in this environment, same class of gap as the knowledge
base's embeddings call). `tests/e2e/helpers.ts`'s `seedConversations`
writes directly via Prisma, scoped through the same `withOrgContext` +
`BotPublicKey` mechanism the app itself uses to bootstrap an `orgId`
from a `botId` — standing in for a real chat turn, same pattern
`knowledge.spec.ts` already used for a directly-seeded knowledge entry;
it now also seeds a third, paused conversation for pause/resume and
status-filter coverage. Every other part of the feature (list rendering,
filters, the issue derivation for both tools, the plain-language
summaries, the detail transcript, tenant isolation across orgs, and the
2026-09-29 rebuild's pause/resume toggle, Source/Contact fields, and CSV
export) was verified for real against a real Postgres instance and a
real browser — including a live functional check that pausing a
conversation actually suppresses the AI reply end-to-end, not just that
the `status` column flips.

## Tenant isolation in practice

Every tenant-scoped database query must go through `withOrgContext`
(`lib/db.ts`), never the raw Prisma client directly. It opens a
transaction, sets `app.org_id` for that transaction only, and Postgres
Row-Level Security policies use that setting to silently filter every
query to the current org — see `docs/security.md` for the full model.

Two tables are the deliberate exceptions, both resolvable *before*
`app.org_id` is known:
- **`BotPublicKey`** — `resolveBotPublicKey(publicKey)` is the one
  sanctioned way to turn a widget's public key into `{orgId, botId}`.
  Every widget-facing route (`/api/chat`, `/api/widget/config`) starts
  here — a client never supplies its own `orgId` directly.
- **`UserOrgAccess`** — resolves which org a *console user* belongs to
  at login, before there's any org context yet.

## Custom action "Test this action" (2026-09-29)

`testCustomActionAction` (`app/(console)/bots/[botId]/actions/actions.ts`)
fires a real HTTP request against whatever the Add-action dialog
currently holds — method, URL, headers, and per-field sample values —
before the action is ever saved. It needs no `orgId`/tenant scoping: it
never touches the database, only the outside world, so it's a plain
top-level server action rather than one bound to a `botId`.

It shares `performActionRequest` (`lib/ai/tools/customAction.ts`) with
the live bot tool call — the same SSRF guard (`isBlockedActionUrl`),
the same query-params-for-GET/JSON-body-otherwise routing, the same
10s timeout. That's deliberate: a passing test call and a real saved
action use the identical request-building code, so "it worked in the
test" is a real guarantee about how the saved action will behave, not
a separate code path that could quietly drift from the real one. The
live tool call wraps the same result in the handoff-JSON contract
(guardrail #4); the test path returns the raw status/body instead,
since a business owner debugging their own endpoint needs to see what
actually came back, not a plain-language fallback message.

Response bodies are capped at 4000 characters before reaching the
console — a test call is for confirming shape/status, not for browsing
a large payload.

## Shopify connect flow

`app/api/integrations/[provider]/callback/route.ts` deliberately never
touches the console session. The OAuth `state` parameter (set when the
authorize URL is built, decoded here) is the only thing carrying
`orgId`/`botId` through the redirect — the callback route has no other
way to know which bot this connection belongs to, and needs none.
