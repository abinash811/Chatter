# ADR 0018: Bot removal is archive (soft delete), not hard delete

Status: accepted

Date: 2026-09-26

## Context

`docs/design/audit.md`'s 2026-09-26 bots-list audit flagged that no
bot-removal feature exists anywhere in the product — a real gap once a
business creates more than one bot. Every `Bot` relation in
`prisma/schema.prisma` (`BotConfigVersion`, `KnowledgeSource`,
`Integration`, `Conversation`, `BotPublicKey`) has no `onDelete`
behavior configured, so a plain `DELETE FROM bots` would currently fail
at the database's foreign-key constraint the moment any of those rows
exist — there was never a decision made about what removing a bot
should actually do to its data, just an absence of the feature.

This needed a recorded decision rather than just adding a delete button
because the options genuinely trade off differently: a business's
conversation transcripts (real customer interactions, possibly
containing PII) are exactly the kind of data guardrail #6
(traceability) exists to keep around for debugging and trust, and
CLAUDE.md's "measure twice" instinct for irreversible actions applies
to a schema decision as much as to a `git` command.

## Decision

Add `archivedAt DateTime?` to the `Bot` model. "Removing" a bot from the
console sets this field instead of deleting any row. An archived bot:

- Disappears from `/bots` and every bot-picker (the top-bar switcher,
  the conversations-page bot filter).
- Stops resolving via `resolveBotPublicKey` (`lib/db.ts`) — the widget's
  `botKey` lookup now also checks `archivedAt` and returns the same
  "invalid botKey" response as a key that never existed, so an archived
  bot's embed snippet goes dead immediately without a special-cased
  error path.
- 404s (via the existing plain-language error boundary) if its console
  URL is visited directly — `bots/[botId]/layout.tsx` already treats
  "not in the fetched bot list" as not-found, so filtering that list by
  `archivedAt: null` gets this for free.
- Its `BotConfigVersion`/`KnowledgeSource`/`Integration`/`Conversation`
  rows are untouched. Nothing is deleted.

Every bot-fetching query across the app (`app/(console)/bots/page.tsx`,
`bots/[botId]/layout.tsx`, `bots/[botId]/page.tsx`,
`conversations/page.tsx`, the sidebar's "getting started" check in
`app/(console)/layout.tsx`) is updated to filter `archivedAt: null` —
there is no single chokepoint query to patch instead, so this is a real,
ongoing discipline: any new bot-fetching query added later must filter
the same way, the same class of "easy to silently reintroduce" gap as
the tenant-isolation rule `withOrgContext` exists to prevent
structurally rather than by convention. No `withOrgContext`-style
enforcement exists for this one; it relies on code review and this ADR
being findable.

## Alternatives considered

- **Hard delete with `onDelete: Cascade`** — simplest schema change and
  matches "delete" semantics in plenty of SaaS products, but makes
  losing a business's real conversation history a single confirmed
  click with no recovery path. Rejected: guardrail #6 (every AI answer
  traceable) exists specifically so debugging and trust don't depend on
  data that might already be gone.
- **Block delete unless the bot has zero conversations** — safest
  against data loss, but a business with any real usage could never
  remove a bot, which reads as a broken feature rather than a
  deliberate constraint once a bot has been live for even a day.
  Rejected as not actually solving the problem it's meant to solve.
- **Cascade delete but keep conversations via `onDelete: SetNull`** —
  keeps transcripts but orphans them from their bot (and from the
  knowledge base that answered them), which breaks the conversation
  inbox's existing bot-name/filter UI and guardrail #6's traceability
  requirement just as much as deleting them outright. Rejected.

## Consequences

Reversible in the one sense that matters most (a business's own
mistake, clicking archive on the wrong bot, can be undone by clearing
`archivedAt` directly against the database) — but there is no "restore"
button in the console yet, which is a real, intentional gap: adding one
means a second decision (does an archived bot's data get pruned on a
retention timer, does the getting-started checklist react to an
un-archived bot, etc.) not yet asked. Every future bot-fetching query
must remember to filter `archivedAt: null`, or a "deleted" bot silently
reappears somewhere — noted above and in `docs/design/audit.md`, not
enforced by tooling. Hard-delete-with-cascade remains available as a
later, separate decision (e.g. a data-retention policy that actually
purges archived bots after N days) without this decision blocking it —
adding a purge job doesn't require re-litigating this ADR, since
`archivedAt` already marks exactly which rows such a job would target.
