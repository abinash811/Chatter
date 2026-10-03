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
0035).

---

- **`--accent`-on-white contrast fix (2026-10-02).** Closed the
  cross-cutting finding flagged 2026-09-28 (`docs/design/audit.md`'s
  Knowledge row): `--accent` was only a 3-point lightness gap from
  `--background`'s pure white (97% vs. 100%), making every `ghost`
  button's hover state (`ActionsTable.tsx`, `BotTableRow.tsx`,
  `BotsTable.tsx`, `sidebar.tsx`, Knowledge's delete button) nearly
  invisible. Prompted by a design-quality review of Chatbase (confirmed
  from real screenshots captured earlier this project, not a fresh
  fetch — `chatbase.co` is network-blocked in this environment again).
  Two real choices explained to the user before building, per process
  rules: darken `--accent` app-wide vs. add a separate ghost-hover-only
  token (chose app-wide — fixes every current and future ghost button
  at once); and whether to also rebuild the bot editor's Preview into a
  persistent docked pane like Chatbase's (declined — kept the existing
  `Sheet`, out of scope for this pass).
  `--accent` (light mode only; dark mode's wasn't flagged) darkened
  from neutral-100 (`oklch(97% 0 none)`) to neutral-200
  (`oklch(92.2% 0 none)`) — reusing the same step already used for
  `border`/`strong-background`, not a new raw value. Real contrast math
  confirmed `--accent-foreground` (20.5% L) still reads ~14:1 against
  the darker background, comfortably above AA, before touching
  anything else that reads the token (dropdown/select focus states,
  the `Skeleton` loading fill, `AuthShell.tsx`'s logo chip against the
  dark `--panel` background).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails;
  full unit suite (235, unchanged — this is a CSS-only change); the
  full `accessibility.spec.ts` suite (15/15, no new violations); the
  full `tests/visual/` suite (19/19 unchanged — the hover delta isn't
  captured by resting-state screenshots, and the few static `bg-accent`
  usages, like `AuthShell.tsx`'s logo chip, stayed within the suite's
  existing pixel-diff tolerance); and a real one-off Playwright
  screenshot comparing the bots-list row action button at rest vs.
  hover, confirming the hover state now renders as a clearly visible
  gray pill instead of an imperceptible tint.

- **Accent-color/monochrome consistency audit (2026-10-02, task
  tracker #11).** A stale task predating ADR 0014's monochrome
  decision — clarified scope with the user first (consistency audit,
  not re-opening the monochrome-vs-colored-accent decision). A grep
  sweep (raw non-neutral Tailwind colors, `Badge` variant usage,
  `bg-primary`/`bg-accent`/`bg-soft-background` purpose consistency)
  plus real screenshots of 10 console screens found the monochrome
  system holding consistently everywhere — no new functional bugs.
  Fixed 2 stale code comments (`BotTableRow.tsx`, `AppSidebar.tsx`)
  still citing the pre-contrast-fix `--accent` value. Full detail:
  `docs/design/audit.md`'s System coverage table.

- **Inter typeface + page-title heading hierarchy (2026-10-02, ADR
  0036, supersedes ADR 0014's typography call).** The user reviewed
  the shipped product directly and called it "a college project" —
  immediately after the consistency audit above had found the token
  system internally sound, a real lesson that consistency-checking
  and quality-checking are different questions. Root-caused, not
  guessed: `app/globals.css` had zero `font-family` override anywhere
  (confirmed via grep) — every screen ran Tailwind's own default
  system-font stack. A second grep found zero uses of `text-xl` or
  larger anywhere in the app — every page title capped at `text-lg`
  (18px), no real heading hierarchy.
  Explained the real tradeoff to the user before building (Inter vs.
  a more distinctive typeface vs. keeping system font and fixing other
  gaps first; typography-first vs. empty-states-first vs.
  motion-first sequencing) — user chose Inter, typography-first.
  Adopted via `@fontsource-variable/inter`'s `wght.css` (self-hosted,
  zero runtime/build-time network dependency — confirmed real via
  `npm view`), not `next/font/google`, for the same network-dependency
  reason ADR 0014 originally removed CARE's Figtree import; wired as
  `--font-sans` in `app/globals.css`'s `@theme` (Tailwind v4's own
  preflight applies it to `html` automatically). The 9 genuine
  page-title headings (Bots, Leads, Actions, Widgets, Approvals, Data
  sources, Integrations, Settings, Conversations) bumped from
  `text-lg font-semibold` to `text-xl font-semibold tracking-tight` —
  a real tier above dialog/card titles, which stay at `text-lg`.
  `app/global-error.tsx`'s inline-styled fallback `h1` (deliberately
  not Tailwind-dependent, per its own header comment) and
  `BotTopBar.tsx`'s editable bot-name input (a different structural
  role, not a static heading) were deliberately left alone.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; a real computed-style check confirming
  `"Inter Variable"` actually renders (not a silent fallback) and the
  new page-title size/weight; full unit suite (235, unchanged); the
  full `tests/e2e/` suite (117/117); the full `accessibility.spec.ts`
  suite (15/15, no new violations); all 19 `tests/visual/` baselines
  regenerated and confirmed stable across two runs; a manual spot-check
  of several regenerated screenshots for layout breakage (clipping,
  overflow, misalignment from Inter's different metrics) — none found.
  Still open, by design: a full per-element typography sweep beyond
  page titles, the elevation-scale and motion-policy gaps
  `docs/design/audit.md` already tracked (next in line per this same
  feedback), and the empty-state/depth-hierarchy pass sequenced after
  this one.

- **Empty-state treatment + documented elevation scale (2026-10-02),
  the sequenced follow-up to the typography pass above.** User
  confirmed "Yes" to tackling empty states + depth hierarchy next.
  Real bug, not impression: Leads/Actions/Widgets/Approvals/Data
  sources each rendered a lonely plain-text box (no icon, no CTA) in a
  mostly-empty page — the single biggest remaining "unfinished"
  signal once the font/heading fix landed. New shared
  `components/console/EmptyState.tsx`, deliberately extracted from
  `ConversationDetailPanel.tsx`'s own pre-existing icon-badge pattern
  (its "Select a conversation" state) rather than invented — that was
  the one empty state in the app that already read as finished.
  Rolled out to all 5 screens with a fitting `lucide-react` icon each
  (`Users`/`Webhook`/`FormInput`/`ShieldCheck`/`Database`). Real CTA
  wired, not just copy, where a real action exists: Actions' and
  Widgets' empty-state buttons open the exact same dialog as their
  header button (`onAdd` prop threaded down from the existing
  `addOpen` state already in `ActionsForm.tsx`/`WidgetsForm.tsx`),
  verified via a real Playwright click-through, not just rendered.
  Leads/Approvals/Data-sources correctly got no fabricated CTA — no
  user action exists for the first two (visitor/bot-driven, not
  something to "add"), and Data sources already has its 4 `OptionCard`
  entry points above the table.
  Real regression caught and fixed: adding a second "Add action"/"Add
  widget" button broke 9 existing e2e test selectors in
  `actions.spec.ts`/`widgets.spec.ts` that assumed only one such
  button existed on the page — fixed with `.first()` to deterministically
  target the header button, the semantically "primary" one.
  Also closed `docs/design/audit.md`'s long-tracked "no documented
  elevation scale" gap — not a new scale, a real 3-tier one (surface
  `shadow-xs` / floating `shadow-md` / modal `shadow-lg`) already
  existed via shadcn's own untouched component defaults, confirmed by
  grepping every real `shadow-*` usage in the app; it just had never
  been written down. `docs/design/design-system.md`'s new Elevation
  section documents it; `docs/design/component-checklist.md`'s item 2
  updated to point to it. Honestly flagged, not silently dropped: the
  one interactive-hover convention that exists (`BotTableRow`'s avatar
  chip lifting `shadow-xs`→`shadow-sm` on row hover) is still only
  applied in that one place, not rolled out everywhere a row/card is
  clickable.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; a real Playwright script confirming all 5 new
  empty states render correctly and the Actions CTA genuinely opens
  its dialog; full unit suite (235, unchanged); the full `tests/e2e/`
  suite (117/117, after the selector fix above); the full
  `accessibility.spec.ts` suite (15/15, no new violations); the 4
  affected `tests/visual/` baselines (`leads-empty.png`,
  `actions-empty.png`, `knowledge-empty.png`/`knowledge-add-dialog.
  png`, `approvals-empty.png`) regenerated and confirmed stable across
  two runs, the other 15 unchanged.

- **Documented the real motion scale + closed the one actual motion
  gap (2026-10-02), third follow-up to the "college project" feedback.**
  Before building anything, checked what actually exists rather than
  trusting the earlier "zero motion, static UI" diagnosis — it was an
  overstatement. A grep of every real `animate-in`/`transition-*`/
  `duration-*` usage in `components/ui/` found Dialog, AlertDialog,
  DropdownMenu, Popover, Select, and Sheet all already animate open/
  close via shadcn's own untouched Radix-driven defaults. Real values
  confirmed from Tailwind v4's own `theme.css` (not recalled):
  `--default-transition-duration: 150ms`,
  `--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)`
  — which is, genuinely, Material Design's own "standard" easing
  curve, already the implicit default everywhere a bare `transition-*`
  class is used.
  The one real, previously-undiscovered gap: `TabsContent` (shadcn's
  real stock source) has zero transition on tab switch — content just
  pops in, the only primitive in that whole list that doesn't already
  animate. Fixed with a documented delta
  (`data-[state=active]:animate-in data-[state=active]:fade-in-0
  data-[state=active]:duration-200`, the same duration already used by
  the overlay tier) in `components/ui/tabs.tsx`.
  Real risk checked before trusting it: `BotEditorForm.tsx` uses
  `forceMount` + `data-[state=inactive]:hidden` on all 4 of its tabs
  (deliberately, so one shared `<form>`'s fields all stay mounted) —
  a case where content never actually unmounts, the kind of thing that
  could silently break a mount-triggered animation. Verified safe via
  the real `bot-editor.spec.ts` suite, not just a visual glance.
  Real debugging detour, documented honestly: an initial verification
  pass showed 9/10 `bot-editor.spec.ts` tests failing — looked like a
  real regression at first. Root-caused via bisection (reverted the
  CSS change, same failures persisted) to environmental contamination
  from manually curling/restarting the dev server on the same port
  while a separate Playwright-managed server was mid-test-run, not the
  code change. A clean, fully isolated re-run (killed every stray
  process first) passed 10/10, confirmed again by the full suite.
  Documented the real duration scale (micro `150ms` / overlay `200ms`
  / panel `300-500ms`, Sheet's own real asymmetric stock values left
  alone rather than second-guessed without cause) in
  `docs/design/design-system.md`'s new Motion section, closing
  `docs/design/component-checklist.md`/`docs/design/audit.md`'s
  tracked gap.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (235 unchanged — CSS-only); the
  full `tests/e2e/` suite (117/117, run fully isolated after the
  contamination above was ruled out); the full `accessibility.spec.ts`
  suite (15/15, no new violations); the full `tests/visual/` suite
  (19/19 unchanged — the fade only fires on an active tab switch, not
  captured by resting-state screenshots).

- **Table column header consistency fix (2026-10-02), app-wide
  typography-sweep item #1.** User asked for a consolidated list of
  pending design work "for consistent design throughout the app" —
  compiled every open item from `docs/design/audit.md`/
  `component-checklist.md` into system-wide vs. per-screen vs.
  accessibility buckets, explained the real tradeoff, and the user
  picked the typography sweep first.
  Real, previously-uncredited finding from that sweep, not assumed: a
  grep of every `<TableHead>` usage found Bots list's sortable column
  headers use a small-caps gray treatment (`text-xs uppercase
  tracking-wide text-muted-foreground`, `BotsTable.tsx`'s
  `SortableHead`) that Leads/Actions/Widgets/Approvals/Data sources
  never got — their plain `<TableHead>` cells rendered full-strength
  `text-sm` black text, a real, visible inconsistency across every
  list screen in the app. Even Data sources, which explicitly adopted
  "the same pattern as BotsTable.tsx" (2026-09-29 entry) for its sort
  *state*, never got the matching visual treatment — the underlying
  mechanism was shared, the look wasn't.
  Fixed at the shared primitive (`components/ui/table.tsx`'s
  `TableHead`), not per-screen — fixing it once gives every column
  header in the app the same look for free, including any future
  table, rather than 20 scattered className edits across 6 files.
  Documented as a deliberate delta from shadcn's stock source, same
  pattern as every other `components/ui/` customization (ADR 0025).
  Verified via real screenshots (Leads/Actions headers now visibly
  match Bots list's small-caps gray style, not just believed to from
  reading the diff).
  Real process note, logged honestly: an earlier verification pass in
  this same session hit a false alarm (9/10 `bot-editor.spec.ts`
  failures from environmental server contamination, not a code bug,
  per the Motion entry above) — applied the lesson here by running
  every verification step in full isolation from the start, killing
  any lingering manual server process before each test run.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (235 unchanged — CSS-only); the
  full `tests/e2e/` suite (117/117, clean isolated run); the full
  `accessibility.spec.ts` suite (15/15, no new violations); 3 affected
  `tests/visual/` baselines (`bots-table.png`, `bots-table-mobile.png`,
  `approvals-pending.png`) regenerated and confirmed stable across two
  runs, the other 16 unchanged.

- **Hover-elevation rollout (2026-10-02), app-wide consistency item #2
  of 3.** User asked to go ahead with the item named in the prior
  pass's consolidated design list. Audited before building, not
  assumed: `BotTableRow`'s `group-hover:shadow-sm` lift is specifically
  on its letter-avatar *chip* — the only other whole-row-navigates
  element in the app, `ConversationListPane`, has no chip, so the exact
  pattern had no second real instance anywhere. Reported this honestly
  to the user (three real options: leave as-is, design a broader
  convention, or pull forward item #3's per-item-avatar work) rather
  than manufacturing a fake chip just to tick a checkbox — user chose
  to design a broader, chip-independent convention.
  Implemented as a whole-row shadow lift on `ConversationListPane`'s
  rows: `shadow-sm` on hover, deliberately **no resting shadow**
  (rows share edges via `divide-y` — a resting shadow on every row
  would visually bleed into its neighbors, a real rendering concern
  flagged before building, not discovered after), `relative z-10` on
  hover so the lifted row's shadow renders above the border line of
  the row below it rather than being clipped by it.
  Verified the shadow is real, not just a class name with no effect:
  a Playwright script hovered a real row and read the live computed
  `box-shadow` value (`0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px
  rgba(0,0,0,0.1)` — the real `shadow-sm` value), the same verification
  method already established in this session for other subtle hover
  effects.
  Real process note: an initial full e2e run surfaced one failure
  (`bot-top-bar.spec.ts`, a strict-mode selector ambiguity on the
  Knowledge page's 3 comboboxes — switcher/filter/sort) in a file this
  change never touched; re-ran it in full isolation and it passed 3/3,
  confirming pre-existing test flakiness (same resource-contention
  class already documented in `CLAUDE.md`), not a regression.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (235 unchanged — CSS-only); the
  full `tests/e2e/` suite (116/117 on the first run, the one failure
  confirmed pre-existing and unrelated via an isolated re-run passing
  3/3); the full `accessibility.spec.ts` suite (15/15, no new
  violations); the full `tests/visual/` suite (19/19 unchanged — the
  shadow only fires on hover, not captured by resting-state
  screenshots).

- **Per-item grayscale avatar distinction (2026-10-03, app-wide
  consistency item #3 of 3 — completes the 3-item list the user set
  after the typography sweep).** After item #2's "no second real
  instance" finding, offered the real choice for this one up front
  rather than building anything first: per-item visual distinction
  almost always means per-item color in the wild (Slack/Linear/Notion
  all do it), which would reopen ADR 0014/0017's deliberate monochrome
  decision — just reaffirmed multiple times this session. Put that
  tradeoff to the user via `AskUserQuestion`; they chose to stay
  monochrome and vary grayscale only.
  Implemented as `lib/utils.ts`'s `hashToAvatarShade(id)` — a small
  string hash (`hash = hash*31 + charCode`, same shape as Java's
  `String.hashCode`) mapped into one of a fixed shade list, wired into
  `BotTableRow.tsx`'s avatar chip in place of the uniform `bg-primary/10`
  it used before. Real constraint found before picking the shade range,
  not guessed: a real headless-browser contrast check (canvas pixel
  readback of `getComputedStyle`, since `oklch()` strings don't resolve
  to rgb via plain `getComputedStyle` reads) of all 6 `--color-primary-*`
  steps against black text found `primary-50` (250,250,250) nearly
  indistinguishable from the page's white background and `primary-500`
  (115,115,115) failing WCAG AA outright (4.43:1, under the 4.5:1
  minimum) — `primary-100` through `400` all clear it with real margin
  (16.67:1 down to 8.13:1), so those 4 are the ones offered, not the
  theoretical 5-6 the token system has.
  Verified visually with a real screenshot: signed up, created 5 bots
  through the real UI, confirmed 5 genuinely distinct, legible gray
  chips on `/bots` (not just that the CSS classes differ).
  Real bug caught only by the visual regression suite, not by the
  implementation or the screenshot above: `tests/visual/`'s
  `bots-table.png`/`bots-table-mobile.png` baselines regenerated clean
  on the first run, then flaked on a second confirmatory run — the
  chip's shade is hashed from `bot.id`, which `signUpAndCreateBot`
  generates fresh every test run, so the "same" baseline test was
  capturing a different shade each time, exactly the same instability
  class as the already-masked Created/Started relative-timestamp
  columns, just not recognized as one until it actually flaked. Fixed
  by giving the chip a stable `data-slot="bot-avatar"` selector and
  adding it to both specs' existing `mask` arrays (not a new masking
  mechanism) — regenerated again and ran the full visual suite twice
  clean to confirm.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; the
  full unit suite (235, one failure — `crawler.test.ts`'s sitemap test
  timing out at 5000ms under parallel load — confirmed pre-existing and
  unrelated via an isolated re-run passing 8/8, this change touches no
  crawler code); the full `tests/e2e/` suite (117/117 — the one failure
  on the very first pre-change full run, `knowledge.spec.ts`'s delete-
  confirmation test, confirmed pre-existing and unrelated via an
  isolated re-run passing 1/1); the full `accessibility.spec.ts` suite
  (15/15, 0 violations); the full `tests/visual/` suite (19/19, the 2
  bots-list baselines regenerated with the new mask and confirmed
  stable across two full runs, the other 17 pixel-unchanged).
  `docs/design/audit.md`'s "Per-item color variation" row moves 🔲→✅,
  completing all 3 items of the "consistent design throughout the app"
  list the user set after the typography sweep.

