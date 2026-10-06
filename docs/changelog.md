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
avatar distinction (app-wide consistency items #2 and #3 of 3).

---

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

- **Ready-made Custom Action templates (2026-10-04)**: discussed as a
  pricing/go-to-market question first — user asked whether a flat
  platform-fee + BYOA-LLM + knowledge-base-usage-tier model made sense,
  and specifically whether businesses with their own systems (EMRs,
  booking tools) could integrate via the existing Custom Actions webhook
  architecture rather than ingesting everything into Chatter's own
  knowledge base (answer: yes, that's exactly what ADR 0022 already
  supports). The follow-up, concrete ask: make Custom Actions easier to
  set up for the appointment-cancel/-reschedule case specifically,
  without inventing a new vendor integration (there's no single
  "Shopify of scheduling" — healthcare alone spans Epic/Cerner/
  athenahealth plus generic tools like Calendly/Acuity). Chose "option
  1" of 3 explained to the user (pre-built Custom Action templates vs.
  named scheduling-vendor integrations vs. a new first-class Appointment
  tool type) — zero new tool-registry/schema surface, stays fully
  vertical-agnostic (works for salons/auto shops too, not just
  healthcare), ships same-day. New `ACTION_TEMPLATES` array
  (`lib/customActionOptions.ts`) — "Cancel appointment" (POST,
  `appointment_id`/`reason`) and "Reschedule appointment" (POST,
  `appointment_id`/`new_time`/`reason`), both ≤4 fields
  (`actions.ts`'s `MAX_FIELDS`). `AddActionDialog.tsx` gained a
  template picker (`OptionCard` list, "Start from scratch" plus the 2
  templates) above the existing create form; picking one remounts the
  form (`key={templateKey}`) with fresh `defaultValue`s for
  name/description/method/fields — the business still fills in their
  own `url`, there's no backend being integrated against.
  **Real bug caught by an actual screenshot, not assumed**: the first
  pass used a 3-column `grid` of `OptionCard`s, but the dialog is only
  `sm:max-w-lg` (512px) — titles wrapped, the "Selected" button
  overflowed its own card border, descriptions were cut to fragments.
  Fixed by stacking the cards in a single column instead (`OptionCard`'s
  `trailing` prop for the button, not `action`) — confirmed clean via a
  second real screenshot. Verified: `tsc` clean, all 10 `check:all`
  guardrails, a production build, full unit suite (240, 4 new — a
  `customActionOptions.test.ts` guarding each template's field count and
  slug shape), the full `actions.spec.ts` (10/10, 2 new tests: picking a
  template pre-fills the form and switching back to scratch clears it;
  saving from a template produces a working action),
  `accessibility.spec.ts` (16/16, 1 new test scanning the open dialog
  with the template picker). No ADR — additive UI on an already-decided
  architecture (ADR 0022), no schema or data-model change.

- **Third Custom Action template: "Check appointment availability"
  (2026-10-05)**: user asked for a matching template for the read-only
  case that naturally precedes cancel/reschedule in a real booking flow.
  Added to `ACTION_TEMPLATES` ahead of the other two (GET,
  `date`/`service` fields, `CalendarSearch` icon). Switched each
  template's picker button from a plain "Use" label to a template-
  specific `aria-label` (`Use the ${label} template`/`${label}
  (selected)`) — the earlier `actions.spec.ts` tests located buttons by
  position (`.first()`/`.last()`), which broke the moment a 3rd template
  changed the DOM order; stable accessible names fix this test fragility
  permanently as more templates get added, not just for this one.
  Verified: `tsc` clean, all 10 guardrails, full unit suite (240
  unchanged — `customActionOptions.test.ts` already asserted generically
  over every template, no edit needed), a production build, 27/27 across
  `actions.spec.ts` (3 template tests now, incl. a new one confirming
  the availability template saves as a GET action) and
  `accessibility.spec.ts` run together, a real screenshot confirming the
  4-item picker (3 templates + "Start from scratch") still reads cleanly
  in the dialog's single-column layout.

- **Full-app design audit (2026-10-05)**: user-requested complete sweep
  across text/colors/layout structure/spacing/shadows/interactions/
  animations/consistency — not a touch-triggered per-screen check, the
  whole console. Built the app, seeded a real demo bot, and screenshotted
  all 16 screens plus dialog/tab/hover states against
  `docs/design/principles.md`/`component-checklist.md`/
  `design-system.md`'s documented bar. Two real findings, both fixed:
  (1) **Onboarding register break** — `OnboardingForm.tsx` rendered its
  own `bg-background` + bare `Card` page, dropping all branding right
  after signup's rich two-panel `AuthShell` (dark hero, value props,
  trust checklist); fixed by wrapping onboarding in `AuthShell` too
  (same pattern `SignupForm.tsx`/`LoginForm.tsx` already use — the form
  component now renders just its fields, no outer page wrapper), so the
  whole signup→onboarding→console flow reads as one continuous visual
  language instead of switching registers mid-flow. (2) **Suggested-
  replies duplicate placeholder** — `AppearanceTabContent.tsx`'s row
  placeholder ternary only special-cased row 0 ("What are your hours?"),
  so rows 2 and 3 both showed the identical "e.g. Track my order"
  example; fixed with a 3-entry `SUGGESTED_REPLY_PLACEHOLDERS` array,
  one real example per row. Everything else held up on review: table
  headers/badges/elevation/motion all consistent app-wide, no raw
  colors anywhere, the Appearance tab's real-hue color swatch confirmed
  correct (it's the *widget's* configurable brand color — visitor-facing
  data, not console UI chrome — not a monochrome-system violation).
  `docs/design/audit.md` gained a new System-coverage row for this pass
  and a first-ever Onboarding row in the Depth/polish table (it had
  never been tracked there). Verified: `tsc` clean, all 10 guardrails,
  full unit suite (240 unchanged), full `tests/e2e/` suite,
  `accessibility.spec.ts` (all screens including the new onboarding-
  inside-AuthShell render), `onboarding.png`/`bot-editor-appearance.png`
  visual baselines regenerated + stable across two runs, rest of the
  19-baseline visual suite unchanged.

- **`request_refund` — a sixth action tool (2026-10-05)**: discussed as
  part of a broader "what's next" roadmap conversation first — of the
  candidates, this and image input were the two flagged as genuinely
  buildable without a product decision first; user picked this one to
  build. `docs/roadmap.md`'s "More write-capable action tools" named "a
  real Shopify refund call" as exactly this kind of built-in,
  purpose-specific write tool (distinct from a business wiring its own
  webhook via Custom Actions, ADR 0022). Reuses `request_order_
  cancellation`'s exact pattern (ADR 0023) with zero engine changes —
  `handle()` validates the order (found, not already refunded) and
  queues a `PendingAction`; the separately-exported `executeRefund`
  (`lib/ai/tools/requestRefund.ts`) is what actually calls Shopify's
  `refundCreate` GraphQL mutation once a human approves from
  `/approvals`. Wiring touched 4 small, generic extension points, not
  new engine surface: `lib/ai/tools/index.ts` (side-effect import),
  `app/(console)/approvals/actions.ts`'s `EXECUTORS` map (one line),
  `ApprovalsTable.tsx`'s `describeRequest` (one case), and
  `BotEditorForm.tsx`'s `TOOL_ICONS` map (cosmetic only — an unmapped
  tool already rendered fine via the `Wrench` fallback, confirmed by
  checking how `request_order_cancellation` itself had been rendering
  since ADR 0023, with no icon mapped, until this pass). `shopify.dev`
  stayed blocked by this environment's network egress policy for the
  `refundCreate` mutation shape — re-confirmed via repeated direct
  `WebFetch` attempts against shopify.dev and several mirror/community-
  forum domains (withone.ai, cleverence.com, peerdh.com, community.
  shopify.com), all blocked — pieced together from WebSearch result
  summaries instead, same documented caveat as `orderCancel` (ADR
  0023): unverified against a live store. The refund transaction needs
  a parent to refund through (the original payment method), so
  `executeRefund` fetches the order's transactions via the REST
  endpoint first and refunds through the first successful sale/capture
  transaction found — fails cleanly with a real reason if none exists.
  Verified: `tsc` clean, all 10 guardrails, a production build, full
  unit suite (250, 10 new — mirrors `cancelOrder.test.ts`'s structure:
  handoff/not-found/already-refunded/queues-pending-approval for
  `handle()`, no-integration/order-not-found/no-payment-transaction/
  succeeds/surfaces-userErrors for `executeRefund`), full `tests/e2e/`
  for `approvals.spec.ts` + `bot-editor.spec.ts` (19/19, 2 new tests: a
  seeded refund request shows its own description and the real
  "no Shopify store connected" failure outcome on approval; the tool
  appears on the Tools tab), `accessibility.spec.ts` (16/16), the full
  visual suite (19/19, no baseline changes — no visual regression on
  the Tools-tab grid or approvals table), a real screenshot of the
  Tools tab confirming the 5-card grid still reads cleanly with the new
  `Undo2`-icon card added.

- **`withOrgContext`'s transaction timeout was too tight for a remote
  database (2026-10-06)**: found while walking the user through running
  the app locally against a real Supabase (Postgres) instance for the
  first time — onboarding failed every time with Prisma's own `Unable
  to start a transaction in the given time`, not a one-off flake.
  Root cause: `lib/db.ts`'s `withOrgContext` calls `prisma.$transaction`
  with no explicit options, so it used Prisma's defaults (`maxWait`
  2s, `timeout` 5s) — fine for a database on the same machine or
  network (this session's own dev container, CI), too tight for any
  pooled/managed Postgres reached over the public internet, which is
  the normal shape for a real deploy (`docs/open-questions.md` #8 is
  still open on exactly where the app itself runs, but the database
  side, AWS RDS, ADR 0021, is already decided and is exactly this
  shape). Fixed by passing explicit, more generous options (`maxWait:
  10_000, timeout: 20_000`) — real headroom, not a magic-number
  workaround for one user's network. Verified: `tsc` clean, all 10
  guardrails, full unit suite (250 unchanged, no test covers `lib/
  db.ts` directly). Not yet confirmed end-to-end against the user's
  live remote Supabase instance that surfaced this — they're retrying
  with this fix now.

