# ADR 0040: Generic approval gate for Custom Actions

Status: accepted

Date: 2026-10-11

## Context

`docs/roadmap.md`'s "More write-capable action tools" item was being
scoped as more hardcoded, platform-specific tool files — update a
shipping address, edit/cancel a booking — the same way
`request_order_cancellation` (ADR 0023) and `request_refund` were
built: a compile-time `Tool` in `lib/ai/tools/`, pinned to one real
API (Shopify's), queuing a `PendingAction` for a human to approve
before the real call fires.

That path only ever covers platforms *we've* built an integration
for. Custom Actions (ADR 0022) already generalize the read-only half
of this — a business owner defines their own endpoint (URL, method,
headers, fields) from the console and the bot calls it, no code
change on our side — but a custom action fires immediately on every
call. There's no way for a business to mark their own endpoint as
destructive and get the same human-approval protection ADR 0023 gives
Shopify refunds/cancellations. Asked directly which direction to
take "more capable action tools": keep writing hardcoded per-platform
tools, generalize the approval gate onto Custom Actions instead, or
both. Decision: both — they solve different problems, not the same
one twice.

## Decision

**Add a `requiresApproval` boolean to `CustomAction`**, set once at
creation time (no edit path exists for custom actions today, so
there's nothing to migrate a flag onto after the fact). When a
business owner checks "This can't be undone — require approval
before it runs" in the Add Action dialog, every call to that
action's tool queues a `PendingAction` with toolName `custom_<name>`
and returns `pending_approval`, exactly the same shape
`request_refund`'s `handle()` returns — instead of firing the real
HTTP request inline.

`app/(console)/approvals/actions.ts`'s `approveAction` gets a second
dynamic-prefix branch (alongside the existing
`submit_widget_`-prefix branch for widget submissions): a `custom_`
prefixed `toolName` looks the action up by name
(`getCustomActionForExecutionByToolName`) and calls
`performActionRequest` — the exact same request-building function
the live, non-gated path already uses — rather than adding one static
`EXECUTORS` entry per custom action, which can't work for a
dynamically-named tool.

**Keep writing hardcoded tools for first-party platform
integrations** (Shopify today) where we want to verify the exact API
shape ourselves — `request_refund`'s Shopify GraphQL mutation is
pinned and tested against a real request shape, something a generic
"call this URL" tool can't offer. The two paths solve different
problems: Custom Actions generalize "any business's own API, approval
optional," hardcoded tools pin "a platform we've specifically
integrated with."

## Alternatives considered

- **Hardcoded tools only** (reject the generic gate) — every new
  write capability (shipping-address update, booking edit) stays an
  engineering task, forever. Rejected: it doesn't scale with the
  number of integrations a business might want, and Custom Actions
  already proved the generic pattern works for the read/fire-and-
  forget case.
- **Generic gate only** (stop writing hardcoded tools) — rejected:
  loses the ability to verify a real, pinned API shape for platforms
  we specifically support (Shopify's refund/cancel mutations are
  already unverified against a live store per their own ADRs; a
  fully generic approach would make that worse, not better, since a
  business-typed URL/method/field list can't encode GraphQL mutation
  structure or multi-step lookups like `requestRefund.ts`'s order-then-
  transaction-then-refund sequence).
- **Edit existing custom actions to add approval after creation** —
  rejected for this pass: no edit UI exists for custom actions at all
  today (only create/toggle/delete), so adding one just for this flag
  would be new scope beyond what was asked. Revisit if/when a general
  "edit a custom action" feature is built.

## Consequences

A business can make any of their own endpoints write-capable with
real human-in-the-loop protection, with zero engineering work on our
side — the stated goal ("more capable action tools... ideally this
should be API with description"). `app/(console)/approvals/` already
renders any `PendingAction` generically regardless of `toolName`
(ADR 0023), so the approvals inbox needs no change to display these.

Hard to reverse: `custom_<name>` as a `PendingAction.toolName` is now
a second, dynamic (not just static) key the approvals executor branches
on by string prefix — same shape as the existing `submit_widget_`
prefix, not a new pattern, but it means `toolName` string prefixes are
now a real, load-bearing contract across two features, not one.
