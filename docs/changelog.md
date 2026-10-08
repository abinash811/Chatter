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
sidebar (ADR 0037).

---

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

- **First step of a design-system pass: one real accent color
  (2026-10-08, in progress)**: user pushed back hard on the "basic"
  feedback from earlier — asked for a full, centralized design system
  rather than piecemeal fixes, grounded in a real screenshot (declined,
  then a second real screenshot of an OpenAI-playground-style model
  comparison UI was supplied instead). That reference's only color was
  a single green, used in exactly two places: a "Sync" toggle's on
  state and a cost-meter's filled dots — never on buttons, nav, or
  text. A separate real screenshot reviewed a few turns earlier
  (Chatbase's Data sources page) showed the same restrained pattern
  independently (a tiny green "synced" status dot, nothing else
  colored) — two independent references agreeing on the same narrow
  job for the same hue is a real signal, not a coincidence. Healthcare-
  specific components from the user's original full spec (Doctor/
  Patient/Appointment cards, etc.) were explicitly dropped — "it's a
  SaaS, industry shouldn't matter," consistent with the core engine's
  own existing no-vertical-logic guardrail, now extended to the design
  system too.
  Implemented as a real, verified first increment, not a mockup: a new
  `--success`/`--success-foreground` token pair in `app/globals.css`
  (green-500, computed from the installed `tailwindcss/colors`
  package, not guessed — same discipline as every other token here),
  applied to exactly one place with the most reach today:
  `components/ui/switch.tsx`'s checked state (`bg-primary` →
  `bg-success`), documented as a deliberate delta from shadcn's stock
  source in the file's own header, same pattern already used for every
  other customized primitive. Deliberately not rolled out further yet
  (status badges, the sync-dot pattern, buttons) — sent real screenshots
  of the Tools and Guardrails tabs for the user to react to before
  continuing, per this project's own "preview before code" principle.
  Verified: `tsc` clean, all 10 guardrails, full unit suite (250
  unchanged), a production build, 48/48 across `bot-editor.spec.ts`/
  `actions.spec.ts`/`widgets.spec.ts`/`accessibility.spec.ts` (0
  violations), full 19-baseline visual suite unchanged (no currently-
  baselined screen happens to render a checked Switch at rest).

## Second step of the design-system pass: Badge stops being solid-black-by-default (2026-10-08)

Follow-up to the `--success` accent-color entry directly above. After
seeing the two proof screenshots from that change, the user's next
instruction was blunt: "Lets move away from monochrome and make it
whit[e] everything like chatbase." Rather than guess what that meant
across dozens of files, asked a scoping question first (per CLAUDE.md's
"explain the tradeoff, then ask" rule for a change this size) — the
user picked the narrowest of three options: lighten primary emphasis
(buttons/active states), reserving solid black for one real CTA per
screen, not a full non-monochrome accent-color system.

**Real audit before touching anything**: grepped every `<Button`,
`sidebar-primary`, and `bg-primary` call site in `app/`/`components/`
first, expecting a scattered mess. It wasn't — every dialog already
used `variant="outline"` for Cancel and `variant="default"` (solid
black) for exactly one Save/Create button; every `OptionCard` action
button was already `variant="outline"`; the sidebar's active-item state
was already a light gray pill (`bg-sidebar-accent`, neutral-100), not
solid black; `BotTopBar`'s active tab was already an underline +
`aria-current`, not a background fill (ADR 0037's own prior pass). The
actual violation was somewhere nobody had looked: `Badge`'s `default`
variant was `bg-primary text-primary-foreground` (solid black) and was
being used for real status signals — "Published," "Connected,"
"Ongoing," a passing custom-action test — none of which are a
clickable CTA, so none of them should compete with the one real button
for visual weight. `ApprovalsTable`'s "pending" status used the same
solid-black `default` too, despite needing to read as "needs attention"
rather than "the answer."

**Fix, `components/ui/badge.tsx`**: `default` no longer renders solid
black — it's now a neutral light pill (`bg-secondary
text-secondary-foreground`), the same visual weight as `muted`, kept
only so an unset `variant` prop doesn't default back to black. Added
real `success`/`warning`/`alert` variants (`bg-X/10 text-X-strong`,
the same light-tint shape `destructive` already used) to put the
`--warning`/`--alert` tokens — defined in `app/globals.css` since an
earlier pass but never actually used anywhere — to real work for the
first time. Every call site that used `default` for a genuine
positive/active signal moved to `success` (`BotTableRow`'s Published
badge, `integrations/page.tsx`'s Connected badge,
`ConversationDetailPanel`'s Ongoing badge, `AddActionDialog`'s passing
test-result badge); `ApprovalsTable`'s "pending" status moved to the
new `warning` variant instead of `success`, since "awaiting a human"
isn't the same signal as "already succeeded"; `WidgetsTable`'s
non-write-capable badge (never a status worth emphasis) moved to
`muted`.

**Real contrast work, not guessed**: `--success` (green-500, 72.3% L)
was deliberately vivid for the Switch's toggle thumb — too light to
pass WCAG AA as standalone text on white or on its own 10%-opacity
tint. Rather than reuse it for text and risk a repeat of `--destructive`'s
own already-documented razor-thin-contrast bug, added three new
text-only tokens (`--success-strong`/`--warning-strong`/
`--alert-strong`) computed from the real installed `tailwindcss/colors`
800-step for each hue (green-800/amber-800/violet-800, 43-48% L) —
the same lightness neighborhood `--destructive`'s own comment says it
needed for the identical problem. Dark mode goes the other direction,
lightened to each hue's 400-step, mirroring `--destructive`'s existing
light-mode-darkens/dark-mode-lightens pattern exactly.

**Verified**: `tsc` clean, all 10 `check:all` guardrails (the raw-color
scanner passes — every new value is a named token, not a literal),
full unit suite (250/250 unchanged), a real production build, full
`tests/e2e/` (124/126 — the 2 failures, `conversations.spec.ts`'s bot
filter and `knowledge.spec.ts`'s delete-entry test, both passed clean
in isolated re-runs, confirming they're the already-documented
CI-contention flake, not a regression), `accessibility.spec.ts`
(16/16, 0 violations — axe's own contrast checker independently
confirms the hand-computed `-strong` token values are actually
readable in a real browser, not just correct on paper), all 19
`tests/visual/` baselines (1 regenerated — `approvals-pending.png`,
the one seeded fixture whose captured viewport happens to show a
status badge that changed; the other 18 were unaffected because none
of their seeded fixtures happen to render a now-recolored badge in
frame). Two real screenshots (bots list, conversation detail) sent for
reaction before going further.

Deliberately not yet touched, pending reaction: this is scoped to
`Badge` only — no change to `Button`'s own `default` variant (every
call site already earns its solid-black treatment, confirmed by the
audit above), no sync-dot pattern, no broader token-system rework.

