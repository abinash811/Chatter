# ADR 0023: Write-capable action tools require human approval before executing

Status: accepted

Date: 2026-09-28

## Context

Every action tool so far (`search_knowledge_base`, `check_order_status`,
`collect_lead`, custom webhook actions) either only reads data or writes
something low-stakes (a lead's contact info). The 2026-09-28 directive
asked for the next tier: a tool that actually changes something real —
starting with cancelling a Shopify order. That's a materially different
risk category: a wrong or manipulated call is a real, often irreversible
action on a customer's real order, not a bad chat answer. This needed a
recorded decision on whether the model executes such an action directly
or a human confirms it first — user-facing product risk, not an
implementation detail, so the user made the call directly rather than it
being picked silently.

## Decision

Write-capable action tools do not execute their write immediately. A
tool like `request_order_cancellation` validates the request (the order
exists, isn't already cancelled) and creates a `PendingAction` row with
status `pending`, then tells the visitor a team member will review it —
it never tells the visitor the action is done. A business owner reviews
and approves or rejects it from a new per-bot page
(`/bots/[botId]/approvals`); approving is what actually calls Shopify's
API. `search_knowledge_base`/`check_order_status`/`collect_lead`/custom
actions are unaffected — this only applies to a tool whose effect can't
be undone by "the AI was wrong."

## Alternatives considered

- Execute immediately, no review — rejected by the user directly: a
  visitor talking the bot into cancelling a real order, or the bot
  misreading the situation, has real consequences a bad answer doesn't;
  most support platforms that touch money or bookings default to
  human-in-the-loop and let a business turn on auto-approve later, not
  the reverse.
- A per-bot "auto-approve write actions" toggle, defaulting off — not
  built now: adds a second code path (auto-execute vs. queue) for a
  capability nobody's asked for yet. `PendingAction.status` already
  supports adding `auto_approved` later without a schema change if this
  turns out to matter.
- Route the approval through the existing conversation inbox
  (`/conversations`) instead of a new page — rejected: the inbox is a
  read/filter surface (ADR 0015), not built for an act-on-this-row
  workflow, and conflating "review a transcript" with "approve a
  financial action" muddies both. A dedicated `/approvals` page keeps
  the inbox's own scope intact.

## Consequences

`PendingAction` (orgId, botId, conversationId, toolName, input, status,
result) is generic — the next write-capable tool (a refund, a booking
change) reuses the same table and the same `/approvals` page, not a new
one per tool. This is the durable part of the decision and is meant to
outlast the first tool that uses it.

Cancelling a Shopify order needs `write_orders`, which the existing
Shopify integration never requested (`SCOPES` in `lib/integrations/
shopify.ts` was read-only: `read_products,read_orders`). Widening it is
hard to reverse cleanly: every store connected before this change is
still running on the old, narrower grant and must reconnect (redo the
OAuth flow) before this tool can act on their orders — there's no way to
silently upgrade an existing token's scope. Documented here so a future
session doesn't rediscover this as a bug.

Shopify's REST Admin API is legacy as of October 2024 (new apps must use
GraphQL Admin API from April 2025) — `check_order_status`'s existing
lookup still uses REST (`GET /admin/api/2026-01/orders.json`, unchanged,
out of scope here), but the new write action uses the GraphQL Admin
API's `orderCancel` mutation, the currently-recommended path, not an
extension of the deprecated REST cancel endpoint. `orderCancel` runs
asynchronously (queues a job) and is documented as irreversible on
Shopify's side — this tool surfaces that plainly to the approver, it
doesn't poll the job to completion (no webhook/polling infra exists yet
for that; a known gap, not silently glossed over).
