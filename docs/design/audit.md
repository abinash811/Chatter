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
| **`--muted` and `--accent` are the literal same value** (`oklch(97%)`) | ✅ | Fixed 2026-09-28: `ConversationThread.tsx`'s bot bubble is now `bg-primary text-primary-foreground` (solid black), matching the same high-contrast/active pairing already established for `Badge`'s `default` vs `muted` variants — visitor keeps the existing `bg-muted` gray, unchanged. Real decision made explicitly (not a mechanical swap): the bot/business voice gets the solid treatment, the visitor stays neutral. Verified via a real screenshot — the two speakers are now clearly distinguishable at a glance. |
| Per-item color variation (avatars, chips) | 🔲 | Single fixed token system-wide — no scheme for visually distinguishing items in a list (e.g. a deterministic per-bot hash → palette). |
| Dark mode | 🟡 | Tokens defined, never verified against a real rendered browser — every check done so far is light-mode only. |
| Elevation/shadow scale | 🟡 | `shadow-xs` etc. applied ad hoc per component, not from a documented scale — see `docs/design/component-checklist.md` item 2 (Ant Design's 3-layer model is the reference point, not the answer we've adopted yet). |
| Motion/animation policy | 🔲 | No documented duration/easing standard or "when not to animate" rule — `docs/design/component-checklist.md` item 3. |
| Copy structure for errors/empty states | 🟡 | `principles.md` #6 sets tone; no documented structural rule (3-part errors, always a CTA in empty states) — `docs/design/component-checklist.md` items 5-6. |
| `preview/*.html` vs. real tokens | 🟡 | `bots-list.html` updated 2026-09-27 to match what actually shipped (search/sort/dialog-creation/archive, corrected badge/avatar colors) — the rest of `preview/` is still the known-stale second source of truth (`docs/design/README.md`). |
| `muted-foreground`/`destructive` contrast | ✅ | Fixed 2026-10-02 (ADR 0033): both were razor-thin against their *real* usage backgrounds (`--muted`, the destructive `Badge`'s tinted background) — `docs/design/design-system.md`'s own prior verification had checked `muted-foreground` against `--background` (white) instead, a methodology gap, not just a wrong number. A Next.js 16 upgrade's full a11y-suite run tipped both over the 4.5:1 line and caught it for real. Darkened both tokens with real contrast math (5.5-7:1 margin now, checked against every real pairing, not one convenient backdrop) — see `docs/design/design-system.md`'s 2026-10-02 correction note. |

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
| Widgets | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-29, clean (`widgets` page, ADR 0028). Phase 2 (Functions) UI screenshot-verified 2026-09-30: empty state, Add dialog with the "Call an API" section expanded, and the populated table's "Calls API"/"Calls API — needs approval" badges all read clean against the design bar — axe scan not re-run against the new dialog fields. No manual SR pass. |
| Settings | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27, clean. No manual SR pass. |
| Conversations list/detail | 🔲 | 🔲 | 🟡 | Axe scan added 2026-09-27 for both — caught and fixed a real critical "button-name" violation (`ConversationFilters`'s bot/date-range `Select` triggers intermittently rendered with no accessible name at all, ~40% reproduction rate, same root cause as the bot-editor switcher bug: `SelectValue`'s label resolves after the trigger itself is accessible-name-checkable). Re-scanned clean 2026-09-29 after the split-pane rebuild (ADR 0027) — the list scan now targets the real `<ul><li>` rows (was the old `<table>` body), the detail scan is unchanged. No manual SR pass. |
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
| Bot editor | ✅ | ✅ | 🟡 | ✅ | ✅ | Original polish-pass screen; active state on Save/Publish not re-verified since. Appearance tab's avatar/position Selects added 2026-09-27 (screenshotted, reads clean); same real bug found and fixed in this pass: every `TabsContent` used `forceMount` (needed so all tabs' form fields stay mounted for one shared `<form>`) with no `data-[state=inactive]:hidden`, so all four tabs' content had always rendered stacked/visible simultaneously, not just the active one — confirmed via a real screenshot, not assumed. Persona tab's "Start from a template" dropdown added same day, screenshotted clean. Tools tab redesigned 2026-09-27 from a checkbox list to an `OptionCard` grid (icon/title/description/`Switch`), matching Chatbase's card-gallery pattern confirmed from real screenshots (`docs/research/competitive-landscape.md`) — screenshotted; a real unevenness bug (card heights varied wildly because a tool's `description` is model-facing instruction text, not short UI copy) was caught and fixed with `line-clamp-2` before calling it done, not shipped as-is. "Test your bot" preview added same day (`PreviewSheet.tsx`, a right-side `Sheet`) — screenshotted for unpublished/empty/sent states, all clean. **Known, not fixed**: a real screenshot caught the Publish success toast (Sonner, bottom-right, ~4s) visually overlapping the preview Sheet's input footer when Preview is opened within that window — rare (needs two clicks in quick succession) and self-resolving (the toast auto-dismisses), so left as a documented quirk rather than repositioning Sonner app-wide for it; revisit if it turns out to bother real users. Suggested-reply buttons added same day (a new "Suggested replies" card, 3 always-rendered `Input` rows, same fixed-row pattern as custom actions' field builder) — screenshotted clean, and the real embedded widget checked end-to-end (chips render under the greeting, clicking one sends it and clears the chips). Model tier + temperature card added to the Persona tab (2026-09-28, ADR 0026) — screenshotted at rest (Sonnet, slider locked at 1.0), Haiku selected (slider enabled + genuinely draggable via keyboard), Opus re-locking the slider, and post-reload persistence, all clean; a real axe-core failure caught the Slider's `aria-label` landing on the wrong element (`components/ui/slider.tsx`, see ADR 0026), fixed before calling this done. Guardrails tab gained a second Card, "Abuse protection" (2026-09-30, ADR 0029) — rate limiting + spam detection toggles with progressive disclosure (Switch + Input/Textarea, same pattern as the widgets Add-dialog's "Call an API" section). Real screenshot review (2026-09-30, prompted by a full design-system audit): reads clean at rest and expanded, keyboard-Tab-reachable, and a focus-ring investigation on this tab's `Switch`/`Button` elements turned out to be a false alarm — `getComputedStyle()` read mid-`transition-all` (~150ms) showed a zero box-shadow, but waiting for the transition to settle confirmed the real `ring-ring/50` focus ring renders correctly app-wide (Button/Select/Switch alike); not a bug, no fix needed. |
| Knowledge | ✅ | ✅ | 🟡 | ✅ | ✅ | Depth/polish pass 2026-09-28: Depth was already earned (same `rounded-lg border border-border shadow-xs` wrap as Conversations/Leads/Actions) but never credited. Hover/focus on the delete button and the Add Q&A/Upload file/Add URL buttons come from shadcn's real `Button` (`hover:bg-accent`, `focus-visible:ring`) — real screenshot review flagged the delete button's hover as *visually* almost imperceptible (`--accent` is `oklch(97%)` against a near-white `oklch(100%)` background, a 3-point lightness step), but `getComputedStyle()` confirmed it's genuinely applying (`rgba(0,0,0,0)` → `oklch(0.97 0 none)`), not broken — same subtlety already accepted for Bots list's row-action button (identical `ghost` variant, already credited ✅ there), so treated consistently rather than redesigned for this screen alone. This was a real, cross-cutting `--accent`-on-white contrast question (affected `ghost` buttons in `ActionsTable.tsx`, `BotTableRow.tsx`, `BotsTable.tsx`, `sidebar.tsx` too, not just Knowledge) — **fixed 2026-10-02** (prompted by a Chatbase design-quality review), after explaining the tradeoff to the user: `--accent` darkened app-wide from neutral-100 (97%) to neutral-200 (92.2%, the same step already used for `border`/`strong-background`), see `docs/design/design-system.md`. Confirmed via a real screenshot (hover now shows a clearly visible gray pill, not an invisible tint) and the full `accessibility.spec.ts`/`tests/visual/` suites (15/15 and 19/19, no regressions — `accent-foreground` still reads ~14:1 on the darker background). Active marked 🟡, not ✅: no per-row toggle here (unlike Actions/Approvals' `Switch`), and `Button` has no bespoke active state beyond the browser default. "Add" DropdownMenu replaced 2026-09-27 with 3 always-visible `OptionCard`s (Q&A/File/URL), matching Chatbase's Data sources page card gallery — screenshotted, reads clean.  **Data sources rebuild (2026-09-29)**: page renamed "Knowledge base" -> "Data sources" (matching Chatbase's own naming), a 4th `OptionCard` added (Text snippet), and search/type-filter/sort/bulk-select added to the table (`@tanstack/react-table` + `nuqs`, same pattern as `BotsTable.tsx`, ADR 0024) plus an informational total-size indicator. Real bug caught by an actual screenshot before shipping: `OptionCard`'s `line-clamp-2` description text was truncating mid-word ("reada...", ".txt, o...") once the grid went from 3 to 4 columns -- narrower cards, same verbose copy. Fixed by shortening all four descriptions rather than widening the layout; re-screenshotted clean, no more mid-word cuts, in both empty and populated (4-entry) states. Bulk-select bar (destructive-red "Delete selected", live count, header "select all" checkbox) screenshotted with a real 3-of-4 selection -- reads clearly. Real multi-page site crawling ("Add website" matching Chatbase's own link-count/auto-resync version) stays deliberately out of this pass -- `docs/open-questions.md` #3 is still unresolved; today's "Website" card is unchanged (single-page only). Notion pages and Tickets sources also out of scope (Notion needs a full OAuth connector; Tickets is Chatbase's own paywalled helpdesk integration). Verified: `tsc` clean, all 10 `check:all` guardrails, full unit suite, the full `knowledge.spec.ts` (17 tests, including new coverage for text-snippet/search/filter/sort/bulk-select) and `accessibility.spec.ts` knowledge scan, both `knowledge-empty.png`/`knowledge-add-dialog.png` visual baselines regenerated and stable across two runs, and the full 19-test visual suite otherwise unchanged. |
| Integrations | ✅ | ✅ | 🟡 | ✅ | ✅ | Depth/polish pass 2026-09-28: two real, code-level bugs, not just visual ones. (1) `provider.connectFields` carries a real `label` per field (`lib/integrations/provider.ts`) that the page never rendered — the raw `<input>` relied on its `placeholder` alone as the only hint, which isn't an accessible name; replaced with the shared `Input`/`Label` primitives (`sr-only` label, so the restrained Stripe register — docs/architecture.md §7 — keeps its horizontal, undecorated layout while gaining a real accessible name). (2) the provider-list wrapper was the one list screen still using a bare `divide-y`/`border-y` with no rounded corners or shadow — every other list screen (Knowledge/Leads/Actions/Conversations) already has `rounded-lg border shadow-xs`; added here too, verified via `getComputedStyle()` (10px radius, real shadow), not just eyeballed. New `integrations.png` visual baseline added (none existed before this pass) — first attempt raced the Suspense boundary and captured `loading.tsx`'s skeleton instead of real content (same class of flake already documented on the leads/actions empty-state tests); fixed by waiting for real text before capturing. Active marked 🟡 for the same reason as Knowledge: no per-row toggle here, `Button`/`Input` have no bespoke active state beyond the browser default. Verified: `tsc` clean, all 10 `check:all` guardrails, full unit suite, the integrations a11y scan (clean, now covers the labeled input), and the full 19-test visual suite (18 unchanged + 1 new, stable across two runs). |
| Leads | 🔲 | 🔲 | 🔲 | ✅ | 🟡 | New 2026-09-27, real screenshot checked — reuses Table/empty-state pattern from Knowledge/Conversations (already `border`+`shadow-xs`), so it inherits their depth; no dedicated hover/focus/active pass done (no interactive rows yet, view-only). |
| Actions | 🔲 | 🔲 | ✅ | ✅ | 🟡 | New 2026-09-27 (ADR 0022), real screenshot checked at empty/add-dialog/populated states — same Table/empty-state inheritance as Leads, plus a working `Switch` per row (real hover/active state from shadcn's own component, not custom-built) so per-row enable/disable already has a visible interactive affordance.  **Test-this-action added (2026-09-29)**: a real, working test step (fires an actual HTTP request, shows real status/body) in the Add-action dialog, verified end-to-end against a real public endpoint (api.github.com) during this pass, not just screenshotted — a genuine 403 response rendered correctly with the destructive-styled status badge. Real layout finding, not a functional bug: the field-row grid (name/description/required checkbox) was one flex row away from being cramped once a same-row test-value input was added; restructured to a two-line stacked row per field before shipping, confirmed via a real `scrollWidth`/`clientWidth` check (no horizontal overflow) rather than eyeballing a screenshot alone. |
| Approvals | 🔲 | 🔲 | ✅ | ✅ | 🟡 | New 2026-09-28 (ADR 0023), real screenshot checked at empty/pending/confirm-dialog/resolved states — same Table/empty-state inheritance as Leads/Actions. `AlertDialog` confirm step on Approve only (the one moment a real external write happens), matching the bot-publish confirm pattern. |
| Widgets | 🟡 | 🟡 | ✅ | 🔲 | ✅ | New 2026-09-29 (ADR 0028), real screenshots checked at empty/add-dialog/populated states (console CRUD surface) — same Table/empty-state/`AddActionDialog`-pattern inheritance as Actions, reads clean: badge for field count, working `Switch` + delete icon per row, dialog fields lay out the same as `AddActionDialog.tsx`. Hover/Focus marked 🟡 not ✅: inherited for free from shadcn's real `Table`/`Button`/`Switch` (same as every other Actions-pattern screen), but not independently re-verified via `getComputedStyle()` this pass. **Not verified**: the in-chat widget-render UI itself (`public/widget.js`'s form, `PreviewSheet.tsx`'s form) — triggering a widget needs a real model tool call, which needs a real `ANTHROPIC_API_KEY` (same class of gap as `conversations.spec.ts`/`knowledge.spec.ts`'s embeddings call); the rendering code reuses already-verified primitives (`Input`/`Select`/`Checkbox`/`Label`/`Button`, the same `bg-muted` bubble style as `ConversationThread.tsx`) but was not itself screenshotted live this pass. No `loading.tsx` skeleton screenshot check either. |
| Settings | ✅ | ✅ | 🟡 | ✅ | ✅ | Depth/polish pass 2026-09-28: unlike Integrations, no code-level bugs found here — this screen already used the shared `Input`/`Label`/`Card` primitives correctly (real `htmlFor`/`id` pairing, no raw elements) since it was originally built. `Card` already earns Depth (`rounded-lg border shadow-xs`, `components/ui/card.tsx`) — credited, was 🟡. Real screenshot review of rest/focus/hover/"key set" states: hierarchy clear, focus ring genuinely applies on both inputs, the "A key is set..." vs. managed-key copy reads clearly depending on state. Considered whether "Remove" (API key) needs a `destructive` variant or confirm dialog like Knowledge's delete — deliberately not flagged as a bug: removing a BYOA key is fully reversible (falls back to the managed key, no data loss), unlike a knowledge entry delete ("can't be undone"), so the existing `outline` variant with no confirm step is a reasonable, already-calibrated decision, not an oversight. Active marked 🟡 for the same reason as Knowledge/Integrations: no per-row toggle here, `Button`/`Input` have no bespoke active state beyond the browser default. No code changed this pass — audit-only. |
| Conversations list | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-09-28 depth/polish pass: hover was already free from shadcn's real `Table` (`hover:bg-muted/50`); Depth was already ✅-worthy (same `rounded-lg border border-border shadow-xs` wrap as Knowledge/Leads/Actions) but had never been credited. Two real bugs caught only by taking and reviewing an actual screenshot: (1) the row had only `onClick`, no `tabIndex`/`role`/`onKeyDown` — not keyboard-reachable at all, the same gap `BotTableRow.tsx` already fixed elsewhere but was never applied here when this screen shipped (ADR 0015) — fixed by copying that established pattern verbatim, now covered by a permanent e2e test (`tests/e2e/conversations.spec.ts`); (2) the row's `ChevronRight` used `text-border` (the row-border color, near-white) as an icon color, making it nearly invisible — failed at the one thing it's there for (signaling the row is clickable) — fixed to `text-muted-foreground`. Focus ring verified genuinely applying via `getComputedStyle()`/`:focus-visible`, not just a visually-ambiguous screenshot. **Split-pane rebuild (2026-09-29, ADR 0027)**: `<table>` row replaced with a real `<Link>` per `<li>` (`ConversationListPane.tsx`) — keyboard-accessible for free, no manual `tabIndex`/`onKeyDown` needed anymore. Recreated from Chatbase's own real Activity screenshots + docs, not guessed: status filter (ongoing/paused), a "..." menu with Select/Export all, bulk-select checkboxes, CSV export. Verified via real screenshots: Issue/Paused badges visible per row, bulk-select checkboxes render correctly, selection count updates live. |
| Conversation detail | ✅ | ✅ | ✅ | ✅ | ✅ | **Split-pane rebuild (2026-09-29, ADR 0027)**: previously read-only/low-interactivity, now genuinely interactive — a Chat/Details `Tabs` pair plus a Pause/Resume form button, recreated from Chatbase's own real "Details" tab screenshot (Contact/Source/Status/Sentiment/Messages/Country/Created/Last activity/Conversation ID). Sentiment and Country deliberately show "Not analyzed"/"Not tracked" (italic, muted) rather than fabricated values — matches Chatbase's own real "unanalyzed" state, confirmed from the user's screenshot, not invented. Real screenshot-verified: Contact correctly resolves "Anonymous" vs. a linked Lead's name, Source correctly shows "Widget" vs. "Playground", the Pause→Resume toggle works live with real toasts. Focus/hover/active inherited from shadcn's real `Tabs`/`Button`. |
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
