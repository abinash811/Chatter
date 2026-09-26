# Screen audit — living design-bar scoreboard

Not a one-time review — a persistent tracker, updated every time a
screen is touched (`.claude/skills/ship-checklist/SKILL.md`'s design-bar
self-check step points here). Exists because a per-change checklist only
catches drift on what's *already being edited* — it can't surface a gap
on a screen nobody's touched in weeks. This file is what actually gets
checked instead of relying on someone noticing and asking.

**How to use this:**
- Before calling any UI work "done," update this screen's row.
- When auditing a screen (asked or self-initiated), log every finding
  here immediately — in the same turn, not "in the next commit." A
  finding that only exists in chat scrollback is a finding that gets
  lost the moment context compacts.
- ✅ done and verified · 🟡 partial/needs revisit · 🔲 not done · — n/a

## Depth/polish (principles.md #5/#9)

| Screen | Hover | Focus | Active | Loading skeleton | Depth (Card/shadow) | Notes |
|---|---|---|---|---|---|---|
| Login/signup | ✅ | ✅ | — | — (static form) | ✅ | Fixed 2026-09-26 (card was flat, eyebrow/link text near-invisible). |
| Bots list | ✅ | ✅ | ✅ | ✅ | ✅ | See "Bots list — open findings" below for what's still missing. |
| Bot editor | ✅ | ✅ | 🟡 | ✅ | ✅ | Original polish-pass screen; active state on Save/Publish not re-verified since. |
| Knowledge | 🔲 | 🔲 | 🔲 | ✅ | 🔲 | Loading skeleton added 2026-09-26; no depth/hover pass yet. |
| Integrations | 🔲 | 🔲 | 🔲 | ✅ | 🔲 | Shares the polished `BotTopBar`; own content (provider list) untouched. |
| Settings | 🔲 | 🔲 | 🔲 | ✅ | 🟡 | Already Card-wrapped; hover/focus/active on its inputs not re-verified. |
| Conversations list | 🔲 | 🔲 | 🔲 | ✅ | 🔲 | Table row click affordance not audited. |
| Conversation detail | — | — | — | ✅ | 🟡 | Read-only screen, less interactive surface to check. |
| Sidebar/top bar | ✅ | ✅ | 🟡 | — | 🟡 | Structurally solid (2026-09-26 rebuild); no dedicated shadow/hover pass. |

## Bots list — open findings (2026-09-26 audit)

Logged the same day they were found, per this file's own rule.

**Polish (no new functionality decision needed):**
- 🔲 "Draft only" vs "Published" badges are nearly indistinguishable —
  both render as the same gray pill. The single most important status
  signal on the screen doesn't stand out.
- 🔲 Every avatar chip is visually identical (same gray, same color) —
  fine at 2 bots, a wall of sameness past ~10.
- 🔲 Empty state has no CTA of its own — says "Create one above"
  instead of a real button inside the empty box.
- 🔲 Page feels thin for its hierarchy — one header row, a table, then
  unstructured white space; no supporting copy under "Bots".

**Functionality (real product decisions — ask before building):**
- 🔲 No search/filter on the list — breaks down past ~15 bots.
- 🔲 No per-row actions (rename/duplicate/delete) — no bot-delete
  feature exists anywhere in the product yet.
- 🔲 No column sort.
- 🔲 Bot creation is an inline text input, not a dialog — much thinner
  than a real "name it, maybe pick a template" flow.

## Process note

This file's existence is itself the answer to "how do we not miss this
again" — `docs/design/principles.md` states the bar, this file tracks
compliance against it per screen. If a new screen ships without a row
here, that's the gap to close, the same as any other missing doc per
`ship-checklist`'s "docs still accurate?" item.
