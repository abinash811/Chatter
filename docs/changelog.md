# Changelog — detailed session history

The full narrative history CLAUDE.md's "Current state" used to hold
directly: what was built, the real bugs caught while verifying it, and
how each was fixed. Moved here 2026-09-26 (user's explicit call —
CLAUDE.md had grown into a multi-thousand-word log, defeating its job
as a fast-navigation entry point) so CLAUDE.md can stay short and this
file can stay as long and as detailed as the work actually was.

**How to use this file:**
- New entries go at the bottom (chronological, oldest first — matches
  the order below).
- Write it the way the entries below are written: what changed, the
  real bugs found while verifying (not hypothetical ones), what was
  actually run to confirm it. This is where that detail belongs now —
  CLAUDE.md's "Current state" should stay a short pointer, not a copy.
- `docs/features.md` is the catalog (what's built, by feature, no
  history); `docs/roadmap.md` is what's next; this file is how we got
  here and what broke along the way. Don't duplicate between them —
  a one-line summary in CLAUDE.md, the catalog entry in features.md,
  the full story here.

**Archival policy (added 2026-09-27):** this file is a *living* doc,
which means it grows forever unless capped — the same failure mode
CLAUDE.md itself had. When it crosses roughly 500 lines, move its
oldest entries verbatim into a new `docs/changelog/<label>.md` (see
`docs/changelog/2026-09-part1.md` for the first one) and leave a
one-line pointer here. Nothing is lost, the live file just stays a
size someone will actually read start-to-finish.
`scripts/check-doc-length.mjs` flags this file (and every other living
doc) once it crosses the threshold, so this isn't just a rule to
remember — it's checked at commit time.

**Earlier history**: `docs/changelog/2026-09-part1.md` — everything
from the original CARE-based design system through ADR 0016
(conversation inbox made non-technical); `docs/changelog/
2026-09-part2.md` — the CARE-to-shadcn migration (ADR 0017) through the
bot top bar's shared-across-pages rework; `docs/changelog/
2026-09-part3.md` — skeleton loading states through the /bots list's
rebuild onto the real CARE `Table` (ADR 0008); `docs/changelog/
2026-09-part4.md` — the real unit-test layer standing up, visual
regression testing, and the depth/polish passes for Knowledge,
Settings, Integrations, and the Conversations Activity rebuild (ADR
0027); `docs/changelog/2026-10-part1.md` — In-chat widgets Phase 2
(functions that call a real API, ADR 0028); `docs/changelog/
2026-10-part2.md` — Guardrails Phase 1 (ADR 0029), real multi-page site
crawling (ADR 0030), the JS-rendering fallback (ADR 0031), and the
Firecrawl last-resort fallback (ADR 0032); `docs/changelog/
2026-10-part3.md` — TypeScript 7 + Next.js 16 upgrade (ADR 0033),
Prisma 7 upgrade (ADR 0034), and reranking via Voyage rerank-2 (ADR
0035); `docs/changelog/2026-10-part4.md` — the `--accent`-on-white
contrast fix, the accent-color/monochrome consistency audit, Inter
typeface + page-title heading hierarchy (ADR 0036), empty-state
treatment + the documented elevation scale, the documented motion
scale, and the table column header consistency fix; `docs/changelog/
2026-10-part5.md` — the hover-elevation rollout and per-item grayscale
avatar distinction (app-wide consistency items #2 and #3 of 3);
`docs/changelog/2026-10-part6.md` — the sidebar/top bar depth-polish +
accessibility pass, and bot-scoped nav moving from `BotTopBar` into the
sidebar (ADR 0037); `docs/changelog/2026-10-part7.md` — Leads/Approvals/
Integrations becoming org-wide (ADR 0038), and the ready-made Custom
Action templates; `docs/changelog/2026-10-part8.md` — the full-app
design audit, `request_refund` (sixth action tool), the
`withOrgContext` transaction timeout fix, and the first accent-color
increment of the design-system pass; `docs/changelog/2026-10-part9.md`
— Badge's `default` variant no longer rendering solid black, and the
3-guardrail design-drift automation pass (token-variant mapping,
variant visual coverage, token contrast). `docs/changelog/2026-10-part10.md`
— error-copy structure + register-assignment guardrails, the
OptionCard dead-hover fix, and the /design-system reference page's
Phase 1 (Tokens) and Phase 2 (Components). `docs/changelog/
2026-10-part11.md` — the /design-system reference page's Phase 3
(page templates + registers), and the real keyboard-only pass made
permanent across every screen.

---

## Bots list stat row — closes the "feels thin" content gap (2026-10-09)

Last of the open `docs/design/audit.md` findings flagged in the
previous entry. Its own diagnosis already said this needed "more real
content (recent activity, a stat), not a styling fix," and that the
approved mockup (`docs/design/preview/bots-list.html`) didn't solve it
either — so rather than guess at a fix, explained the real tradeoff to
the user first, per CLAUDE.md's "explain, then ask" process rule: an
org-wide stat row (cheapest, no schema change, fits the Linear
register's dense/no-decoration spirit) vs. a per-bot activity column
(more useful per-row, but changes the table's existing column shape).
User picked the stat row.

**Implementation**: `app/(console)/bots/page.tsx` now renders "N
published · N draft · N conversations this week" directly under
`PageHeader`, only when `bots.length > 0`. All 3 numbers are real,
already-available data, not fabricated (guardrail #4): published/draft
reuse the bots query already fetched for the table; conversations is a
new `tx.conversation.count({ where: { createdAt: { gte: ... } } })`
run inside the same `withOrgContext` transaction via `Promise.all`, a
rolling 7-day window rather than calendar "this week" to sidestep
timezone ambiguity. `loading.tsx` got a matching skeleton line.

**Real bug caught in the verification script, not the app**: the first
screenshot attempt showed "1 conversation this week" when 2 should have
counted. Investigated before trusting it — a direct DB query confirmed
the real count was genuinely 2, so the discrepancy was in the test's
own wait logic: `loadSampleDataAction` redirects to the new sample
bot's editor page on completion (`redirect()`, not an in-place
re-render), so a fixed `waitForTimeout` before navigating back to
`/bots` raced the redirect. Fixed by waiting for the real URL change
(`page.waitForURL(/\/bots\/[^/]+$/)`) before navigating back — the same
"wait for a real signal, not a timer" discipline this project's test
suite already uses elsewhere.

**New permanent coverage**, not just a one-off screenshot:
`tests/e2e/bots-list.spec.ts`'s new test seeds 3 real conversations via
the existing `seedConversations` helper, asserts the stat row reads "0
published · 1 draft · 3 conversations this week," then walks the real
publish flow (Publish button → confirm dialog) and asserts it updates
to "1 published · 0 drafts · 3 conversations this week" — the exact
counts, not just that the row renders. 3 visual baselines affected
(`bots-table.png`, `bots-table-published.png`, `bots-table-mobile.png`)
regenerated, each confirmed correctly styled via a real `sharp` crop
before trusting it, same discipline established during the
`/design-system` Phase 1 CSS-chunk-flake investigation.

Verified: `tsc` clean, all 16 `check:all` guardrails, a production
build, full unit suite (250/250 unchanged), full `tests/e2e/`
(143/143 — one flaky run first, `knowledge.spec.ts`'s sidebar-nav test,
confirmed as the same pre-existing full-suite-contention class via two
separate isolated re-runs, one against this change and one against
unmodified code via `git stash`, both passing clean), full
`accessibility.spec.ts` (19/19), `tests/visual/` (23/23 — 3
regenerated + stable, 20 unchanged).

## Dark mode removed completely (2026-10-11)

Closes the other remaining open item from the 2026-10-09 design-gap
sweep — `docs/design/audit.md`'s "Dark mode 🟡" row had sat open since
2026-10-08: tokens defined and contrast-verified, but never visually
rendered, no UI toggle ever existed to reach it. Rather than build a
toggle to close that gap, the user gave an explicit directive instead:
"Remove dark mode completely."

**Investigated before cutting anything**: confirmed there is no theme
toggle, no `next-themes`, and no `prefers-color-scheme` media query
anywhere in the app (`grep` across `app/`/`components/`/`lib/`) — the
`.dark` class was genuinely inert dead CSS, never applied to any real
element for any real user. Safe to remove outright, not just deprecate.

**What was removed**: the entire `.dark { ... }` token-override block
in `app/globals.css` (~60 custom-property overrides). `scripts/
check-token-contrast.mjs` — which verified every documented token pair
in both `:root` and `.dark` on every commit — simplified to `:root`
only (dropped the `THEMES` dual-theme loop, the `darkBlock` extraction,
and the per-theme error-message branching).

**Deliberately NOT removed, and why**: shadcn's own stock `dark:`
utility-class variants inside 6 `components/ui/*.tsx` files (`Button`,
`Select`, `Switch`, `Tabs`, `DropdownMenu`, `RadioGroup`) were left
untouched. These are real, unmodified upstream shadcn source — the
exact thing ADR 0014/0017/0025's "shadcn-only, no hand-rolled, pull
real source" discipline (enforced by `check-shadcn-only-primitives.mjs`
against `scripts/shadcn-manifest.json`) exists to protect. With no
`.dark` class ever applied, every `dark:`-prefixed class in those files
is inert — it matches nothing, costs nothing at runtime. Stripping them
would have meant hand-editing 6 files away from shadcn's real source,
creating 6 new documented deltas to maintain, for zero behavioral
difference. Judged this the correct scope for "remove dark mode
completely": remove the actual *capability* (the token layer that gave
`.dark` somewhere to land), not perform cosmetic surgery on inert
upstream classes that do nothing without it.

**Docs updated** to stop describing a feature that no longer exists:
`docs/design/design-system.md`'s two color-token tables lost their
"Dark" column entirely (not just marked stale); its "Known gaps" entry
rewritten from "never visually verified" to "resolved — removed."
`docs/design/audit.md`'s "Dark mode" row changed from 🟡 to `—` (not
applicable, not a lingering gap). `docs/accessibility.md`'s contrast
rule corrected to stop claiming "both light and dark mode" are
verified. Stale in-file comments in `app/globals.css` referencing
`.dark`'s values for comparison (the `--panel` token, the `--accent`
fix note) rewritten to not reference a block that no longer exists.
Old ADRs (0007/0008/0009) that mention dark mode as historical context
left untouched — they're accurate records of decisions made at the
time, not live claims.

Verified: `tsc` clean, all 16 `check:all` guardrails (the contrast
guardrail's own output confirms it now checks one theme, not two), a
production build, full unit suite (250/250 unchanged), full `tests/
e2e/` (143/143 across two full runs — one `knowledge.spec.ts` flake and
one `onboarding.spec.ts` flake, a different test each run, both
confirmed via isolated re-run as the same pre-existing full-suite
resource-contention class this project has documented repeatedly, not
a regression — a pure CSS/token removal has no plausible path to a
dialog-timing or redirect-timing race), `accessibility.spec.ts`
(19/19), `keyboard-navigation.spec.ts` + `bots-list.spec.ts` (23/23 —
re-run specifically since focus-ring/contrast CSS was touched),
`tests/visual/` (23/23, byte-identical — confirms light-mode rendering
is completely unaffected, as expected for a change that only ever
touched the unreachable `.dark` block).

## Restore-from-archive UI for bots (2026-10-11)

Closes the last item from the 2026-10-09 design-gap sweep. ADR 0018
(archive, never delete) shipped 2026-09-27 with no way back except a
direct database edit — `docs/design/audit.md`'s own "Bots list — open
findings" had carried "No restore UI yet" since then.

**Scoped before building, per CLAUDE.md's process rule**: two real
constraints shaped the options. The bots list currently filters to
non-archived bots and uses client-side search/sort (`@tanstack/
react-table` + `nuqs`), not Conversations' server-driven URL-filter
pattern. More importantly, `app/(console)/bots/[botId]/page.tsx`
deliberately 404s for an archived bot (`archivedAt: null` in its own
query) — so an archived row can never be click-to-editor the normal
way, whatever UI holds it. Presented the real fork — a status filter
on the main list (cheapest, reuses Conversations' established pattern)
vs. a separate dedicated view (more UI, but matches how this app
already treats every other list as its own route, and keeps the main
list from ever showing archived rows that can't behave like the
others) — and asked. User picked the separate view.

**Implementation**: new `/bots/archived` (Linear register, same as
`/bots` itself) — `app/(console)/bots/actions.ts`'s new
`restoreBotAction` sets `archivedAt: null`, FormData-keyed like
`approvals/actions.ts`'s `rejectAction` (a direct per-row post, not
`archiveBotAction`'s per-target `.bind()`, since this list has no
confirm-dialog target to carry through). `ArchivedBotsForm.tsx`
renders name + archived-date + a plain "Restore" button per row — one
action, so a `Button`, not a `DropdownMenu`, same one-action-per-row
shape `ApprovalsTable.tsx`'s Approve/Reject already uses. No confirm
dialog: restoring is the safe, reversible direction (always
re-archivable), the same precedent Settings' "Remove API key" audit
note already established for this app. `/bots` gets a new
`archivedCount` query (one cheap `tx.bot.count`) and an "N archived"
link — shown whenever there's somewhere real to send it, including
from the "No bots yet" empty state (every bot archived is a real,
reachable case, not hypothetical). `ArchiveBotDialog.tsx`'s own copy
updated — it used to promise a restore path "not yet from this
screen"; now it names the real one.

**Real UI confirmed via screenshots before writing a permanent test**:
archived the only bot, confirmed the "1 archived bot" link renders
correctly in the resulting empty state (not just the populated-list
case), followed it to `/bots/archived`, restored the bot, watched the
real "Bot restored." toast and the list settle back to its own empty
state. New permanent coverage, not just the screenshot walkthrough:
`tests/e2e/bots-list.spec.ts`'s new test walks the identical real
journey and additionally asserts the restored bot comes back as a
fresh draft (archiving/restoring never silently published it); a new
`archiveBot()` seed helper (`tests/e2e/helpers.ts`, same bypass-the-UI
precedent as `seedLead`/`seedCustomAction`) backs a new a11y scan and
a new `keyboard-navigation.spec.ts` entry for the screen; a new
`archived-bots.png` visual baseline (a populated row, not just the
empty state already well covered by Leads'/Actions' own empty-state
tests) — confirmed correctly styled via a `sharp` crop before
trusting it. The new route also changed the live `/design-system`
Registers table's row count, regenerating `design-system-templates.png`
for real reasons (one more table row), not a flake.

Verified: `tsc` clean, all 16 `check:all` guardrails (register-
assignment now covers 13 routes), a production build, full unit suite
(250/250 unchanged), full `tests/e2e/` (146/146), `accessibility.spec.ts`
(20/20), `tests/visual/` (24/24 — 1 new baseline + 1 regenerated for a
real content change, 22 unchanged).

## Sidebar brand chip fixed (2026-10-11)

User-reported, from a live screenshot of the console sidebar: the
brand chip (icon + bold text in `SidebarHeader`) was rendering the
signed-in business's own workspace name (e.g. a test-generated
"archive-shot-...") instead of the product's own name. The chip's own
existing code comment already documented the intended treatment as
"the real branded-chip look" — this was a real mismatch between
documented intent and what shipped, not a new design decision needing
a stop-and-ask: the correct product name is unambiguous ("Chatter"),
and the workspace name remains fully visible/editable at `/settings`,
so nothing was lost by not duplicating it in the sidebar.

Fix: `AppSidebar.tsx` no longer accepts an `orgName` prop — the chip's
label is now the literal string `Chatter`. `app/(console)/layout.tsx`
updated to stop passing `orgName={org.name}` (the `org` variable is
still used there for the `onboardedAt` redirect check). The
`data-testid="sidebar-org-name"` attribute was left unchanged to
minimize blast radius on existing selectors, even though it now labels
a static brand string rather than the org's name.

**Real flake class found and closed while verifying, not caused by
this change**: the full e2e suite surfaced a reproducible strict-mode
violation on the onboarding screen's heading locator —
`getByText("Welcome to Chatter")` intermittently matched 2 elements
once Next.js's `__next-route-announcer__` (a visually-hidden
`aria-live` region it mounts on every client-side navigation, echoing
the destination page's heading text verbatim) settled. Verified via
`git stash`/rebuild/isolated-rerun that this is pre-existing and
timing-dependent, not caused by this change (which touches no
onboarding behavior) — and recognized it as the same race already
diagnosed and fixed earlier this session in
`tests/e2e/keyboard-navigation.spec.ts`'s own onboarding test. Applied
the same `getByRole("heading", { name: ... })` fix to the two other
vulnerable locators (`tests/e2e/accessibility.spec.ts`,
`tests/e2e/onboarding.spec.ts`), closing a third independent instance
of this race alongside the two already documented at the top of
`accessibility.spec.ts`.

`tests/e2e/sidebar.spec.ts`'s first test renamed and its assertion
changed from checking for the literal word "workspace" to asserting
`sidebar-org-name` contains "Chatter".

The fix is invisible to the pixel-diff visual suite — `console.visual.
spec.ts`'s `sidebarMasks()` helper already masks
`[data-testid="sidebar-org-name"]` in every console-shell baseline (it
was previously per-run-unique text) — so it was confirmed with a real
screenshot (a temporary debug spec, deleted after use), not just
passing visual tests.

Verified: `tsc` clean, all 16 `check:all` guardrails, a production
build, full unit suite (250/250 unchanged), full `tests/e2e/`
(146/146, including the now-fixed onboarding race), `accessibility.
spec.ts` (20/20), `tests/visual/` (24/24 unchanged — confirms the
change is real but masked, as expected).

## Design-discipline root-cause fix (2026-10-11)

Asked directly why shipped design quality kept slipping despite a
detailed design-system doc set — the answer, grounded in this file's
own history: the token/component system itself was repeatedly
re-confirmed solid ("the monochrome system is holding consistently
app-wide"), but `.claude/rules/console-frontend.md` item 8's
screenshot-critique step was catching bugs *after* shipping in nearly
every entry above, never before. A discipline gap, not a tooling one.

Two real fixes, not just advisory wording:
1. **`scripts/check-audit-coverage.mjs`** (17th `check:all` guardrail,
   + `scripts/audit-coverage-manifest.json`) — mirrors `check-register-
   assignment.mjs`'s pattern: every real console route must have a row
   in both of `docs/design/audit.md`'s living tables. Found a real,
   live gap on its first run: Archived bots (ADR 0018's restore half,
   shipped 2026-10-11, this very session) never got a row — the exact
   failure mode this check exists to close, confirming the premise
   immediately. Fixed by writing an evidence-based row (read the real
   code/tests, not assumed) rather than just satisfying the check.
   Deliberately scoped to "does the row exist," not "is the row's
   content a real critique" — that half can't be mechanically verified
   and stays a judgment call.
2. **`.claude/rules/console-frontend.md` item 8** now requires writing
   the critique's actual findings into the response (a line per item,
   or an explicit "clean") — a bare "looks good" no longer satisfies
   it. `ship-checklist`'s item 13 updated to match.

Verified: `tsc` clean, all 17 `check:all` guardrails, full unit suite
(250/250 unchanged) — a docs/tooling-only change, no `app/`/
`components/` edits, so the e2e/visual suites weren't re-run (nothing
in their scope changed).

