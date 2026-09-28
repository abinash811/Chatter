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
badge problem looked like it needed a new `--success` token — it
didn't. **Corrected 2026-09-27**: the actual root cause was `Badge`'s
`default` variant using `bg-accent`, and `--accent` was redefined by
ADR 0014 to `oklch(97%)` — a pale near-white *background hover tint*,
not a visible fill color. `docs/design/preview/bots-list.html` (the
approved mockup) had always specified a solid, high-contrast fill for
"Published"; `default` just never got fixed to use `--primary`
(the monochrome system's solid color) the way `Input`/`Textarea`/
`Checkbox`'s focus rings already were on 2026-09-26. **The lesson isn't
"missing token," it's "check the approved mockup before shipping a
screen"** — principle #3 exists exactly for this and wasn't followed
when bots-list search/sort/archive shipped.

Per-screen audits above can't catch a token bug that's silent until
someone actually reads the rendered pixels — only checking the token
*set* against real screenshots does. Check this list whenever a screen
needs a semantic meaning, before reusing the nearest existing token as
a stand-in.

| Coverage area | Status | Notes |
|---|---|---|
| `Badge` `default` variant contrast | ✅ | Fixed 2026-09-27: `bg-accent` → `bg-primary` (see above). Also fixed the same bug in `BotTableRow`'s avatar chip (`bg-accent/10` → `bg-primary/10`) and `AppSidebar`'s brand-icon chip (`bg-accent` blended into `--sidebar`, a 1.5%-lightness gap). |
| **`--muted` and `--accent` are the literal same value** (`oklch(97%)`) | 🔲 | Found 2026-09-27 auditing the badge bug's blast radius. `ConversationThread.tsx`'s visitor bubble (`bg-muted`) and bot bubble (`bg-accent`) render as the *same color* — the transcript's two speakers are visually indistinguishable. Needs a real decision (which speaker gets which treatment), not a mechanical token swap like the badge fix — flagged here, not silently picked. |
| Per-item color variation (avatars, chips) | 🔲 | Single fixed token system-wide — no scheme for visually distinguishing items in a list (e.g. a deterministic per-bot hash → palette). |
| Dark mode | 🟡 | Tokens defined, never verified against a real rendered browser — every check done so far is light-mode only. |
| Elevation/shadow scale | 🟡 | `shadow-xs` etc. applied ad hoc per component, not from a documented scale — see `docs/design/component-checklist.md` item 2 (Ant Design's 3-layer model is the reference point, not the answer we've adopted yet). |
| Motion/animation policy | 🔲 | No documented duration/easing standard or "when not to animate" rule — `docs/design/component-checklist.md` item 3. |
| Copy structure for errors/empty states | 🟡 | `principles.md` #6 sets tone; no documented structural rule (3-part errors, always a CTA in empty states) — `docs/design/component-checklist.md` items 5-6. |
| `preview/*.html` vs. real tokens | 🟡 | `bots-list.html` updated 2026-09-27 to match what actually shipped (search/sort/dialog-creation/archive, corrected badge/avatar colors) — the rest of `preview/` is still the known-stale second source of truth (`docs/design/README.md`). |

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
| Login/signup | ✅ | 🔲 | 🟡 | Mobile baseline added 2026-09-26; automated axe scan clean (`tests/e2e/accessibility.spec.ts`), no manual SR pass. |
| Bots list | ✅ | ✅ | 🟡 | Row keyboard-nav + mobile baseline + axe scan 2026-09-26; search/sort/row-actions UI re-verified <900px and keyboard-only 2026-09-27 after shipping them — caught and fixed a real regression (sort headers pushed the row actions menu off-screen at 390px) and a real touch-usability gap (hover-to-reveal actions button was never visible on touch). No manual SR pass. |
| Bot editor | 🔲 | 🔲 | 🟡 | Axe scan clean 2026-09-26 — caught and fixed 2 real bugs first (switcher had no accessible name; embed snippet wasn't keyboard-focusable). No manual SR pass. |
| Knowledge | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean. No manual SR pass. |
| Integrations | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean. No manual SR pass. |
| Leads | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean. No manual SR pass. |
| Actions | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean (`custom_actions` page, ADR 0022). No manual SR pass. |
| Approvals | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-28, clean (`pending_actions` page, ADR 0023). No manual SR pass. |
| Settings | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean. No manual SR pass. |
| Conversations list/detail | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27 for both — caught and fixed a real critical "button-name" violation (`ConversationFilters`'s bot/date-range `Select` triggers intermittently rendered with no accessible name at all, ~40% reproduction rate, same root cause as the bot-editor switcher bug: `SelectValue`'s label resolves after the trigger itself is accessible-name-checkable). No manual SR pass. |
| Onboarding | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean. No manual SR pass. |
| Sidebar/top bar | 🔲 | 🟡 | 🔲 | Collapse toggle keyboard-reachable (native `<button>`); switcher/nav not re-checked. |

**Rule going forward (updated 2026-09-27):** the "Checked <900px wide"
column is retired for console screens — the user decided the console is
a desktop tool, not optimized for phone/tablet (`docs/product-spec.md`'s
"Explicitly out of scope for v1"). Leave that column's existing values
as historical record; don't add new resize checks on console work.
Before calling any UI work done, still do the other two: (1) actually
tab through the screen with a mouse untouched — a real keyboard-only
pass, independent of screen width; (2) note in this table whether a
screen-reader pass has ever been done — don't let "never checked"
silently read as "fine." The embeddable widget (`public/widget.js`) is
unaffected by the console decision and still needs phone-width checks
if it's ever touched.

## Depth/polish (principles.md #5/#9)

| Screen | Hover | Focus | Active | Loading skeleton | Depth (Card/shadow) | Notes |
|---|---|---|---|---|---|---|
| Login/signup | ✅ | ✅ | — | — (static form) | ✅ | Fixed 2026-09-26 (card was flat, eyebrow/link text near-invisible). |
| Bots list | ✅ | ✅ | ✅ | ✅ | ✅ | Search/sort/row-actions/archive shipped 2026-09-27 — see "Bots list — open findings" below for what's still missing. "Load sample data" button (outline variant, next to "New bot") added same day for the demo-data feature — screenshotted, reads as a clear secondary action, not competing with the primary CTA. |
| Bot editor | ✅ | ✅ | 🟡 | ✅ | ✅ | Original polish-pass screen; active state on Save/Publish not re-verified since. Appearance tab's avatar/position Selects added 2026-09-27 (screenshotted, reads clean); same real bug found and fixed in this pass: every `TabsContent` used `forceMount` (needed so all tabs' form fields stay mounted for one shared `<form>`) with no `data-[state=inactive]:hidden`, so all four tabs' content had always rendered stacked/visible simultaneously, not just the active one — confirmed via a real screenshot, not assumed. Persona tab's "Start from a template" dropdown added same day, screenshotted clean. Tools tab redesigned 2026-09-27 from a checkbox list to an `OptionCard` grid (icon/title/description/`Switch`), matching Chatbase's card-gallery pattern confirmed from real screenshots (`docs/research/competitive-landscape.md`) — screenshotted; a real unevenness bug (card heights varied wildly because a tool's `description` is model-facing instruction text, not short UI copy) was caught and fixed with `line-clamp-2` before calling it done, not shipped as-is. "Test your bot" preview added same day (`PreviewSheet.tsx`, a right-side `Sheet`) — screenshotted for unpublished/empty/sent states, all clean. **Known, not fixed**: a real screenshot caught the Publish success toast (Sonner, bottom-right, ~4s) visually overlapping the preview Sheet's input footer when Preview is opened within that window — rare (needs two clicks in quick succession) and self-resolving (the toast auto-dismisses), so left as a documented quirk rather than repositioning Sonner app-wide for it; revisit if it turns out to bother real users. Suggested-reply buttons added same day (a new "Suggested replies" card, 3 always-rendered `Input` rows, same fixed-row pattern as custom actions' field builder) — screenshotted clean, and the real embedded widget checked end-to-end (chips render under the greeting, clicking one sends it and clears the chips). |
| Knowledge | 🔲 | 🔲 | 🔲 | ✅ | 🔲 | Loading skeleton added 2026-09-26; no depth/hover pass yet. "Add" DropdownMenu replaced 2026-09-27 with 3 always-visible `OptionCard`s (Q&A/File/URL), matching Chatbase's Data sources page card gallery — screenshotted, reads clean. |
| Integrations | 🔲 | 🔲 | 🔲 | ✅ | 🔲 | Shares the polished `BotTopBar`; own content (provider list) untouched. |
| Leads | 🔲 | 🔲 | 🔲 | ✅ | 🟡 | New 2026-09-27, real screenshot checked — reuses Table/empty-state pattern from Knowledge/Conversations (already `border`+`shadow-xs`), so it inherits their depth; no dedicated hover/focus/active pass done (no interactive rows yet, view-only). |
| Actions | 🔲 | 🔲 | ✅ | ✅ | 🟡 | New 2026-09-27 (ADR 0022), real screenshot checked at empty/add-dialog/populated states — same Table/empty-state inheritance as Leads, plus a working `Switch` per row (real hover/active state from shadcn's own component, not custom-built) so per-row enable/disable already has a visible interactive affordance. |
| Approvals | 🔲 | 🔲 | ✅ | ✅ | 🟡 | New 2026-09-28 (ADR 0023), real screenshot checked at empty/pending/confirm-dialog/resolved states — same Table/empty-state inheritance as Leads/Actions. `AlertDialog` confirm step on Approve only (the one moment a real external write happens), matching the bot-publish confirm pattern. |
| Settings | 🔲 | 🔲 | 🔲 | ✅ | 🟡 | Already Card-wrapped; hover/focus/active on its inputs not re-verified. |
| Conversations list | 🔲 | 🔲 | 🔲 | ✅ | 🔲 | Table row click affordance not audited. |
| Conversation detail | — | — | — | ✅ | 🟡 | Read-only screen, less interactive surface to check. |
| Sidebar/top bar | ✅ | ✅ | 🟡 | — | 🟡 | Structurally solid (2026-09-26 rebuild); no dedicated shadow/hover pass. |

## Bots list — open findings (2026-09-26 audit)

Logged the same day they were found, per this file's own rule.

**Polish (no new functionality decision needed):**
- ✅ "Draft only" vs "Published" badges were nearly indistinguishable —
  fixed 2026-09-27, and it wasn't a missing-token problem (see "System
  coverage" above's correction): `Badge`'s `default` variant was using
  the wrong token (`bg-accent`, redefined to a near-invisible pale tint
  by ADR 0014) instead of `bg-primary`, the same class of bug already
  fixed elsewhere in the app. "Published" is now a solid, high-contrast
  pill; "Draft only" stays the muted gray one.
- ✅ Every avatar chip was visually identical *and* washed out (same
  bug: `bg-accent/10` blended into white) — the wash-out is fixed
  (`bg-primary/10`, now a real visible chip). Per-bot color *variety*
  (distinguishing bot A's chip from bot B's) is a separate, still-open
  enhancement — see "System coverage" above.
- ✅ Empty state has no CTA of its own — fixed 2026-09-27: a real
  `NewBotDialog` trigger now lives inside the empty box.
- 🔲 Page feels thin for its hierarchy — one header row, a table, then
  unstructured white space; no supporting copy under "Bots". Still
  open — genuinely needs more real content (recent activity, a stat),
  not a styling fix; the approved mockup doesn't solve this either.

**Component-checklist audit (2026-09-27, `docs/design/component-checklist.md`):**
- ✅ **Item 1 (states)** — `NewBotDialog`'s "Create" button had no
  pending/disabled state during the real create+redirect round-trip. A
  double-click could create two bots. Fixed: `onSubmit` + `useTransition`
  disables it and relabels "Creating..." while in flight — not
  `useFormStatus`, which doesn't work here (the button is associated
  with the `<form>` only via the HTML `form=` attribute, not React
  nesting; a real Playwright run confirmed it never fired). Verified
  with a real test (`tests/e2e/bots-list.spec.ts`) that catches the
  in-flight POST and asserts the disabled/relabeled state, not just a
  screenshot.
- ✅ **Item 1 (states)** — the "Duplicate" menu item now shows
  "Duplicating..." while pending instead of just disabling silently.
- ✅ **Item 6 (empty-state CTA)** — the zero-results search state now
  has a real "Clear search" button, verified end-to-end.
- ✅ **Item 5 (error copy)** — Rename/Archive error toasts now name a
  reason ("the change didn't save") instead of jumping straight from
  *what* to *next*. Still a generic reason, not a specific diagnosed
  cause — there isn't a more specific one available for a plain DB
  update failure — but the three-part structure is there.

**Functionality (real product decisions — asked before building, per
this file's own rule):**
- ✅ Search/filter — shipped 2026-09-27, client-side (per-org bot lists
  are small; a server round-trip would be over-engineering).
- ✅ Column sort (Name/Status/Created) — shipped 2026-09-27.
- ✅ Per-row rename/duplicate — shipped 2026-09-27.
- ✅ Per-row removal — shipped 2026-09-27 as **archive**, not hard
  delete (ADR 0018, user's explicit choice when asked). No restore UI
  yet — only directly against the database.
- ✅ Bot creation is a dialog (`NewBotDialog`), not an inline input —
  shipped 2026-09-27.

## Process note

This file's existence is itself the answer to "how do we not miss this
again" — `docs/design/principles.md` states the bar, this file tracks
compliance against it per screen. If a new screen ships without a row
here, that's the gap to close, the same as any other missing doc per
`ship-checklist`'s "docs still accurate?" item.
