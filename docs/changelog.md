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
variant visual coverage, token contrast).

---

## Error-copy structure + register-assignment guardrails (2026-10-08)

Direct follow-up to the design-drift-automation entry above — the user
picked the two cheapest, most mechanical items off the "still missing"
list: documented error-copy structure (component-checklist.md item 5)
and a register-consistency check (Linear/Notion/Stripe, architecture.md
§7).

**Error copy.** A grep for the one generic-failure template this app
actually uses ("Couldn't X. Please try again.") found 23 real
occurrences — only 2 (rename/archive, fixed 2026-09-27, `docs/design/
audit.md`'s "Bots list — open findings") had the middle "why" clause
("the change didn't save") that made that fix read as a real 3-part
error. The other 21, across actions/knowledge/widgets/conversations/
approvals/settings/`BotsTable.tsx`'s duplicate-failure toast, jumped
straight from what failed to "try again" with nothing in between.
Rolled out a reason clause to all 21, picking the real failure class
each one actually represents — not inventing specifics that don't
exist: "the change didn't save" for create/save/update/publish
failures (matching the established rename/archive precedent exactly),
"it wasn't removed" for deletes, "something went wrong on our end" /
"something went wrong reading it" / "something went wrong fetching it"
for the 3 cases that aren't a DB write at all (the preview-chat reply
failure, and knowledge ingestion's file/crawl/URL catch-alls — these
already surface a *specific* diagnosed cause via `KnowledgeIngestionError
.message` when one exists; the generic reason only fires for a truly
unexpected failure). New `scripts/check-error-copy-structure.mjs`:
scans every `app/**/actions.ts` and `components/console/**/*.tsx` for a
string literal starting with "Couldn't" and containing "Please try
again," and fails if there's no em-dash-separated reason clause between
them — deliberately narrow (only this one established template, not a
general prose-quality checker, which can't be done reliably with a
regex); a validation message that already names the problem directly
("A name is required.") is a different, legitimate category and isn't
required to match this template at all. Verified the check actually
catches the bug class: reverted one message to the old 2-part form,
confirmed a real FAIL, reverted back.

**Register assignment.** Attempted the fuller ask first — mechanically
verify a screen's actual density/spacing matches its assigned register
— and found a real reason it can't be built honestly today without
inventing new policy: the one candidate mechanical signal in this
codebase, the `h-row` page-header pattern, turned out to be used
*identically* across every register's pages (it's this app's universal
page-header height token, applied for an unrelated reason — every
page's title row needs a fixed height, regardless of register — not a
density differentiator at all). No other concrete, already-consistent
per-register spacing value exists in the real code to check against;
`BotEditorForm`'s own tabs alone range `space-y-2` through `space-y-6`
with no documented target. Picking real numeric density targets per
register is a design decision for the user to make (CLAUDE.md's
"explain the tradeoff, then ask" rule) — not invented here. Built the
honest, buildable slice instead: `scripts/register-manifest.json`
transcribes the already-decided textual assignment (architecture.md
§7 / `.claude/rules/console-frontend.md` item 3) for all 11 console
routes into checkable data, and `scripts/check-register-assignment.mjs`
fails if a route has no entry (or the manifest has a stale one) — so a
new screen can no longer ship with its register silently never decided,
even though *verifying* the density itself stays open, flagged
explicitly rather than silently dropped.

`check:all` is now 15 guardrails. Verified: `tsc` clean, all 15
guardrails pass (both new ones confirmed to actually fail on a real
induced bug, then reverted), full unit suite (250/250 unchanged), a
production build, full `tests/e2e/` (126/126 — the toast-text
assertions in `knowledge.spec.ts` use a prefix regex, unaffected by the
added reason clauses), `accessibility.spec.ts` (16/16), full
`tests/visual/` (20/20 unchanged — these are toast/string changes, no
visual baseline touches toast copy).

## `OptionCard` dead-hover bug fixed (2026-10-08)

Last item off the "still missing in the design system" list the user
picked through this session — a previously-diagnosed, real, cheap bug
that had been explicitly deferred pending the broader pass: a
diagnostic script had found `OptionCard`'s own `box-shadow` computed
style identical before and after a real hover, confirmed via
`getComputedStyle()`, not assumed from a screenshot alone.

Fixed with `transition-shadow hover:shadow-sm` added to the `Card` in
`components/console/OptionCard.tsx` — the same convention
`ConversationListPane`'s rows and `BotTableRow`'s avatar chip already
use (a `shadow-xs`→`shadow-sm` bump on hover), not a new pattern
invented for this one component. No `z-10`-stacking trick needed here
(unlike `ConversationListPane`'s zero-gap `divide-y` rows) — `OptionCard`
grids use `gap-3`, so a neighbor's border never clips the lifted
shadow.

**Real methodology snag while re-verifying**: the first verification
attempt (Playwright's `.hover()` convenience method, the same call used
throughout this project's prior hover checks) showed *no* change in the
computed box-shadow — looked like the fix hadn't taken. Didn't accept
that at face value and ship a "fixed" claim that wasn't actually true:
checked the rendered DOM directly first (confirmed `hover:shadow-sm` was
genuinely present in the element's class list), then re-tested with
`page.mouse.move` to the element's real bounding-box center instead of
the `.hover()` helper — that showed the real, different shadow value
(`0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)` vs. the
resting `0 1px 2px rgba(0,0,0,.05)`), confirmed via
`el.matches(":hover")` too. The `.hover()` helper's failure here is a
test-tooling quirk, not a real regression — flagged for awareness, not
investigated further since it isn't blocking.

Verified: `tsc` clean, all 15 `check:all` guardrails, full unit suite
(250/250 unchanged), a production build, full `tests/e2e/`
(`knowledge.spec.ts`/`bot-editor.spec.ts`/`actions.spec.ts`/
`accessibility.spec.ts`, 55/55 — `OptionCard` is also used on the Tools
tab and the Add-action template picker, both covered), full
`tests/visual/` (20/20 unchanged — no baseline captures a hover state,
so a resting-state-only change was never expected to move pixels), a
real before/after screenshot of the hovered card.

## `/design-system` reference page, Phase 1: Tokens (2026-10-08)

Scoped first (per CLAUDE.md's "explain the tradeoff, then ask" rule —
this is a new pattern with real tradeoffs, not a one-obvious-answer
build): explained live-rendering-page vs. Storybook, auth-gated vs.
public, and content scope as 3 explicit choices with tradeoffs before
building anything. User picked: in-house live-rendering page (no new
dependency, matches this project's existing lightweight-tooling
pattern), behind the existing console auth, and a v1 scope covering
tokens + components + page templates (bundling in the separately-
tracked "no shared page-template components" gap rather than
sequencing it later).

**Route**: `app/(console)/design-system/page.tsx` — inherits
`app/(console)/layout.tsx`'s existing auth check for free, deliberately
not added to `AppSidebar`'s main nav (a reference tool for whoever's
building the console, not something a business owner needs in their
daily nav), reachable by direct URL. Registered in `scripts/register-
manifest.json` as `notion` (a calm, generous reference surface).

**Phase 1 content** (`TokensSection.tsx` + a reusable `Swatch.tsx`):
every real color token in `app/globals.css`'s `@theme` block, grouped
the same way `design-system.md`'s own prose does, each swatch rendered
via the *real* Tailwind utility class (`bg-primary`, not a copied hex)
so the page can't drift from the actual tokens by construction — plus
the documented type scale, 3-tier elevation scale, 3-tier motion scale
(with one live hover-triggered demo), and the radius/spacing notes.
Components and page-templates sections are Phase 2/3, not built yet.

**Real bugs found by building a live reference — the whole point of
one over a hand-written doc**: this page is the first thing to ever
actually *render* 4 solid-fill status foreground tokens
(`--destructive-foreground`/`--warning-foreground`/`--alert-foreground`/
`--success-foreground`) as real text — nothing else in the app uses
them (Button's real destructive variant hardcodes `text-white`, not
the token). Its own accessibility scan immediately caught 3 of the 4
failing WCAG AA: `--success-foreground` (green-50 on green-500,
2.15:1), `--alert-foreground` (white on violet-500, 4.32:1— just under
the line), and `--destructive-foreground` in dark mode specifically
(red-50 on red-400, 2.63:1 — flagged once before during the contrast-
guardrail work and left unfixed then, since nothing real rendered it
at the time). Fixed all 3 for real in `app/globals.css` — switched to
black, the same direction `--warning-foreground` already used (amber-
500/violet-500/green-500/red-400 are each light enough backgrounds
that dark text reads better than light) — computed via `culori`, not
guessed. All 4 solid-fill pairs added to `scripts/contrast-pairs.json`
now that a real render site exists (19 pairs total, was 15).

**Second real finding, same session**: `--disabled-foreground` and
`--placeholder-foreground` are *also* dead tokens — zero real call
sites anywhere; `Input`'s actual placeholder styling uses
`placeholder:text-muted-foreground` instead. Rendering them as plain
"Aa" text tripped the same accessibility scan (1.48:1 — they're
deliberately low-contrast, which WCAG exempts for genuinely disabled
controls, but a plain `<div>` isn't one). Fixed the page itself, not
the tokens: rendered them via a real disabled `Button` and a real
`<input disabled placeholder="Aa">` instead of a plain colored block —
more accurate to what the tokens are actually for, and the scan
correctly exempts real disabled/placeholder elements the same way it
already does everywhere else in the app. Documented the dead-token
finding in the page's own copy rather than silently working around it.

**Real environment flake surfaced, not caused, by this page**: the
first two visual-baseline capture attempts rendered the page
completely unstyled (no colors, no grid, browser-default fonts) —
traced to the page's CSS chunk returning a real HTTP 500 ("The
destination stream closed early", digest `3640184059` — the same
background noise that's appeared in nearly every `[WebServer]` log
this entire session without previously being tied to a visible
consequence). Confirmed via `curl`ing the chunk directly (500,
21-byte body) and via `document.styleSheets`/computed-style checks
(an `<h1>` showing weight 700, the raw browser-default bold, instead
of Tailwind's `font-semibold` 600) before accepting a baseline — not
assumed from a quick glance. A clean server restart + retry produced a
correctly-styled capture, confirming this is a transient server-side
streaming issue in this environment, not a bug in the page's code.

Verified: `tsc` clean, all 15 `check:all` guardrails (19 contrast
pairs now, 1 more than before), a production build, full unit suite
(250/250 unchanged), full `tests/e2e/` (127/127), `accessibility.spec.ts`
(17/17, including the new design-system scan — clean only after both
token fixes), full `tests/visual/` (21/21 — 20 unchanged + the new
`design-system-tokens.png` baseline, confirmed correctly styled via a
direct pixel crop before accepting it, not just a thumbnail glance).

## `/design-system` reference page, Phase 2: Components (2026-10-08)

Direct follow-up — all 26 primitives in `scripts/shadcn-manifest.json`
now render via the real imported component on the page's new
"Components" tab (`ComponentsSection.tsx` composing 5 category files:
buttons/badges, form controls, overlays, display, navigation), not
described. Overlays (Dialog/AlertDialog/Sheet/Popover/DropdownMenu/
Tooltip) are real, clickable triggers, not static screenshots — Radix
manages their open state uncontrolled, same as every real call site in
the app. Sidebar isn't re-demoed in isolation (you're looking at its
real instance in the same page); Toaster fires a real toast through
the app's actual global `<Toaster />`.

**Two more real bugs found by building a live reference, not
assumed** — the page's own Components-tab accessibility scan (added
alongside the Tokens-tab one from Phase 1) caught both on first run:

1. The page's own `Field` helper (wrapping `Label` + `Input`/`Textarea`
   demos) rendered the label and control as unassociated siblings — no
   `htmlFor`/`id` — so a screen reader couldn't tell they were related
   (axe's `label` rule, critical impact). Fixed by making `id` a
   required prop and cloning it onto the child, matching the real
   `htmlFor`/`id` pattern every actual form in this app already uses
   (`SettingsForm.tsx`).
2. `ScrollArea` — zero real call sites anywhere before this page — has
   a genuine, pre-existing gap in its real shadcn stock source: the
   scrollable `Viewport` already had a `focus-visible` ring class but
   no `tabIndex`, so keyboard users could never actually reach it to
   scroll (axe's `scrollable-region-focusable` rule, a known real Radix
   ScrollArea gap, not an app-specific bug). Fixed with `tabIndex={0}`,
   documented as a delta from stock in the component's own file header
   — the same pattern every other intentional shadcn delta in this
   codebase already follows.

Also added `Alert`/`AlertTitle`/`AlertDescription` to the Display
section — missed in the first pass, caught by the new `scripts/check-
design-system-page-coverage.mjs` (built this same session): fails if
any `shadcn-manifest.json` primitive is never referenced anywhere
under `app/(console)/design-system/`. Verified it actually catches a
real gap (not just passes vacuously) by deliberately removing the
`Alert` demo block and confirming a real FAIL, then restoring it.
`check:all` is now 16 guardrails.

Verified: `tsc` clean, all 16 guardrails, a production build, full
unit suite (250/250 unchanged), full `tests/e2e/` (127/128 — the one
failure, `accessibility.spec.ts`'s onboarding scan, confirmed the same
pre-existing flake via a clean isolated re-run, nothing to do with this
page), `accessibility.spec.ts` run alone (18/18, including both new
Components-tab scans — clean only after both real fixes above),
`tests/visual/` (22/22 — 21 unchanged + the new `design-system-
components.png` baseline, each candidate baseline's actual dimensions
checked via `sharp` before accepting, not just glanced at, after Phase
1's experience with the environment's CSS-chunk flake). Real
screenshots of every overlay actually opening (Dialog, AlertDialog,
Sheet, Popover, DropdownMenu, Tooltip-on-hover) and the Toaster demo
firing a real "Draft saved." toast through the app's actual global
toaster — not just that the trigger buttons render.

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

