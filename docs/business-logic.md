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
name), deliberately not a multi-step wizard: only one vertical template
exists concretely (`docs/product-spec.md`'s phasing), so a template
picker with one option would be premature UI, and inviting teammates is
separate, larger scope with no design done yet. Submitting sets
`org.name` + `org.onboardedAt`, creates the first bot, and redirects
straight into that bot's editor — a brand-new account never sees an
empty `/bots` list.

**Known side effect**: since onboarding always creates a first bot and
no bot-delete feature exists yet, `app/(console)/bots/page.tsx`'s "No
bots yet" empty state is real code with no real user journey that
reaches it anymore. Left in place — cheap to keep, and reachable again
the moment bot deletion (or a skippable onboarding path) ships. See
`tests/e2e/bots-list.spec.ts`'s note.

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

## Knowledge base ingestion

`docs/product-spec.md`'s MVP scope: "file upload and/or manual Q&A at
minimum for v1." Manual Q&A is what's built (`lib/ai/knowledgeBase.ts`,
`/bots/[botId]/knowledge`) — file/URL ingestion is separate, larger
scope (chunking strategy, dedup) `KnowledgeSource.kind` already leaves
room for (`"file"`/`"url"`, see `docs/open-questions.md` #4 on
crawling) but isn't built yet.

One `KnowledgeSource` (`kind: "qa"`, `title` = the question) + one
`KnowledgeChunk` (`content` = the answer) per Q&A pair — no multi-chunk
splitting needed, a Q&A pair is already the right retrieval unit. The
embedding is computed from the question *and* answer together (not just
the question) so a visitor query phrased closer to either still
matches. `KnowledgeChunk.embedding` (pgvector,
`db/migrations/0002_pgvector.sql`) isn't in the Prisma schema — Prisma
can't declare a `vector` column natively — so it's written via a raw
SQL update after the Prisma-typed `create`, same pattern
`searchKnowledgeBaseTool` already uses on the read side (pgvector
cosine-distance `ORDER BY`).

`searchKnowledgeBaseTool` restates the question alongside the answer
for a `kind: "qa"` chunk (`Q: ...\nA: ...`) rather than returning the
bare answer — reads better to the model than an answer with no
context for what it's answering.

**Verification note**: this environment's `VOYAGE_API_KEY` is a
placeholder (same class of gap as the documented missing
`ANTHROPIC_API_KEY`), so the actual embeddings call has never been
exercised against the real Voyage API here. Everything up to that
boundary — the raw SQL vector write/read, the RLS isolation specific to
`knowledge_sources`/`knowledge_chunks`, the console UI's list/add/
delete flow — was verified for real against a real Postgres+pgvector
instance and a real browser (a directly-seeded entry, since creating
one through the UI needs the embeddings call). `tests/e2e/
knowledge.spec.ts` covers what's reachable without a real key: the
empty state, the dialog, and — a real bug this caught — that a failed
save doesn't silently wipe the question/answer fields a business owner
just typed (`useActionState`'s `<form>` resets uncontrolled fields on
any action completion, success or failure, unless the action's
returned state re-seeds them via `defaultValue`; same fix already
shipped for `/login`'s email field).

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

## Shopify connect flow

`app/api/integrations/[provider]/callback/route.ts` deliberately never
touches the console session. The OAuth `state` parameter (set when the
authorize URL is built, decoded here) is the only thing carrying
`orgId`/`botId` through the redirect — the callback route has no other
way to know which bot this connection belongs to, and needs none.
