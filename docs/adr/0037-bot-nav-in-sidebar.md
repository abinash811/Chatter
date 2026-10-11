# ADR 0037: Bot-scoped page navigation moves into the sidebar

Status: accepted

Date: 2026-10-04

## Context

`BotTopBar.tsx` (2026-09-26, `app/(console)/bots/[botId]/layout.tsx`)
rendered a bot switcher plus a horizontal row of 7 links (Editor/
Knowledge/Leads/Actions/Widgets/Approvals/Integrations) across every
bot-scoped page, citing `docs/design/principles.md` #10's "persistent
top bar" pattern as its justification.

A full-system audit (user-requested, 2026-10-03/04) surfaced a real,
previously-uncaught hierarchy problem on the bot editor specifically:
the editor page renders a second, visually *stronger* `<Tabs>` row
(Persona/Guardrails/Tools/Appearance, a bold pill/segmented control)
directly beneath BotTopBar's plain-gray-text links. A user's eye lands
on the bolder pills first, not the actual primary page-to-page
navigation above them. Re-reading principle #10 during this review
confirmed it was never actually about BotTopBar's cross-page links —
it describes a *within-page* composition (entity name/status/actions
+ `<Tabs>` for sections of one scrolling form, which is exactly what
the editor's own Persona/Guardrails/Tools/Appearance tabs are).
BotTopBar had conflated two different jobs — cross-page routing and
within-page section-switching — and stacking both directly on top of
each other is what produced the inversion.

Separately, 7 flat, same-weight text links with no grouping or icons
is already a weak scan pattern on its own, independent of the Tabs
collision — worth fixing regardless of where the nav ends up living.

## Decision

Move the 7 bot-scoped page links (plus the bot switcher) out of
`BotTopBar.tsx` and into a new contextual sub-nav section inside
`AppSidebar.tsx`, rendered only while the current route is under
`/bots/[botId]/...` — a Notion/Linear-style pattern where opening a
specific resource adds that resource's own nav into the persistent
left sidebar rather than a second horizontal bar competing with
in-page tabs. `BotTopBar.tsx` is deleted; each bot-scoped page keeps
its own already-existing visible page title as the real `<h1>`, and
`bots/[botId]/layout.tsx` keeps a small `sr-only` `<h1>{bot.name}</h1>`
for assistive tech (the one real a11y role BotTopBar used to carry).
The global top-level nav (Bots/Conversations/Settings) stays visible
at all times — this is an addition to the sidebar, not a full context
switch — so a user is never more than one click from leaving the bot.

## Alternatives considered

- **Add icons to the existing horizontal bar** (GitHub repo-nav
  precedent for this exact item count) — lower-risk, no IA change, but
  doesn't fix the real problem: the bar would still sit directly on
  top of the stronger Tabs row on the editor page specifically.
- **Regroup into fewer top-level items** (cluster Knowledge/Widgets/
  Actions under one umbrella, Leads/Approvals under another) — reduces
  visual noise without a full architecture change, but adds an extra
  click to pages used often and needs new grouping labels with no
  precedent elsewhere in the product; user considered and passed over
  this in favor of the bigger, cleaner restructure.
- **Keep everything in BotTopBar, shrink the Tabs row instead** — would
  technically fix the specific hierarchy inversion on the editor page,
  but does nothing for the 7-flat-links scan problem and only patches
  one symptom of the underlying conflation.

## Consequences

Removes the one real instance in the app where two tab-like rows
competed for the same visual language. Every bot-scoped page now has
exactly one clear primary nav (the sidebar) and one clear page title
(its own `<h1>`) — consistent with how the top-level app already
works (sidebar nav, page-owned titles) rather than a second pattern
invented just for bots.

Harder to reverse than a pure styling tweak: this changes where 7
routes are discoverable from, touches `AppSidebar.tsx`,
`app/(console)/layout.tsx` (now fetches the org's bot list for the
sidebar, not just `bots/[botId]/layout.tsx`), every bot-scoped page's
heading level, and the e2e specs that assert these links exist.
Reversing it later means rebuilding a top-bar nav from scratch, not
just reverting one file. Chosen anyway because the hierarchy problem
it fixes is real and was independently confirmed by the design audit,
not invented to justify the bigger change.

Also fixes a smaller, previously-unnoticed bug while here: the nav
item still read "Knowledge," left over from before the 2026-09-29
"Knowledge base" → "Data sources" rename — the sidebar entry now says
"Data sources," matching the page's own real title.
