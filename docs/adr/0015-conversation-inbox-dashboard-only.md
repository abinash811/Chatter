# ADR 0015: Conversation inbox — dashboard-only for v1, no email/Slack channel

Status: accepted

Date: 2026-09-26

## Context

`docs/open-questions.md` #2 asked: "Human handoff channel for v1. In-
dashboard inbox only, or also push to email/Slack?" — unresolved since
the question was first recorded, carrying its own recommendation
("dashboard inbox only for v1, add channels later") but never formally
decided.

`Conversation`, `Message`, and `ToolCallLog` have been written on every
chat turn since the chat loop first shipped (`lib/ai/chat.ts`), but no
console route has ever read them back — `docs/roadmap.md`'s "Self-serve
configurability" pillar #5 named this the single biggest concrete gap
in the product: the data exists, there is zero UI. The user has now
asked to build it. Building a dashboard inbox is itself a direct answer
to the "in-dashboard" half of open question #2; the only thing left to
decide is whether to also scope in a push channel (email/Slack) in the
same pass, since that's a materially larger, separate integration
surface (outbound email/Slack delivery, per-business channel config,
its own failure modes) with no design work done anywhere in this repo.

This needed a recorded decision rather than being obvious from the
code because it directly resolves a listed open question, and
`docs/open-questions.md`'s own header says any such resolution should
become an ADR before the entry is deleted.

## Decision

Ship the conversation inbox as a dashboard-only surface for v1:
`/conversations` (list, filterable by bot/date/handoff-triggered) and
`/conversations/[conversationId]` (full message + tool-call transcript).
No email or Slack push channel is built in this pass. This adopts the
open question's own original recommendation rather than overriding it.

Scoped out of this pass, and deliberately not treated as part of "the
conversation inbox" despite being named alongside it in
`docs/roadmap.md`'s Next section: a `status`/"resolved" concept on
`Conversation`. `docs/roadmap.md`'s own Next section already flags this
as blocked on an unanswered definition of "resolved" (closed by visitor
leaving satisfied? no handoff triggered? something else?) — building a
status filter now would mean silently picking that definition instead
of waiting for it to be answered. The inbox instead exposes only a
**handoff-triggered** indicator, computed at query time from whether
any of a conversation's `ToolCallLog` rows carry a `handoff_required`
result (see `lib/ai/tools/checkOrderStatus.ts`) — no new column, no
status concept, purely derived from data that already exists.

## Alternatives considered

- Build email/Slack push in the same pass — rejected: no design exists
  for per-business channel configuration (which email? whose Slack
  workspace, connected how?), and it's a fundamentally different kind
  of integration (outbound delivery to a third-party system) than a
  console page reading its own database. Bundling it in would have
  meant guessing at that design rather than resolving it properly later
  as its own question if a business ever asks for it.
- Add a real `Conversation.status` column now (e.g. `open`/`resolved`)
  so the inbox could offer a status filter — rejected: `docs/roadmap.
  md`'s Next section already flags "resolved" as undefined product
  meaning, not just an unbuilt UI. Adding the column would force that
  definition silently, exactly what `docs/open-questions.md`'s process
  rule exists to prevent.
- Leave open question #2 unresolved and build the page anyway —
  rejected: the question would keep sitting open despite the thing it
  was asking about now existing, drifting the docs from reality the
  same way the roadmap's own "dashboard inbox" line had already drifted
  before this session corrected it.

## Consequences

Easy to reverse in the narrow sense that adding an email/Slack channel
later is additive, not a rework of what ships here — the inbox's data
layer doesn't assume a single delivery surface. Harder to reverse: once
a `status` column and its semantics are eventually decided, retrofitting
it onto existing `Conversation` rows (all implicitly "no status" today)
needs a real migration decision, not just a schema addition — worth
remembering when that question is finally answered. This closes
`docs/open-questions.md` #2; the entry is deleted from that file in the
same change.
