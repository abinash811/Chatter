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

## System coverage (checked, not just per-screen)

This section exists because of a real miss: the "Published" vs "Draft"
badge problem wasn't a screen bug, it was a **system** gap — no
`--success` token existed anywhere, so there was nothing correct to
reach for. Per-screen audits above can't catch that kind of gap; only
asking "does the token *set* cover what we need" does. Check this list
whenever a screen needs a semantic meaning, before reusing the nearest
existing token as a stand-in.

| Coverage area | Status | Notes |
|---|---|---|
| Semantic colors (success/warning/destructive/info) | 🔲 | `--destructive` and `--warning` exist; **no `--success`/positive color** — the root cause of the badge issue. No `--info` either. |
| `Badge` variants | 🔲 | `default`/`muted`/`destructive` only — no `success` variant even if the token existed. |
| Per-item color variation (avatars, chips) | 🔲 | Single fixed token system-wide — no scheme for visually distinguishing items in a list. |
| Dark mode | 🟡 | Tokens defined, never verified against a real rendered browser — every check done so far is light-mode only. |
| Elevation/shadow scale | 🟡 | `shadow-xs` etc. applied ad hoc per component, not from a documented scale. |
| `preview/*.html` vs. real tokens | 🔲 | Known-stale second source of truth (`docs/design/README.md`) — accepted, not fixed. |

**Rule going forward:** if a screen needs to express a meaning (a
positive/success state, an info callout, per-item visual distinction)
and the token/variant for it doesn't exist, that's a system gap to fix
at the token/primitive layer — add it here as a row, don't quietly reuse
the nearest neutral token as a workaround. `.claude/rules/
console-frontend.md`'s "never hardcode a color" rule already blocks the
inline-hex version of this mistake; this table exists to block the
subtler version, where a real token gets reused for a meaning it wasn't
designed to carry.

## Responsive & accessibility

Added 2026-09-26 after finding this was a total blind spot, not just an
unfinished one: only 6 files in the whole app use any responsive
Tailwind prefix, every `tests/visual/` baseline runs at a fixed
1280×800, and no screen has ever had a real keyboard-only or
screen-reader pass — `docs/accessibility.md`'s contrast numbers are
real, but nothing else on it has been verified against an actual
assistive tool. Same lesson as "System coverage" above: a per-screen
depth/polish table can't surface a gap nobody thought to add a column
for. This table is what closes that.

| Screen | Checked <900px wide | Real keyboard-only pass | Screen-reader pass | Notes |
|---|---|---|---|---|
| Login/signup | 🔲 | 🔲 | 🔲 | Never checked below 1280px. |
| Bots list | 🔲 | ✅ | 🔲 | Row keyboard-nav fixed 2026-09-26 (`tabIndex`/`role="link"`/`onKeyDown`); no narrow-viewport or SR check. |
| Bot editor | 🔲 | 🔲 | 🔲 | Tabs/Dialog behavior not re-checked keyboard-only since the shadcn migration. |
| Knowledge | 🔲 | 🔲 | 🔲 | |
| Integrations | 🔲 | 🔲 | 🔲 | |
| Settings | 🔲 | 🔲 | 🔲 | |
| Conversations list/detail | 🔲 | 🔲 | 🔲 | |
| Sidebar/top bar | 🔲 | 🟡 | 🔲 | Collapse toggle keyboard-reachable (native `<button>`); switcher/nav not re-checked. |

**Rule going forward:** before calling any UI work done, add both to the
design-bar self-check (`ship-checklist` item 13) — not just hover/focus/
active/loading: (1) resize the real running app below ~900px and look
at it, don't just assume Tailwind's defaults degrade gracefully; (2)
actually tab through the screen with a mouse untouched. A full
screen-reader pass isn't required per change, but note in this table
whether one's ever been done for that screen — don't let "never
checked" silently read as "fine."

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
