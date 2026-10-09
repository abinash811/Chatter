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
Phase 1 (Tokens) and Phase 2 (Components).

---

## `/design-system` Phase 3: Page templates + registers (2026-10-09)

Final phase of the 2026-10-08 scoping decision. Investigated before
building: grepped every real `h-row items-center justify-between`
title+action header across `app/` and found it duplicated verbatim
across 6 real pages/forms (Bots, Leads, Approvals, Custom actions,
Data sources, Widgets) plus their `loading.tsx` skeletons — a genuine,
identical pattern worth extracting, unlike a hypothetical one.

**New shared component**: `components/console/PageHeader.tsx`
(`{ title, count?, action? }`), extracted the same way `EmptyState.tsx`
was — from an existing duplicated pattern, not invented. `count` is a
`ReactNode`, not a `number`: the real call sites don't all format it
the same way (a bare "3" on Bots/Leads/Widgets/Custom actions/Data
sources vs. "3 waiting" on Approvals), so forcing one shape would have
meant inventing a pluralization/suffix API nothing asked for. Rolled
out to all 6 real pages/forms; `loading.tsx` skeletons left alone — a
skeleton has no title/count/action semantics to extract, it's a shape
mimicking the real header, not a second real caller.

**Deliberately not extracted, documented live instead**: the Dialog-
based creation flow (`NewBotDialog.tsx`/`AddActionDialog.tsx`/
`AddWidgetDialog.tsx`/`AddUrlDialog.tsx` all open a real shadcn Dialog
whose form posts through a server action) and `BotEditorForm.tsx`'s own
header (title + publish-status Badge + 3 actions — genuinely different
from every other screen's single-title-plus-action shape, the one
screen that edits and publishes a bot). Forcing either into
`PageHeader`'s shape would have meant bending a shared component's API
around one caller — the same restraint `docs/design/component-
checklist.md` and this project's "no speculative abstraction" rule
already call for. Both documented with real prose on the new tab
instead of a mockup.

**New "Page templates" tab**, `PageTemplatesSection.tsx`: a live,
real-rendered `PageHeader` instance; the Dialog/editor-header notes
above; and a **Registers** table — reads `scripts/register-
manifest.json` directly (the same data `check-register-assignment.mjs`
enforces), so it can't drift from what the guardrail actually checks,
plus a 3-card Linear/Notion/Stripe legend.

**Verified**: `tsc` clean, all 16 `check:all` guardrails (unchanged —
no new guardrail needed this phase; `check-design-system-page-
coverage.mjs` already covers every primitive used), a production
build, full unit suite (250/250 unchanged), full `tests/e2e/`
(128/129 — the one failure, `knowledge.spec.ts`'s delete-entry test,
confirmed as the already-documented pre-existing CI-contention flake
by reproducing it identically against the unmodified branch via
`git stash` before and after this change, not assumed), a new
accessibility scan for the Page templates tab added to
`accessibility.spec.ts` (19/19 total, including the 2 existing
design-system-tab scans), `tests/visual/` (23/23 — 2 existing
`design-system-*` baselines regenerated for the new 3rd tab's layout
shift, 1 new `design-system-templates.png` baseline added, all 20
others byte-for-byte unchanged, confirming the `PageHeader` rollout
produced identical markup to what it replaced; every regenerated/new
baseline's real styling confirmed via `sharp` crops before trusting
it, same discipline established during Phase 1's CSS-chunk-flake
investigation). All 3 phases of the original 2026-10-08 scoping
decision are now complete.

## Real keyboard-only pass, made permanent + closed 3 open design gaps (2026-10-09)

User asked to work through `docs/design/audit.md`'s open findings.
"Real keyboard-only pass" was 🔲 (never done) for every screen except
Sidebar/Bots list/Login-signup — and even Sidebar's own 2026-10-03 pass
was a one-off MCP browser session, nothing committed as a repeatable
check. Built a shared `keyboardWalk()` helper (`tests/e2e/helpers.ts`)
and a new `tests/e2e/keyboard-navigation.spec.ts` covering all 13
remaining screens (Login, Signup, Bot editor, Data sources,
Integrations, Leads, Actions, Widgets, Approvals, Settings,
Conversations list + detail, Onboarding) — tabs through each screen's
real, populated content (reusing `accessibility.spec.ts`'s own seed
helpers) and fails if a reachable control paints no visible focus
indicator or if nothing is reachable at all.

**Two real bugs in the test helper's own methodology, found and fixed
before trusting any result**, not just in the app:
1. An early fingerprint (`aria-label ?? id ?? textContent`) silently
   collided on every unlabeled element — a DOM node's `id` is `""`, not
   `null`, when unset, so `??` never fell through to `textContent`, and
   every unlabeled sidebar link fingerprinted identically. The walk
   then mistook real tab progress for a stall and stopped after one
   step on every single screen (11/11 initial failures). Fixed by
   tagging the actual DOM node with a real per-element counter instead
   of a text/id heuristic — can't collide.
2. A `blur()`-before-walking "reset" silently skipped past
   `/onboarding`'s `orgName` field, which has real `autoFocus` —
   confirmed via a raw debug walk that Chromium doesn't restart
   sequential tab order from the top of the document after a
   programmatic blur, it resumes forward from the blurred element's own
   position. Fixed by starting the walk from whatever already has real
   focus on page load (including an autofocused field) instead of
   discarding it — also the more accurate thing to test, since that's
   exactly what a real keyboard user sees.
A third, narrower issue: reaching a screen via `page.click('a:has-text(
...)')` leaves the clicked link holding real focus with no visible
ring, which is *correct* native `:focus-visible` behavior for a
mouse-focused element, not a bug — but produced a false failure once
the walk started inspecting pre-existing focus. Fixed by reaching each
screen via `page.goto()` instead, the same neutral starting point a
real keyboard user gets from a fresh page load.

**One real, previously-unverified product bug found once the helper
was trustworthy**: `components/ui/tabs.tsx`'s `TabsContent` is a
genuinely focusable Radix element (so arrow/Home/End keys can scroll a
tall panel into view) but shadcn's own stock source pairs it with a
bare `outline-none` and nothing to replace it — tabbing into the Bot
editor's Persona tab or the Conversation detail's Chat tab landed with
zero visible focus indicator. Same class of gap as the ScrollArea
viewport fix (2026-10-08, also a genuine pre-existing hole in shadcn's
real stock source, not an app-specific regression). Fixed with the same
`focus-visible:ring-[3px] focus-visible:ring-ring/50` every other
primitive in this app already uses, documented as a delta in the
file's own header comment.

**Two more design-gap findings closed in the same pass**, both using
real verification, not assumption:
- **Hover/Focus on Leads/Actions/Approvals/Widgets** (previously 🔲/🟡
  in `docs/design/audit.md`'s Depth/polish table): all 4 share the
  identical `Table`/`TableRow` primitive already credited elsewhere
  (`hover:bg-muted/50`), but had never been independently re-verified.
  Confirmed via real `page.mouse.move` + `getComputedStyle()` (not
  Playwright's `.hover()` convenience method — the same false-negative
  quirk the `OptionCard` dead-hover investigation had already
  documented: `.hover()` showed Leads' row background as unchanged,
  0 alpha before and after, while a real mouse move to the row's
  bounding-box center showed the genuine 0→0.5 alpha transition). All 4
  now ✅. Leads' Active column changed from 🔲 to `—` (not applicable):
  it has no interactive per-row control at all, so there's genuinely
  nothing to check, not an unverified gap.
- **Copy structure for errors/empty states** (previously 🟡 in
  "System coverage," citing "no documented structural rule"): stale —
  `scripts/check-error-copy-structure.mjs` (2026-10-08) already
  mechanically enforces the 3-part error template, and
  `components/console/EmptyState.tsx` (2026-10-02) already gives every
  empty state a real CTA or deliberately omits one. Re-confirmed both
  are still true app-wide (grepped all 5 empty-state screens for the
  shared component, no hand-rolled box found) before flipping the row.
- **Widgets' Loading column** (previously 🔲): `loading.tsx` exists and
  matches the same real skeleton pattern already credited on
  `actions/loading.tsx` — confirmed via direct code read, not assumed
  missing.

Deliberately left open, not silently closed: Screen-reader pass stays
🟡 on every screen — no literal assistive-technology pass has ever been
done, and nothing in this pass claims otherwise. Three other open
gaps — Bots list "feels thin for its hierarchy" (needs new real
content, not a styling fix), no restore-from-archive UI, and dark
mode's tokens never being visually rendered (no UI toggle exists) — all
need a real product decision, not a mechanical fix, so they're reported
back to the user rather than guessed at silently, per CLAUDE.md's
process rule.

Verified: `tsc` clean, all 16 `check:all` guardrails, a production
build, full unit suite (250/250 unchanged), full `tests/e2e/`
(142/142, including the full new `keyboard-navigation.spec.ts`, 13/13),
`accessibility.spec.ts` (19/19 unchanged), `tests/visual/` (23/23
pixel-identical — confirms the `TabsContent` fix only affects the
`:focus-visible` state, invisible at rest in every baseline).

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

