# ADR 0022: Custom webhook/API action tool — dynamic per-bot tools

Status: accepted

Date: 2026-09-27

## Context

The 2026-09-27 directive approved building a "Custom webhook/API action"
tool (matches Chatbase's Custom Actions) — a business owner defines their
own action (a URL, HTTP method, headers, and what info to collect) from
the console, without a code change on our side, and the bot calls it like
any other tool.

Every existing tool (`search_knowledge_base`, `check_order_status`,
`collect_lead`) is a compile-time `Tool` object registered once in
`lib/ai/tools/registry.ts` (`docs/architecture.md` §2's interface/
connector split) — one fixed name/description/schema/handler, shared by
every bot, enabled or disabled per bot via `BotConfigVersion.tools`. A
custom action can't fit that shape: its name, description, schema, and
what it actually calls are themselves per-bot, business-authored data, not
code. This needed a real decision on how a dynamically-defined tool
reaches Claude's tool list and gets executed, without breaking the static
registry every other tool relies on.

A second real question this forces: the business owner's webhook may need
an API key or bearer token in its headers. That's a secret we're now
storing on their behalf, same category as `Integration.accessToken` and
`Org.anthropicApiKeyEncrypted` (ADR 0012) — and the URL itself is
attacker-adjacent input from our own trusted users, but our server is the
one making the outbound call, so a malicious or careless URL (e.g.
`http://169.254.169.254/...`, the AWS instance metadata endpoint) is a
real SSRF surface, not a hypothetical one, especially once deployed on AWS
(ADR 0021).

## Decision

- New `CustomAction` Prisma model, one row per business-defined action:
  `orgId`, `botId`, `name` (slug), `description`, `method`, `url`,
  `headersEncrypted` (optional, AES-256-GCM via `lib/crypto.ts`, same
  pattern as `Integration.accessToken`), `inputSchema` (JSON Schema
  `properties`/`required` — what the business wants Claude to collect and
  send), `enabled`. RLS policy same as every other orgId-bearing table.
- **Not versioned with the bot's draft/publish cycle.** A custom action
  takes effect immediately on save/toggle, same precedent as `Integration`
  (connect/disconnect is immediate, not draft-gated) — a webhook is
  infrastructure the business owns, not persona/prompt content the
  publish flow is meant to protect conversations-in-flight from.
- **Tool identity**: the tool name Claude sees is `custom_<name>` (the
  `custom_` prefix keeps it out of any future built-in tool's namespace).
  `lib/ai/tools/customAction.ts` exports `buildCustomActionTool(action):
  Tool` — a factory, not a registry entry, since the registry pattern
  only works for names known at compile time.
- **Merged in per-request, not registered.** `lib/ai/chat.ts` builds the
  tool list for a turn by combining `getToolsForNames(publishedVersion.
  tools)` (the static, compile-time tools) with every enabled
  `CustomAction` row for that bot, built fresh via the factory. Tool
  *execution* for that turn looks the call up in that same combined list
  (a plain `Map`), not through `registry.ts`'s `runTool` — the static
  registry stays exactly what it was, untouched, for every existing tool
  and every existing test.
- **SSRF guard**: `buildCustomActionTool`'s handler validates the action's
  URL before every call — `https:` only, and rejects loopback/private/
  link-local hostnames and the AWS metadata address by pattern (documented
  in the code, not just "trust the business owner"). A blocked or failed
  call falls back to `handoff_required`, per guardrail #4 — same shape as
  `check_order_status`'s own failure handling, never a silent failure or a
  guessed answer.
- **Inbox summary**: no per-action `describeForInbox` — a dynamically
  named tool can't have inbox-summary code written for it ahead of time.
  Falls back to `lib/conversations.ts`'s existing generic fallback for any
  tool without one — already-handled, not a new gap.
- Console UI is a new page, not a Tools-tab checkbox: `/bots/[botId]/
  actions` (create/edit/enable/disable/delete), separate from the bot
  editor's Tools tab. Custom actions aren't a fixed list to check boxes
  against — each is its own object with its own config, closer to
  `/bots/[botId]/knowledge`'s or `/bots/[botId]/leads`'s pattern than to a
  checkbox list.

## Alternatives considered

- Store custom actions as rows in `BotConfigVersion.tools` (extend that
  JSON array's shape to allow inline objects, not just name strings) —
  rejected: couples an infrastructure credential (headers, URL) to the
  draft/publish versioning system built for prompt content, and
  `getToolsForNames` would need to branch on shape everywhere it's called.
- One generic "make an HTTP request" tool exposed directly to Claude, with
  the URL/method chosen by the model at call time — rejected: guardrail #2
  and #5's spirit (no unbounded/opaque capability) argue against handing
  the model a raw HTTP client; a business owner pre-defining the exact
  call keeps the blast radius to what they explicitly configured.
- Register a fresh `Tool` in the static registry on every action create
  (mutate `registry` at runtime) — rejected: the registry is shared
  process-wide, not request-scoped, so two bots naming an action the same
  thing would collide, and a stale in-memory entry could outlive a DB
  edit/delete until process restart.

## Consequences

Custom actions are genuinely per-bot and take effect immediately, matching
how a business owner would expect "connect my own endpoint" to behave.
The static registry and every tool/test built against it (`docs/
architecture.md` §2's interface/connector rule) are untouched — this adds
a second, parallel path for dynamic tools rather than reshaping the
existing one, which is what keeps this from being a rewrite.

Hard to reverse: `CustomAction.headersEncrypted`'s encryption key
(`ENCRYPTION_KEY`, ADR 0012) is now protecting a second class of secret;
rotating that key needs re-encrypting both `Integration.accessToken` rows
and `CustomAction.headersEncrypted` rows, not just one. The `custom_`
naming prefix is a public contract once bots have live actions using it —
changing it later means a migration across every `CustomAction.name`, not
just a rename in code.
