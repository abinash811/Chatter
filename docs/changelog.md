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
Action templates.

---

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

## Design-drift automation: 3 new guardrails close the real recurring gap (2026-10-08)

User question, prompted directly by the Badge-variant fix above:
"Where are our designs might get drifted away. And need my inputs which
all should be automated. I am asking misses." Answered with a scoped
audit (not a build) first — categorized every known drift risk into
"already mechanically enforced," "automatable, not yet built," and
"stays judgment." The grounding finding: every real design bug in this
project's history (`docs/design/audit.md`'s "System coverage" table —
Badge `default`→`bg-accent` 2026-09-27, `--muted`/`--accent` collision
2026-09-28, the `--accent`-on-white ghost-button miss 2026-10-02, Badge
`default`→`bg-primary` still wrong today's fix) is the *same* failure
mode: a token or component gets reused for a meaning it wasn't built
for, and nothing catches it until a screenshot is taken by hand.
`check-design-tokens.mjs` was only ever built to catch the *literal*
version of that (a raw hex/arbitrary-Tailwind-color), never the subtler
"syntactically valid token, wrong job" version — which is what's
actually recurred. User picked the top 3 proposed automations to build.

**1. `scripts/check-token-variant-mapping.mjs`** (+ `scripts/token-
variant-manifest.json`): a human-verified manifest recording each cva
variant's exact color-bearing token classes; fails if a variant's
actual className in code no longer matches, or if a variant exists with
no manifest entry. Scoped to `Badge` only for this pass (the component
that's actually drifted, twice) — deliberately not a speculative
universal parser for all 26 `components/ui/` primitives, extend the
manifest file-by-file as another component earns it. Verified it
actually catches the bug class it exists for: temporarily changed
`default`'s tokens back to `bg-primary` and confirmed a real FAIL with
an expected-vs-actual diff, not just a happy-path pass.

**2. `scripts/check-variant-visual-coverage.mjs`**, same manifest's new
`coveredBy` field: a real call-sited variant must list the `tests/
visual/` spec file(s) that actually render it; `coveredBy: null` is
only valid for a variant with zero real call sites (cross-verified
against the app code, not just trusted). **Found a real, live gap
immediately**: `success` (Badge's Published/Connected/Ongoing/test-pass
variant, shipped minutes earlier this same session) had real call
sites in 3 files and zero visual coverage — none of the 19 existing
baselines happened to publish a bot, connect Shopify, or open a
conversation's Details tab. Fixed before committing the check, not
left to fail on `main`: added a new visual test (`tests/visual/
console.visual.spec.ts`'s "bots list — a published bot shows the
success-colored badge") that publishes a real bot and screenshots the
resulting `Published` badge — the cheapest of the 3 real call sites to
reach in a test. Caught its own bug while adding it: `getByText
("Published")` is case-insensitive by default and matched the
sidebar's own per-run-unique email prefix ("visual-published-badge-
...@example.com" contains "published") — fixed by scoping the locator
to the table body with `exact: true`.
Real false-positive found and fixed while building the detection
heuristic itself: a naive "is this variant name a quoted string
anywhere in app code" grep flagged `default` and `alert` as having real
Badge call sites when they didn't — `default` matched `AddActionDialog
.tsx`'s own unrelated Button-variant ternaries, `alert` matched
`alert.tsx`'s `role="alert"`. Fixed by scoping to `app/` + `components/
console/` only (excluding `components/ui/`'s own primitive-layer prop
values) plus a tighter windowed-proximity-to-`<Badge`/`Record<...>`-
type heuristic, not a bare substring search.

**3. `scripts/check-token-contrast.mjs`** (+ `scripts/contrast-
pairs.json`, + the `culori` dependency, real version checked via `npm
view` per CLAUDE.md's own rule): computes real WCAG AA contrast for 15
documented text/background token pairs directly from `app/globals.css`'s
actual oklch values, in both light and dark mode — independent of
whether any page happens to render that pairing on a scanned screen,
closing the "dark mode never verified" gap (`docs/design/audit.md`'s
own 🟡 row) for contrast specifically. Alpha-tinted pairs (a Badge's
`bg-X/10`) are composited over their real backdrop using the same
gamma-space blend a browser performs, verified against culori's real
API directly (not assumed) before trusting it. **Found a real, live
bug on first run**: the pair modeled after `--primary-foreground`/
`--secondary-foreground`'s own shape — `--destructive-foreground` on
`--destructive` — failed dark mode at 2.63:1. Investigated before
"fixing" it: a grep confirmed `--destructive-foreground` has zero real
`text-destructive-foreground` call sites anywhere in the app — Button's
real destructive variant (verified shadcn stock source) hardcodes
`text-white` instead, never reads that token. Removed the pair rather
than chasing a fix for a pairing nothing actually renders (same "only
test what's real" discipline check 2 applies to `coveredBy: null`) —
`--destructive-foreground` itself is left as a known-dead, still-
contrast-wrong token, flagged in the script's own header comment for a
future pass rather than silently dropped. Verified the check for real
in both directions: ran it clean against the current tokens (15/15
pass in both themes), then deliberately lightened `--success-strong`
in a throwaway edit and confirmed a real FAIL with the actual computed
ratio (1.20:1), reverted.

All 3 wired into `check:all` (now 13 guardrails) and `.githooks/
pre-commit`'s existing `npm run check:all` step — no new CI wiring
needed, it already runs `check:all`. Verified: `tsc` clean, all 13
guardrails pass, full unit suite (250/250 unchanged), a production
build, full `tests/visual/` (20/20 — 19 unchanged + the new
`bots-table-published.png` baseline), full `tests/e2e/` (125/126 — the
one failure, `knowledge.spec.ts`'s delete-entry test, confirmed the
same pre-existing CI-contention flake documented elsewhere in this file
via a clean isolated re-run), `accessibility.spec.ts` (16/16).

