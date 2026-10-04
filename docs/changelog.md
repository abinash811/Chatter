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
scale, and the table column header consistency fix.

---

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

- **Sidebar/top bar depth/polish + accessibility pass (2026-10-03).**
  Asked for by name — `docs/design/audit.md`'s last screen with open
  findings: Active 🟡/Depth 🟡 on the Depth/polish table, keyboard-pass
  🟡/screen-reader 🔲 on the Responsive & accessibility table.
  Audited `AppSidebar.tsx` and `BotTopBar.tsx` before changing anything,
  same discipline as the hover-elevation rollout: `AppSidebar`'s nav,
  search, Getting Started popover, and logout button are all real
  shadcn primitives (`Sidebar`/`Input`/`Button`, ADR 0017) — confirmed
  via a real computed-style check that hover/focus/active already work
  for every one of them, no code change needed there, the 🟡 was
  stale. `BotTopBar.tsx`'s horizontal tab nav is the one hand-built
  piece in either component, and had two real, concrete gaps: no
  `focus-visible` ring at all (every other custom nav/row element in
  the app — `ConversationListPane`, `BotTableRow` — has one), and its
  active tab was signaled by text color alone (component-checklist.md
  item 4, color-independent state) — weaker than the `Tabs` pill
  rendered directly below it on the same screen.
  Fixed both: added `focus-visible:ring-2 ring-ring ring-offset-2`
  matching the established pattern, plus a `border-b-2` underline
  (transparent at rest so switching tabs causes no layout shift) and
  `aria-current="page"` as a non-color, assistive-tech-visible active
  signal. Verified via a real screenshot confirming the underline
  genuinely follows the active tab across a real navigation (Editor →
  Knowledge), not just that the class exists.
  Did a real keyboard-only pass, not just a code read: a Playwright
  script tab-walked from a fresh page load through all 15 reachable
  elements (sidebar search/3 nav items/Getting Started/logout/collapse
  toggle, bot switcher, all 7 `BotTopBar` tabs) and read each one's
  live `getComputedStyle()` — every element reachable, visible, and
  carrying a genuine focus ring (not just an outline reset with
  nothing behind it).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails;
  full unit suite (235, unchanged — no logic touched); the full
  `tests/e2e/` suite (117/117); `accessibility.spec.ts` (15/15, 0
  violations); `tests/visual/` — the active tab's resting-state
  underline (`border-b-2 border-foreground`, not just the hover/focus
  states) does render in every baseline that includes `BotTopBar`, so
  this touched 10 of the 19 baselines (every bot-scoped screen — bot
  editor and its Appearance/publish-dialog/preview-sheet variants,
  Leads, Actions, Knowledge empty+dialog, Approvals empty+pending,
  Integrations, and the collapsed-sidebar shot, which is also taken
  from a bot page), all regenerated and confirmed stable across two
  full runs, the other 9 pixel-unchanged. `docs/design/audit.md`'s
  Sidebar/top bar rows updated in both tables (Depth/polish Active
  🟡→✅; Responsive & accessibility keyboard-pass 🟡→✅, screen-reader
  🔲→🟡 — automated axe coverage via every bot-scoped page's existing
  scan, still no literal AT pass, same honest standard as every other
  row).

- **Bot-scoped nav moves from BotTopBar into the sidebar (2026-10-04,
  ADR 0037).** Triggered by a user-requested full-system audit
  (process/security/testing/design, via 3 parallel research agents +
  this session's own fresh design-audit context) — the user then
  specifically called out the bots section's horizontal tabs as "not
  that good." Looking closely confirmed a real, previously-uncaught
  hierarchy problem: `BotTopBar`'s 7 plain-gray-text links sat directly
  above the editor's own visually *stronger* `<Tabs>` pill row
  (Persona/Guardrails/Tools/Appearance), so a user's eye landed on the
  bolder secondary tabs first, not the actual primary page nav above
  them. Root cause, found while re-reading `docs/design/principles.md`
  #10 during this review: that principle's "persistent top bar +
  Tabs" pattern was always about *within-page* section-switching, not
  cross-page routing — `BotTopBar` had conflated the two jobs, and
  stacking both directly on top of each other produced the inversion.
  Presented 3 real alternatives to the user before building anything
  (per CLAUDE.md's process rule): add icons to the existing bar
  (GitHub repo-nav precedent, lowest risk), regroup into fewer
  top-level items, or move the nav into the sidebar (Notion/Linear-
  style). User chose the sidebar move — the biggest change, and the
  only one of the three that actually resolves the Tabs collision
  rather than just making the symptom less visible.
  `BotTopBar.tsx` deleted outright. `AppSidebar.tsx` gained a
  contextual `SidebarGroup` (bot switcher + the 7 links, each with a
  real icon reused from that page's own `EmptyState` — `Users`/
  `Webhook`/`FormInput`/`ShieldCheck`/`Database`, not invented fresh)
  rendered only while `usePathname()` matches `/bots/[id]`. 5 pages'
  page-title heading (`Leads`/`Actions`/`Widgets`/`Approvals`/
  `Integrations`/`Knowledge`) promoted from `<h2>` to a real `<h1>` —
  they'd deferred to `BotTopBar`'s sr-only `<h1>` before; that heading
  now lives in `bots/[botId]/layout.tsx` directly. `BotEditorForm.tsx`
  gained a real visible "Editor" `<h1>` it never had (previously relied
  entirely on `BotTopBar`'s heading, the one page with no page-title
  convention of its own). Also fixed in passing: the nav item still
  read "Knowledge," stale since the 2026-09-29 "Data sources" rename.
  **Real, serious bug caught only by the e2e suite, not by any manual
  check or screenshot**: 3 tests failed after the move —
  `demo-data.spec.ts`, and the new `bot-sidebar-nav.spec.ts`'s switcher
  test — both timing out waiting for sidebar links that silently
  weren't there. The `error-context.md` snapshot showed exactly why:
  right after creating a brand-new bot (via "Load sample data" or the
  "New bot" dialog) and landing on its page, `AppSidebar`'s own `bots`
  list — fetched once by the shared `app/(console)/layout.tsx` — didn't
  include the bot that had just been created. Root cause, confirmed by
  reading Next.js's own real `revalidatePath` docs (`node_modules/next/
  dist/docs/.../revalidatePath.md`), not recalled: `redirect()` alone
  does not refetch a *shared parent layout's* own server data on a
  client-side transition — `createBotAction`/`loadSampleDataAction`/
  `duplicateBotAction` redirected to the new bot with no
  `revalidatePath` call at all, and `renameBotAction`/`archiveBotAction`
  only called the default `revalidatePath("/bots")` (page-level,
  doesn't reach a parent layout). Fixed by adding
  `revalidatePath("/", "layout")` to all 5 — the documented pattern for
  busting a *layout's* cached data, not just one page's. This was a
  real, previously-invisible gap in the architecture `ADR 0037`
  introduced, not a pre-existing bug — the old `BotTopBar` read its
  `bots` list from the inner `bots/[botId]/layout.tsx`, which *is*
  freshly re-run per distinct `botId`, so this exact staleness class
  never had a chance to surface before.
  Also fixed a real strict-mode ambiguity in the new
  `bot-sidebar-nav.spec.ts` test itself: a bare
  `getByRole("combobox")` on the Data sources page matches 3
  comboboxes (switcher + filter + sort, the same ambiguity class
  already documented elsewhere in this app) — disambiguated via the
  switcher's own `aria-label`. Renamed `bot-top-bar.spec.ts` →
  `bot-sidebar-nav.spec.ts` to match what it actually tests.
  Fixed a second, unrelated real bug found while running the full unit
  suite during this pass: `tests/unit/lib/ai/crawler.test.ts`'s
  sitemap-discovery test has a real (not mocked) per-page courtesy
  `setTimeout` in `crawler.ts`, and 4 pages' worth was close enough to
  vitest's 5000ms default to flake under parallel-worker load —
  independently confirmed by this session and an earlier audit agent.
  Given the same explicit extended timeout the file's own
  `MAX_CRAWL_PAGES` test already uses for the identical reason.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (235, the crawler flake now fixed
  for real, confirmed via a direct re-run); the full `tests/e2e/`
  suite; `accessibility.spec.ts`; real screenshots of the Editor and
  Data sources pages confirming the sidebar nav renders correctly and
  tracks the active route. `docs/design/audit.md`'s "Sidebar/top bar"
  rows merged into a single "Sidebar" row in both tables, Depth moved
  🟡→✅ (no second bar left to flatly compare it against).

- **Leads, Approvals, and Integrations become org-wide (2026-10-04,
  ADR 0038).** Reviewing the just-shipped ADR 0037 sidebar nav, the
  user named 3 of its 7 items (Leads/Approvals/Integrations) as not
  actually belonging nested under one bot. Asked directly what "global"
  meant for each, since they're not the same kind of change: Leads and
  Approvals are naturally cross-bot concepts (both models already carry
  an indexed `orgId`), so moving them was a query-scope and page-
  placement change, no schema touched — same pattern `/conversations`
  already uses (global nav item, optional `?botId=` filter, a "Bot"
  column per row). Integrations was a real data-model question:
  separate per-bot connections with a combined view, offered as the
  lower-risk option, vs. one Shopify connection genuinely shared by
  every bot in the org. User chose the shared-connection model — a
  real store isn't scoped to one bot, so the per-bot schema was the
  wrong fit from the start, not a convenience tradeoff worth keeping.
  **Schema migration, run for real** (`prisma/migrations/
  20261004000000_integrations_org_scoped/`): `Integration.botId`
  removed, `@@unique([botId, provider])` → `@@unique([orgId,
  provider])`. `prisma migrate dev` wanted a full dev-database reset
  over unrelated, expected drift (pgvector/RLS columns this project
  deliberately applies outside Prisma's own migration history, `db/
  migrations/`) — correctly refused by the permission system as
  irreversible local destruction. Worked around it the safe way
  instead: hand-wrote the migration SQL matching Prisma's own
  conventions, applied it directly via `prisma db execute` (checked
  the `integrations` table was empty first — zero real risk), then
  `prisma migrate resolve --applied` to keep the migration history
  consistent for next time. `lib/integrations/provider.ts`'s
  `IntegrationProvider` interface, `shopify.ts`, the OAuth callback
  route, and `check_order_status`/`cancelOrder.ts`'s Shopify lookups
  all dropped `botId` to match — `executeOrderCancellation` no longer
  takes one at all (it only ever used it for the now-org-level
  Integration lookup). New global `/leads` and `/approvals` pages
  (`lib/leads.ts`/`lib/pendingActions.ts` gained an optional `botId`
  filter param + a joined `botName`), a new shared
  `components/console/BotFilterSelect.tsx` (the single-filter case of
  `ConversationFilters.tsx`'s URL-param pattern), `AppSidebar.tsx`'s
  `BOT_NAV_ITEMS` trimmed to the 4 genuinely per-bot pages
  (Editor/Data sources/Actions/Widgets).
  **Real bug caught only by e2e, not reasoned about in advance**:
  `demo-data.spec.ts` broke — clicking "Actions" (still bot-scoped)
  after visiting "Leads" (now global) timed out, because navigating to
  a global page drops the bot sub-nav entirely (no active bot in the
  URL anymore) — a genuine, correct consequence of the design, not a
  bug in it. Fixed by reordering the test to visit bot-scoped pages
  before global ones, the real constraint a demo walkthrough (or any
  user) would actually hit.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails
  (10/10, including `docs/business-logic.md` trimmed back under the
  500-line cap); a production build (`/leads`, `/approvals`,
  `/integrations` routes confirmed top-level, not nested); `node
  scripts/verify-rls.mjs` run for real against the live Postgres (all 3
  tenant-isolation assertions passing, confirms the schema migration
  didn't break RLS); full unit suite (236, 1 new test); the full
  `tests/e2e/` suite (120/120, including new bot-filter tests for both
  Leads and Approvals); `accessibility.spec.ts` (15/15, 0 violations);
  the full `tests/visual/` suite (14 of 19 baselines regenerated — every
  screen's sidebar nav-item count changed — stable across two runs);
  real screenshots of Leads/Approvals/Integrations confirming the new
  layout, the "Bot" columns, and the bot filter.

