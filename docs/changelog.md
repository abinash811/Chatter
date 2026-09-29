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
bot top bar's shared-across-pages rework.

---

- **Skeleton loading states + a real, previously-invisible text/ring bug
  found and fixed across the whole console — 2026-09-26, user directive
  ("flag when we're not building high-class international standard
  products").** `Skeleton` (pulled in ADR 0017, zero real usage until
  now) wired into 7 new `loading.tsx` files — Next.js App Router's
  automatic per-segment Suspense boundary — for `/bots`, `/bots/
  [botId]` (editor), its `knowledge` and `integrations` sub-routes,
  `/conversations`, `/conversations/[conversationId]`, and `/settings`.
  Each skeleton matches its real page's actual shape (row counts,
  column widths, Card sections) rather than a generic spinner. The
  bot-scoped ones deliberately skip the shared `BotTopBar` (already
  rendered by the parent layout around the Suspense boundary — including
  it would have shown two top bars briefly). Confirmed genuinely
  rendering, not just wired: CDP network-latency emulation
  (`Network.emulateNetworkConditions`) plus a polling loop, since local
  Postgres is normally too fast to ever show a loading state — a
  screenshot alone can't prove a race condition like this.

  Caught and fixed a real, previously-invisible bug across 6 files while
  doing this pass, not related to loading states at all: `text-accent`
  (no `bg-accent` pairing) and `ring-accent`/`accent-accent` were used
  as a standalone brand text/ring/checked-fill color in `AuthShell.tsx`
  (the "SIGN IN"/"SIGN UP" eyebrow), `LoginForm.tsx`/`SignupForm.tsx`
  (the "Sign up"/"Log in" links), `BotsTable.tsx` (avatar initials), and
  `Input`/`Textarea`/`Checkbox` (focus rings + checked fill) — but ADR
  0014's token swap redefined `--accent` as a pale neutral-100
  *background* tint (paired with `--accent-foreground` for text on top
  of it), not a text/ring color. Every one of those was rendering as
  near-invisible pale text/rings on a white background, invisible to
  `tsc`/the build the same way every other Tailwind-token regression in
  this project's history has been — only caught by actually looking at
  real screenshots and `getComputedStyle` output, not by reading the
  code. Fixed to `text-foreground`/`ring-ring`/`accent-primary` (the
  correct real shadcn tokens, matching `Button`'s own
  `focus-visible:ring-ring/50`); the two auth links also gained
  `font-medium underline` since a monochrome palette has no separate
  link color to rely on for differentiation from body text.

  `AuthShell.tsx`'s right-side card also got the same depth/polish pass
  as the bot editor and bots list (`bg-soft-background` + `shadow-xs`,
  was a flat bordered box) — closes the login/signup item from the
  polish-pass known gap below.

  **Process change, not just a one-off fix**: `.claude/skills/ship-
  checklist/SKILL.md` now has a standing item (an explicit design-bar
  self-check — real hover/focus/active/loading states, named out loud
  against principles.md #5/#9 — before calling any UI change done) per
  the user's explicit instruction to flag this going forward rather than
  wait to be asked.

  Verified: guardrails, `tsc`, a clean rebuild, all 99 unit tests. Full
  `tests/e2e`/`tests/visual` suites intentionally not run this pass per
  explicit user request (mid-session) — flagged here rather than
  silently claimed as verified; both should be run and any resulting
  baseline updates committed before this is called fully shipped.
- **`docs/design/audit.md` created — a living per-screen design-bar
  scoreboard, docs-only.** User's explicit question: is design-audit
  work like the bots-list review actually getting documented, and how
  do we not miss this in future? Answer was honest, not reassuring:
  every code *change* was already landing in this file's Done/Known-
  gaps section, but a spoken-in-chat audit (hover/focus/loading-state
  findings, functionality gaps like missing search) had nowhere
  persistent to live — it would have been lost to context compaction.
  `docs/design/audit.md` is the fix: one row per console screen
  tracking hover/focus/active/loading/depth status against principles
  #5/#9, plus a running list of open functionality gaps per screen.
  `.claude/skills/ship-checklist/SKILL.md`'s design-bar self-check item
  now explicitly points here — an audit finding gets logged in the same
  turn it's found, not "in the next commit." First real content: the
  bots-list audit from this session (badges indistinguishable, avatar
  chips visually identical, empty state has no CTA, no search/sort/row-
  actions/delete) logged as the file's first "open findings" entry
  rather than left in scrollback. `docs/design/audit.md` added to this
  file's "Where things live" list.

- **Write-capable action tools: order cancellation, gated on human
  approval — 2026-09-28, ADR 0023.** Follows directly from a real
  product conversation, not a silent pick: asked what to build next,
  the user chose "write-capable action tools" from a list of options;
  per CLAUDE.md's standing rule ("when a new technical pattern needs a
  real choice, explain it before asking"), the real risk (a write tool
  is irreversible and a visitor could manipulate the bot into
  triggering it) and two real-world patterns (fully automatic execution
  vs. bot-proposes/human-approves) were explained before asking which;
  the user picked human approval ("Okay let's have 2").

  `request_order_cancellation` (`lib/ai/tools/cancelOrder.ts`) never
  calls Shopify itself. `handle()` validates the order via the same
  Shopify REST lookup `check_order_status` already uses (duplicated
  intentionally, not refactored into a shared helper, to avoid touching
  tested working code), returns `handoff_required`/`not_found`/
  `already_cancelled` directly for those cases, and otherwise queues a
  `PendingAction` and tells the visitor a human will review it — never
  that it's done. A new generic queue, `lib/pendingActions.ts`,
  deliberately has zero knowledge of any specific tool (`PendingAction`
  model, migration `20260928100000_add_pending_actions`, RLS policy
  `db/migrations/0006_pending_actions_rls.sql` — real cross-org psql
  test run: org A sees its own row, org B sees 0, no context sees 0).
  Keeping it generic avoids a circular import: if it imported
  `executeOrderCancellation` to build a toolName→executor map, and
  `cancelOrder.ts`'s own `handle()` already imports `createPendingAction`
  from it, that's a cycle. Resolved by putting the executor-dispatch map
  in the console layer instead
  (`app/(console)/bots/[botId]/approvals/actions.ts`'s `EXECUTORS`) —
  the next write-capable tool adds one line there, not a change to the
  generic queue.

  New `/bots/[botId]/approvals` console page (added to `BotTopBar`'s nav
  between Actions and Integrations) lists queued requests; approving
  needs its own confirm dialog (`AlertDialog`, "This calls Shopify for
  real and can't be undone") since it's the one moment a real external
  write happens — matching the existing bot-publish confirm pattern;
  rejecting needs none, since nothing external happens. Approving calls
  the tool's separately-exported `executeOrderCancellation`, the real
  `orderCancel` GraphQL mutation — REST is deprecated for new Shopify
  work since October 2024, so GraphQL was used from the start rather
  than matching `check_order_status`'s older REST call. Requires the
  `write_orders` OAuth scope, widened on `lib/integrations/shopify.ts`'s
  `SCOPES` constant — a real, documented consequence: a store connected
  before this change is still running on the old, narrower grant and
  must redo OAuth before cancellation will work for them; there's no way
  to silently upgrade an existing token's scope.

  `shopify.dev` stayed blocked for `WebFetch` in this environment (same
  `EGRESS_BLOCKED` pattern hit earlier for `chatbase.co`) — the
  `orderCancel` mutation shape, `OrderCancelReason` enum, and
  `OrderCancelRefundMethodInput` fields were pieced together via
  WebSearch instead of the primary source, and ADR 0023 says so plainly:
  unverified against a live Shopify store, matching the project's
  "check current practice, don't recall it" rule about being honest when
  that check couldn't actually happen.

  A real, not hypothetical, test-assertion bug caught while writing
  `tests/unit/lib/ai/tools/cancelOrder.test.ts`: an assertion checking
  the pending-approval message never contains the word "cancelled" at
  all failed — correctly, since the real message legitimately says
  "...before the order is actually cancelled" (future tense). Fixed by
  asserting the message matches `/review/i` and does *not* match
  `/has been cancelled|is cancelled|order cancelled/i` — the real
  intent (never claim the action is done), not a blanket word-ban.

  Verified end-to-end with real screenshots against the running app (no
  live Shopify store is connectable in this environment, so a
  `PendingAction` was seeded directly via `withOrgContext`, same bypass
  precedent as every other Claude/Voyage/Shopify-dependent feature this
  project has seeded around): the empty state, a queued request with its
  full description, the approve confirm dialog's wording, and the
  resolved row correctly showing a real "failed" outcome with "No
  Shopify store connected for this bot." — never a false "cancelled"
  success. Also verified: `tsc` clean (no existing tool implementation
  needed changes when `Tool.handle`'s signature grew an optional 4th
  `conversationId` parameter — TypeScript's structural typing for
  optional parameters made this backward-compatible, confirmed rather
  than assumed), all 9 `check:all` guardrails, 166 unit tests (14 new:
  9 for `cancelOrder.ts`, 5 for `pendingActions.ts`), a clean production
  build, 6 new `tests/e2e/` specs (`approvals.spec.ts` + a new a11y
  scan) all green, and all 20 `tests/visual/` baselines regenerated
  (the new "Approvals" nav item shifted `BotTopBar`'s layout, so every
  bot-scoped-page baseline needed regenerating, same as every previous
  nav-item addition this session) and confirmed stable across two runs.

**Known gaps:**
- 🟡 `scripts/canary.mjs` can't run in this container as-is — the
  pre-installed Playwright browser only has
  `chromium_headless_shell-1194`, but the `playwright` npm package
  (installed fresh this session, no `node_modules` existed before)
  expects `-1243`. `tests/e2e/`/`tests/visual/` both work around this
  already (`playwright.config.ts`/`playwright.visual.config.ts` pass
  `executablePath: /opt/pw-browsers/chromium`, the full browser, not the
  headless-shell variant), so real browser coverage isn't blocked — only
  the standalone canary script's default `chromium.launch()` is. Fix is
  either the same `executablePath` override added to `canary.mjs`, or
  re-running `npx playwright install` to fetch the matching shell —
  neither done yet, flagged rather than silently skipped next time this
  comes up.
- 🔲 Design system tokens/infra and a real 18-component primitive layer
  are done — **all 18 now on shadcn's real official source, ADR 0017**
  (superseding the ADR 0008/CARE-pull mechanism entirely; see the Done
  bullet below). Bots list (real `Table`) and the bot editor (persistent
  top bar + `Tabs` + `Dialog`, principles.md #10) are rebuilt on these
  primitives, not just recolored. The integrations page now shares the
  same persistent `BotTopBar` (bot switcher + Editor/Knowledge/
  Integrations nav, 2026-09-26) as the editor and knowledge pages — the
  top-level shell gap is closed. Its own content (a plain provider list)
  hasn't had a dedicated depth/polish pass (principles.md #5/#9 — Card
  wrapping, etc.) the way the bot editor has; that's the part still
  open.
- 🟡 The depth/polish pass (principles.md #5/#9 — real Card boundaries,
  centered layout, hover/shadow/focus/active states, considered loading
  states) is done on the bot editor, the bots list, and login/signup
  (see the Done bullet above). Still open: the integrations page's own
  content (still a plain provider-row list, though it now shares the
  polished `BotTopBar`), the settings page, the knowledge page, the
  conversations list/detail, and the sidebar itself (structurally solid
  per the 2026-09-26 rebuild, but never got a dedicated shadow/hover
  polish pass the way the bot editor did). Apply the same recipe
  (Card-wrap floating content, real hover/focus/active states checked
  via `getComputedStyle`, a `loading.tsx` skeleton matching the real
  layout) when each is next touched — and check `text-accent`/
  `ring-accent`/`accent-accent` don't reappear; the real tokens are
  `text-foreground`/`ring-ring`/`accent-primary`. A sidebar user/org
  identity footer (avatar + name) already exists (added with the
  sidebar rebuild) — no longer a gap.
- The console sidebar nav shell is done: `app/(console)/layout.tsx` +
  `components/console/AppSidebar.tsx` now use the real CARE `Sidebar`
  (icon-collapsible, cookie-persisted state, active-route highlighting,
  a `logoutAction` server action wired to the footer) — replacing the
  hand-rolled `<nav>`. **Tailwind upgraded to v4.3.3 (ADR 0009)** to
  build it: the pulled `Sidebar`'s CARE-authored v4 syntax
  (`w-(--sidebar-width)`) silently compiled to nothing under our old
  v3.4.19, breaking layout invisibly to `tsc`/the build — only caught
  by an actual screenshot. Migrated via the official codemod
  (`@tailwindcss/upgrade`), not a hand patch — `tailwind.config.ts` is
  gone, every token now lives in `app/globals.css`'s `@theme` block.
  Verified: full guardrail suite, a real headless-browser check that
  the sidebar's width/offset math is now correct with zero console
  errors, and all 11 `tests/e2e/` specs passing unchanged. All 15
  interactive pulled primitives also got `"use client"` added — CARE's
  source has no such concept (Vite SPA), Next.js App Router requires
  it; this was already true before the v4 upgrade, just never listed
  here explicitly until now.
- Dependency sweep after ADR 0009 (the actual gap was triage, not
  detection — see the ADR): 5 more open Dependabot PRs found and
  triaged, not just Tailwind's. Merged (verified: `tsc`, guardrails,
  build, a real headless-browser check, all 11 E2E specs): `actions/
  checkout`/`actions/setup-node` v4→v7 (`.github/workflows/ci.yml`),
  `@types/node` 22→26, `tailwind-merge` 2→3 (v3 is what CARE itself
  pins post-Tailwind-v4 — checked, not assumed), `lucide-react` 0→1
  (checked the real breaking-changes list — brand-icon removal and
  `*Circle` renames — against every icon we actually import; none
  affected). **Deliberately left open, not silently bundled in**:
  Next.js 15→16, Prisma 5→7 (×2, client+CLI), TypeScript 5→7 — each a
  real framework major needing its own dedicated migration effort, not
  a same-pass triage item. `.claude/skills/ship-checklist/SKILL.md` now
  has this as a standing item (any dependency, not just this one case)
  so it isn't only a one-time catch-up.
- `/bots` rebuilt on the real CARE `Table` (`components/console/
  BotsTable.tsx`, ADR 0008) — column headers (Name/Status/Created),
  whole-row click-to-navigate (a small client component just for the
  router handler; the page itself stays server-rendered), same data
  passed as plain serializable fields (not full Prisma records — the
  lesson from the bot-editor's earlier server/client serialization
  bug). `docs/design/preview/bots-list.html` updated to match the real
  headed-table look, not the old borderless div-list. Verified: full
  guardrail suite, `tsc`, build, a real headless-browser check
  (create → table shows it → row click navigates), and 2 new
  `tests/e2e/bots-list.spec.ts` specs (13 total now) — not just a
  throwaway script.
- A real unit-test layer now exists — `tests/unit/` (Vitest,
  `vitest.config.mts`), closing the biggest gap from the 2026-09-25
  "critique the automated setup" discussion: `lib/ai/` (the chat loop,
  model gateway, tool registry, system prompt assembly) had zero
  automated coverage of any kind before this, since E2E never exercises
  a real Claude call. 38 specs across 7 files: `lib/ai/chat.ts`'s
  `sendMessage` (no-tool replies, the tool-use loop, parallel tool
  calls + traceability logging, the `MAX_TOOL_ITERATIONS` fallback, the
  conversation-ownership check), `lib/ai/gateway.ts`'s exact Anthropic
  SDK request/response mapping (found and fixed a real testability bug
  in the process — it lazily `require()`'d the SDK inside the
  constructor, which bypassed Vitest's mocking and hit the real SDK;
  switched to a static import, which needed no behavior change since
  only *instantiating* `Anthropic` touches `ANTHROPIC_API_KEY`, not
  importing the class), `lib/ai/systemPrompt.ts`, the tool registry,
  `lib/schemas/auth.ts`, `lib/rateLimit.ts`, `lib/utils.ts`. Every
  external dependency (the SDK, Prisma via `withOrgContext`) mocked at
  the module boundary — this tests the engine's own logic, not a real
  network/DB call, which stays `tests/e2e/`'s + CI's job. Wired into
  the pre-commit hook and CI (`npm run test:unit`, before the slower
  DB/build/E2E steps — fails in seconds, not minutes, per ADR-0009-
  style "verify for real" discipline). `docs/research/current-
  practices.md` has the Vitest-over-Jest reasoning (checked via
  WebSearch, not recalled).
- Visual regression testing added — `tests/visual/` (Playwright's own
  `toHaveScreenshot()`, `playwright.visual.config.ts`), closing the
  "I eyeball a screenshot each time, nothing automated" gap from the
  same discussion. 6 baselines: login, signup, bots empty/with-a-bot
  (Created column masked — it's a relative timestamp), bot editor
  (embed snippet masked — it embeds a random public key), sidebar
  icon-collapsed. Actually verified the mechanism catches something,
  not just that it runs green: an initial `maxDiffPixelRatio: 0.02`
  silently let a real, deliberately-introduced color change on the
  login page's brand icon pass — a small element is a tiny fraction of
  a full-page screenshot's pixels. Removed the ratio cap, confirmed the
  same change now correctly fails both pages that use `AuthShell`
  (login+signup) and nothing else, then reverted the test change.
  Wired into CI, initially as `continue-on-error: true` — the baselines
  were generated in this project's sandboxed dev environment, not
  GitHub's own runner, and a screenshot baseline is only trustworthy
  against the exact environment that generated it. **Resolved**:
  checked run 36171075919 (commit c43adb0) at the step level, not just
  overall job status — `"Run visual regression suite"` itself concluded
  `success` on GitHub's real runner, confirming the sandbox-generated
  baselines do match. Flipped to blocking (`continue-on-error` removed)
  in the same pass.
- Guardrail-exemption visibility added (gap #5 from the "critique the
  automated setup" discussion — closes it; gap #4, verifying an actual
  deploy, is blocked on a real Render deployment existing, not yet
  actionable). `scripts/check-guardrail-exemptions.mjs`
  (`npm run check:exemptions`) reports every file currently trusted
  rather than mechanically enforced — a named allowlist entry in a
  handful of check-*.mjs scripts, or a verbatim CARE pull (ADR 0008).
  A report, not a gate — always exits 0, not wired into `check:all`.
  The `@type registry:` exemption logic itself was triplicated across
  `check-design-tokens.mjs`/`check-no-raw-buttons.mjs`/
  `check-file-length.mjs`; extracted to one shared helper
  (`scripts/lib/careExemption.mjs`) all four scripts (including the new
  report) now import, so enforcement and the report can't silently
  drift apart. Running the report immediately surfaced a real, small
  bug: `components/ui/button.tsx` was double-exempted (a named
  allowlist entry from before it was replaced with CARE's real version,
  plus the CARE-pull exemption it now also matches) — removed the
  now-redundant named entry. `ship-checklist` has this as a standing
  item, run when the exemption surface actually changes.
- 🟡 No real end-to-end verified Claude reply yet — blocked on a real
  `ANTHROPIC_API_KEY` (everything up to that boundary is confirmed
  correct, see README's "Verified by a real run").
- 🔲 Not yet built: password reset flow, site crawling for knowledge
  ingestion (manual Q&A/file/URL ingestion is done — see the Done
  bullet below; site crawling is `docs/open-questions.md` #4, still
  separate/undecided), teammate invites/multi-org switcher (org naming
  is done — a real onboarding flow now exists, see the Done bullet
  below), appearance/theming editor.
- 🟡 `lib/ai/` and other pure/mockable logic now has real unit tests
  (`tests/unit/`); React component rendering tests do not yet, though
  `@testing-library/react`/`jsdom` are installed and `vitest.config.mts`
  is already set up for `.tsx` specs — adding one is now a small,
  unblocked step, not a new framework decision.
- 🟡 4 open Dependabot major-version PRs deliberately deferred, not
  forgotten: Next.js 15→16 (#5), Prisma 5→7 client (#4) and CLI (#8),
  TypeScript 5→7 (#10). Each needs its own dedicated migration pass —
  Prisma's especially, given RLS/tenant-isolation sits directly on it.
  Check `list_pull_requests`/`search_pull_requests` (github MCP) for
  current state before assuming these are still exactly as described.
- Gap #4 from the "critique the automated setup" discussion —
  CI verifies a build, never an actual deploy — dropped by explicit
  user decision (2026-09-25: "ignore Render completely"), not just
  deferred. No deploy-verification automation to build until/unless
  this is revisited. `render.yaml`/ADR 0005 (deployment prep) stay in
  the repo as-is; this only affects whether CI gets a post-deploy check,
  not whether Render prep work is undone.
- Testing/guardrails toast-timeout flake, full history (2026-09-27/28):
  10 static guardrail checks (`npm run check:all`), 166 unit tests, 87+
  `tests/e2e/` specs, 20+ `tests/visual/` baselines, gitleaks + a CI
  coverage floor, all wired into CI. A few e2e specs around publishing/
  saving intermittently failed under sustained single-worker runs
  (confirmed 2026-09-27 locally: different tests fail each run, all
  pass instantly alone, a fresh server restart didn't help) — real
  resource contention, not a product bug. Confirmed 2026-09-28 to also
  reproduce in the real GitHub Actions runner: PR #11's CI failed 3
  times in a row (2 automatic + 1 explicit re-run), each time on a
  different `bot-editor.spec.ts` test, always the same shape — a "Draft
  saved."/"Published..." toast not appearing before Playwright's
  default (or an already-generous 20-30s) timeout. Hardened the "Draft
  saved." assertions to 20s (matching the existing publish-toast
  precedent) as a real, minimal fix — but the very next CI run missed
  the already-20s publish toast *and* the newly-hardened save toast
  simultaneously, confirming this isn't a per-assertion timing problem:
  CI's 2-vCPU runner genuinely stalls under Playwright's 2 parallel
  workers once the suite grew past ~85 specs. Fixed structurally
  instead: `playwright.config.ts` sets `retries: 1` under
  `process.env.CI` (a real, deterministic bug still fails identically
  on the retry, so this doesn't mask anything; local runs stay at 0
  retries). Reduces but doesn't eliminate the flake — still recurs
  intermittently on later PR #11 pushes throughout 2026-09-28, always
  the same `preview.spec.ts`/`bot-editor.spec.ts` toast-timeout shape,
  each time confirmed via job logs as this same known class, not a new
  issue. Don't keep inflating individual timeouts chasing this; run
  scoped test files during a session, not the full suite repeatedly.
- Knowledge depth/polish pass, full detail (2026-09-28 — superseded
  2026-09-29 by the Data sources rebuild, see CLAUDE.md): `docs/design/
  audit.md`'s row upgraded from mostly 🔲 to Hover/Focus/Loading/Depth
  ✅, Active 🟡. Depth was already earned (same `rounded-lg border
  border-border shadow-xs` wrap as Conversations/Leads/Actions) but
  never credited. Real screenshot review (using "Load sample data" to
  get a populated screen without a live embeddings call, since Q&A/
  file/URL ingestion all require a real `ANTHROPIC_API_KEY`) flagged the
  delete button's hover as visually almost imperceptible — `--accent`
  (`oklch(97%)`) against a near-white `oklch(100%)` page background.
  `getComputedStyle()` confirmed the hover genuinely applies (not
  broken), and the same `ghost`-variant subtlety is already accepted and
  credited ✅ on the Bots list's row-action button, so this was
  documented as a real, cross-cutting `--accent`-on-white contrast
  question (affects `ghost` buttons in 5 files total: `ActionsTable.
  tsx`, `KnowledgeTable.tsx`, `BotTableRow.tsx`, `BotsTable.tsx`,
  `sidebar.tsx`) rather than unilaterally redesigned for one screen —
  flagged to the user since fixing it would touch several already-
  audited screens' visual baselines at once, not committed to yet
  (still not committed to as of the 2026-09-29 rebuild).

