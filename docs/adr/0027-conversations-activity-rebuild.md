# ADR 0027: Conversations rebuilt as a split-pane Activity view, with real pause/resume and source tracking

Status: accepted

Date: 2026-09-29

## Context

The user asked to recreate Chatbase's Activity → Conversations screen
with our own design system, and explicitly to ground it in Chatbase's
real docs rather than guess. Read directly (not a search summary):
`docs/user-guides/chatbot/activity` (the Activity guide) and
`docs/api-v2/conversations/pause-or-resume-a-conversation` (the real
API reference for conversation status).

Chatbase's real screen is a split list-plus-panel layout (chat log list
on the left, a **Chat / Details** tab panel on the right), not the
separate list-page → full-page-transcript navigation our `/conversations`
had (ADR 0015). The Details tab shows Contact, Source, Status,
Sentiment, Messages, Country, Created, Last activity, Conversation ID.
Their API confirms conversation status is a real two-value enum,
`ongoing` / `paused` — pausing "stops receiving AI replies but still
records incoming messages" (exact quote). Their Activity guide adds
`ended`/`taken_over` as filter-dialog states and documents idle
auto-ending after 3 days, but neither is confirmed by a primary source
with enough detail to build correctly, so this ADR does not claim them.

Several pieces of Chatbase's real screen need a decision this ADR
deliberately does NOT make, because they're separate technical choices
not implied by "recreate the design":
- **Sentiment analysis** — Chatbase computes this; we don't. No method
  (LLM classification vs. heuristic) has been chosen.
- **Country** — would require IP geolocation, a new third-party
  dependency with real privacy implications for an anonymous widget
  visitor. Not decided.
- **Voice sessions** — out of scope entirely; `docs/north-star.md`
  already scopes this product as "chat now, voice later."
- **`ended`/`taken_over` states and 3-day auto-ending** — auto-ending
  needs a scheduled job, infrastructure this codebase doesn't have yet
  (`docs/open-questions.md` #8's app-compute question is upstream of
  this). Not decided.
- **Procedures** (the Action-type filter) — downstream of the already-
  pending Guardrails-vs-Procedures decision, tracked separately.

This partially answers `docs/open-questions.md` #7 ("`Conversation`
'resolved' status semantics") but is **not** a full resolution: `status`
here is about whether the AI is actively replying (ongoing/paused), not
Chatbase's own separate "resolved for analytics" concept #7 asks about.
#7 stays open.

## Decision

Rebuild `/conversations` as a split-pane layout: a list (left) plus a
selected conversation's **Chat** / **Details** tabs (right), replacing
the old list-page → separate-detail-page navigation. Add real fields to
`Conversation`: `status` (`ongoing` | `paused`, default `ongoing` —
exactly the two values Chatbase's own API documents, no more) and
`source` (`widget` | `playground` — our two real message-origin paths,
`app/api/chat/route.ts` and `sendPreviewMessageAction`). Build real
pause/resume: a paused conversation's incoming messages are still
recorded (`Message` rows still written) but `sendMessage` skips the
model call and tool loop entirely, matching Chatbase's own documented
behavior exactly. Details tab shows Contact (from a linked `Lead` row
via the existing `Lead.conversationId`, "Anonymous" if none), Source,
Status (with a working pause/resume toggle), Sentiment ("Not
analyzed" — an honest state, not a fabricated value, matching what
Chatbase's own product shows before it runs analysis), Messages count,
Country ("Not tracked" — same honesty principle), Created, Last
activity (derived from `MAX(messages.createdAt)`, no new column), and
Conversation ID. Add Select mode + CSV export of the filtered list (one
row per conversation — summary export, not per-conversation full-
transcript export, which stays a fast-follow).

## Alternatives considered

- Keep the two-page list→detail navigation and just re-skin it — matches
  our existing routing pattern, but doesn't "recreate the same design
  layout" the user explicitly asked for; the split panel is core to how
  Chatbase's screen actually works (you triage many conversations
  without a full page nav each time).
- Fabricate Sentiment/Country with placeholder or randomized values to
  visually match every field in the screenshot — rejected outright:
  CLAUDE.md's guardrail #4 ("never hallucinates an answer it can't back
  up") and the explicit "don't guess anything" instruction both rule
  this out. Honest "Not analyzed"/"Not tracked" states instead.
- Build `ended`/`taken_over` states and 3-day auto-ending now, to fully
  match the filter dialog's option list — rejected for this pass: no
  primary source documents `ended`/`taken_over`'s exact semantics (human
  takeover flow doesn't exist in this product yet) or the auto-end job's
  behavior in enough detail to build correctly rather than guess.

## Consequences

Makes the conversation inbox a real triage tool (select, pause a
misbehaving bot mid-conversation, export) instead of a read-only log —
closer to what a business owner actually needs day to day. The
`status`/`source` columns are additive and backward-compatible (existing
rows default to `ongoing`/`widget`). Forecloses nothing: `ended`/
`taken_over` can be added as real enum values later once their exact
behavior is confirmed from a primary source, and Sentiment/Country slots
already exist in the Details tab layout for whenever those get a real
implementation decision.
