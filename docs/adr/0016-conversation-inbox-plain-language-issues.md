# ADR 0016: Conversation inbox — plain-language tool call summaries and a generic "issue" signal

Status: accepted

Date: 2026-09-26

## Context

ADR 0015 shipped `/conversations` as a dashboard-only inbox. Its detail
view (`ConversationThread.tsx`) rendered each tool call as raw JSON
(`in: {"orderNumber":"1234"}` / `out: {"status":"handoff_required",...}`)
and its only filter/indicator was "Handoff" — literally the
`handoff_required` string one specific tool (`check_order_status`)
happens to return. The user explicitly asked for this screen to work as
"logs for non-tech persons" who need to review conversations and spot
issues, and for a general "filter conversations with issues" — neither
of which the raw-JSON, single-tool-specific-string design supports: a
business owner shouldn't need to read JSON or know what
`handoff_required` means, and a second tool (`search_knowledge_base`)
already exists whose own "I didn't find anything" outcome is a real
issue that the old handoff-only check couldn't see at all (it returns a
plain string, not `{status: "handoff_required"}`).

This needed a recorded decision because it changes the `Tool` interface
(`lib/ai/tools/registry.ts`) — the same interface/connector design
surface ADR 0002 and `docs/architecture.md` §2 already govern — not just
this one screen.

## Decision

Add an optional `describeForInbox(input, output)` method to the `Tool`
interface, returning `{ summary: string; isIssue: boolean }`. Each tool
author decides, next to their own tool's input/output shape, what a
plain-language summary and an "issue" look like for that specific tool —
matching guardrail #2 (no vertical-specific logic in the core engine):
`check_order_status`'s own file knows what `status: "not_found"` means
for an order lookup; the core engine (`lib/conversations.ts`) never
needs to know that. A tool without `describeForInbox` (any future tool
that doesn't implement it) falls back to a generic summary ("Ran
`<tool_name>`") and a generic issue heuristic (does the raw output
contain `handoff_required`) — the exact behavior ADR 0015 shipped, so
this is purely additive, not a breaking change to existing tools.

The inbox's "Handoff" concept is renamed and broadened to **"Issue"**
throughout (`hasIssue`, `issuesOnly` filter, the `issues=1` URL param,
the "Issue" badge) — a plain-language umbrella a non-technical reviewer
recognizes, covering both `check_order_status`'s `handoff_required` *and*
`not_found` (the customer didn't get an answer either way) and
`search_knowledge_base`'s "nothing found" outcome.

The detail view shows the plain-language summary as the primary line;
the raw input/output stays available behind a native `<details>`
disclosure ("Technical details") rather than being deleted — guardrail
#6 (traceability) still needs the real data available for debugging,
just not as the default, most-prominent thing a business owner sees.

## Alternatives considered

- Keep a single hardcoded string check (`"handoff_required"`) and just
  relabel it "Issue" — rejected: this was already known to miss
  `search_knowledge_base`'s miss case entirely, and would keep missing
  every future tool's own failure mode unless the core engine grew a
  hardcoded special case per tool, which is exactly the vertical-logic-
  in-the-core-engine anti-pattern guardrail #2 exists to prevent.
- A generic "did the output look like an error" heuristic (keyword
  sniffing across all tool outputs, no per-tool code) — rejected: too
  fragile and prone to false positives/negatives now that two tools
  have genuinely different output shapes (structured JSON vs. a plain
  sentence), and it can't produce a good plain-language summary either,
  only a boolean.
- Hide the raw input/output entirely, only ever show the plain-language
  summary — rejected: guardrail #6 (traceability) exists specifically so
  a bad answer is debuggable, and deleting the real data to simplify the
  UI for one audience would break that for the other (an engineer
  investigating a bug report). The `<details>` disclosure serves both
  audiences from the same page instead of picking one.

## Consequences

Every future tool can optionally implement `describeForInbox` for a
good plain-language summary and accurate issue detection; one that
doesn't gets the generic fallback, which is safe but generic — a
reasonable default, not a silent failure. Renaming `handoff` to `issue`
in the URL param/filter is a breaking change to any saved/bookmarked
`/conversations?handoff=1` link, acceptable pre-launch (no real users
yet, per the same reasoning ADR 0012's encryption-at-rest change used).
