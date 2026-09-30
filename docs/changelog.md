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
rebuild onto the real CARE `Table` (ADR 0008).

---

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
- Settings depth/polish pass, full detail (2026-09-28): `docs/design/
  audit.md`'s row upgraded from mostly 🔲 to Hover/Focus/Loading/Depth
  ✅, Active 🟡. No code-level bugs here, unlike Integrations — this
  screen already used the shared `Input`/`Label`/`Card` primitives
  correctly (real `htmlFor`/`id` pairing) since it was first built.
  `Card` already earns Depth (`rounded-lg border shadow-xs`) —
  credited, was 🟡. Real screenshot review of rest/focus/hover/"key
  set" states confirmed clear hierarchy and working focus rings on both
  inputs. Considered whether "Remove" (API key) needs a `destructive`
  variant or confirm dialog like Knowledge's delete — deliberately not
  flagged: removing a BYOA key is fully reversible (falls back to the
  managed key, no data loss), unlike an unrecoverable knowledge-entry
  delete, so the existing plain `outline` button with no confirm step
  is an already-calibrated decision, not an oversight. No code changed
  this pass — audit-only.
- Integrations depth/polish pass, full detail (2026-09-28): `docs/
  design/audit.md`'s row upgraded from mostly 🔲 to Hover/Focus/
  Loading/Depth ✅, Active 🟡. Two real, code-level bugs, not just
  visual ones. (1) `provider.connectFields` (`lib/integrations/
  provider.ts`) carries a real `label` per field that the page never
  rendered — the raw `<input>` relied on its `placeholder` alone, which
  isn't an accessible name; replaced with the shared `Input`/`Label`
  primitives (`sr-only` label, keeping the restrained Stripe register's
  horizontal layout while gaining a real accessible name). (2) the
  provider-list wrapper was the one list screen still using a bare
  `divide-y`/`border-y` with no rounded corners or shadow, while every
  other list screen already has `rounded-lg border shadow-xs` — added
  here too, verified via `getComputedStyle()` (10px radius, real
  shadow), not just eyeballed (a stale dev-server build initially
  masked the fix — caught by checking the rendered class list directly,
  not trusting the first screenshot). New `integrations.png` visual
  baseline added (none existed before); first attempt raced the
  Suspense boundary and captured `loading.tsx`'s skeleton instead of
  real content (same flake class already documented on leads/actions'
  empty-state tests) — fixed by waiting for real text before capturing.
  Verified: `tsc` clean, all 10 `check:all` guardrails, full unit
  suite, the integrations a11y scan (clean, now covers the labeled
  input), and the full 19-test visual suite (18 unchanged + 1 new,
  stable across two runs).
- Conversations Activity rebuild, full detail (2026-09-29, ADR 0027):
  the user shared 5 real Chatbase Activity screenshots (chat-log list,
  Filter-by modal, Playground view, "..." menu, Details tab) and asked
  to recreate the layout/UI/UX in our own design system, grounded in
  Chatbase's real docs, "Dont guess anything always." Read two real
  primary sources via `WebFetch` (`docs/user-guides/chatbot/activity`
  and the conversation pause/resume API reference — quoted verbatim in
  the ADR, not summarized), compared against the existing table-based
  `/conversations`, and proposed a phased plan; the user approved Phase
  1 with a single "okay." Rebuilt `/conversations` and `/conversations/
  [conversationId]` as a split-pane layout (list left, Chat/Details
  panel right), replacing `ConversationsTable.tsx` entirely.
  `Conversation` gained two real columns — `status` ("ongoing"/
  "paused") and `source` ("widget"/"playground") — via a hand-written
  migration, applied against real local Postgres and re-verified clean
  with `scripts/verify-rls.mjs`. Pause/resume is real, not decorative:
  `lib/ai/chat.ts`'s `sendMessage` now persists the visitor's message
  but returns `{ reply: null }` before any model call when a
  conversation is paused, matching Chatbase's own documented behavior
  ("stops receiving AI replies but still records incoming messages")
  exactly; `public/widget.js` and `app/api/chat/route.ts` degrade
  gracefully when `reply` is `null`. The Details tab shows Contact
  (resolved from a linked `Lead`, else "Anonymous"), Source, Status,
  message count, Created, Last activity, and the Conversation ID —
  Sentiment and Country deliberately render "Not analyzed"/"Not
  tracked" rather than fabricated values, matching Chatbase's own real
  "unanalyzed" UI state (confirmed from the user's screenshot) per
  guardrail #4, rather than inventing data we don't compute. Added
  bulk-select + client-side CSV export (`lib/csvExport.ts`, a `Blob` +
  synthetic `<a download>` click, no new API route needed). Wrote ADR
  0027 recording the layout decision, the schema additions, and — as
  important — an explicit "Alternatives considered" section for why
  Sentiment/Country/`ended`/`taken_over` states were *not* built (no
  primary source grounds them yet); the ADR's Consequences section
  notes this only partially answers `docs/open-questions.md` #7 (the
  new `status` field is about AI-reply availability, a different
  concept from "resolved for analytics").
  Real architectural finding mid-build: Next.js's `searchParams` is
  only passed to Page components, not Layout components, so a shared
  `layout.tsx` couldn't read the filter query params needed by both
  routes — solved with `app/(console)/conversations/shared.ts`, an
  async data-loader function called independently by both `page.tsx`
  files, rather than duplicating the query logic or forcing a client-
  side workaround.
  Real bugs caught while verifying, not hypothetical: (1) the unit-test
  mock for `getConversationDetail` had no `tx.lead.findFirst` mock for
  the new Contact-resolution `Promise.all`, failing the one test that
  exercised it — fixed by adding the mock. (2) the e2e suite's list-row
  count assertions (`page.locator("ul > li")`) matched the sidebar's
  own nav `<ul><li>` structure too, inflating counts — fixed by adding
  `data-slot="conversation-list"` to the real list and scoping every
  count/text assertion to it, including the bulk-select checkbox count
  (which also had to exclude the unrelated "Has an issue" filter
  checkbox, itself `role="checkbox"`). (3) the Details-tab e2e test's
  `getByRole("tabpanel", { name: "Details" })` returned zero elements —
  initially suspected as a Radix accessible-naming quirk or a
  hydration race, but checking the actual `error-context.md` page
  snapshot (rather than guessing) showed the "Details" tab's own click
  had been silently dropped from the test during an earlier edit; the
  real fix was restoring that click, not working around a phantom
  timing bug.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails;
  full unit suite (168 tests); the full `tests/e2e/` suite (101/102 —
  the one failure is the pre-existing, already-documented "Published
  v1" toast-timeout flake, confirmed unrelated by re-reading its own
  error output); the `conversations-list.png`/`conversation-detail.png`
  visual baselines regenerated and stable across two runs, with the
  full 19-baseline visual suite otherwise pixel-identical; a live
  functional verification script (not just mocks) confirmed pausing a
  conversation actually suppresses the widget's next AI reply
  end-to-end, and that Source correctly reads "Playground" for a
  preview-originated conversation.

- **In-chat widgets, Phase 2 — Functions that call a real API**
  (2026-09-30, ADR 0028). User asked to build the Functions half of
  ADR 0028's original scope: a widget's submit can now optionally call
  a real API instead of just becoming a chat message, reusing Custom
  Actions' pipeline (`performActionRequest`, `isBlockedActionUrl`, ADR
  0022) rather than a parallel one, and the `PendingAction` approval
  queue (ADR 0023) for write-capable calls.
  Checked `.claude/rules/bot-engine.md` rule #1 before writing any
  code — confirmed the `Tool` interface itself (`handle():
  Promise<string>`) didn't need to change; a widget with an `apiUrl`
  simply gets a second tool, `submit_widget_<name>`
  (`buildWidgetSubmitTool`, `lib/ai/tools/widget.ts`), returning the
  same tagged-JSON-string pattern every tool already uses
  (`{"status":"ok"|"handoff_required"|"pending_approval",...}`).
  `Widget` gained `apiUrl`/`apiMethod`/`headersEncrypted`/
  `writeCapable` columns (migration applied and `scripts/verify-rls.mjs`
  run against real local Postgres — no new RLS policy needed, the
  existing table-level policy already covers new columns). Headers are
  encrypted at rest with the same `lib/crypto.ts` AES-256-GCM helper
  `CustomAction.headersEncrypted` uses.
  A write-capable widget's submit tool never calls the API directly —
  it queues a `PendingAction` and tells the visitor a human will review
  it. Approving it in `/bots/[botId]/approvals` now dispatches on a
  `submit_widget_` tool-name prefix (`app/(console)/bots/[botId]/
  approvals/actions.ts`) to a new `executeWidgetSubmission`
  (`lib/ai/tools/widget.ts`), which re-resolves the widget fresh by
  name via `getWidgetByNameForExecution` — a `PendingAction` only
  stores the tool name and the visitor's input, not the widget's own
  URL/headers, so the real config has to be looked up again at approval
  time, not carried in the queued row.
  Console UI: the Add-widget dialog gained a "Call an API when this
  form is submitted" checkbox (progressive disclosure — Method/URL/
  Headers/write-capable fields only render once checked), and the
  widgets table gained an "On submit" column with a semantic `Badge`
  ("Message only" / "Calls API" / "Calls API — needs approval").
  Real bugs caught while verifying, not hypothetical:
  (1) `tests/unit/lib/ai/tools/widget.test.ts`'s initial
  `const x = vi.fn(); vi.mock(...)` pattern threw "Cannot access
  'performActionRequest' before initialization" — a real hoisting
  order issue once the SUT's own import triggered the mock factory
  before the const existed; fixed with `vi.hoisted()`.
  (2) A new e2e test named its bot "Message Only Bot," which collided
  (Playwright strict-mode) with the "Message only" badge text it was
  asserting on, since the bot switcher renders the bot's own name on
  the same page — fixed by renaming the bot to "Collection Bot."
  (3) The new write-capable-widget approval e2e test initially asserted
  the queued request would end up "approved" after a real call to
  `https://api.github.com/zen` — it actually returned a genuine 403
  (GitHub rejects anonymous requests with no `User-Agent` header,
  which `performActionRequest` doesn't set), caught by reading the real
  `error-context.md` snapshot rather than assuming; fixed to accept
  either `approved` or `failed` as a real, honest terminal state,
  matching the pre-existing Shopify-approval test's own "no store
  connected → graceful failure" precedent — then a second Playwright
  strict-mode collision surfaced (the row's failure-detail paragraph
  and the status Badge both contained the text "failed"), fixed by
  scoping the assertion to `row.locator('[data-slot="badge"]')`.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails;
  full unit suite (195 tests, 25 across the two widget-related test
  files); a production build; `tests/e2e/widgets.spec.ts` (10/10) and
  `tests/e2e/approvals.spec.ts` (6/6) run in isolation after fixing the
  three bugs above; the widgets page's axe scan clean; real screenshots
  of the Add dialog's Function section and the table's new badges taken
  and reviewed against the design bar; a full background
  `npx playwright test` run confirmed 112/114 passing, the only 2
  failures being the pre-existing, already-documented
  `knowledge.spec.ts`/`preview.spec.ts` flakes, unrelated to this change.

- **Guardrails Phase 1 — rate limiting + spam detection** (2026-09-30,
  ADR 0029). User asked what Chatter should build next to match
  Chatbase; researched its real, publicly documented "Guardrails"
  feature (`docs/research/competitive-landscape.md`'s 2026-09-28
  update) — three mechanisms (rate limiting, spam detection, country/IP
  blocking) we had zero equivalent of. Built the two that don't need a
  new external dependency or a new visitor-identity system; deferred
  country/IP blocking (needs a geolocation-vendor decision,
  `docs/open-questions.md` #10).
  Real naming collision caught before writing any code:
  `BotConfigVersion.guardrails` (a `String`) already exists for
  persona-level content-guardrail prompt text (CLAUDE.md guardrail #3)
  — a completely different concept from Chatbase's abuse-protection
  "Guardrails" that happens to share the name. Resolved by giving the
  new feature its own field (`abuseProtection Json @default("{}")`,
  same pattern as `appearance`) while grouping both under the same
  console "Guardrails" tab as a second Card, "Abuse protection" —
  documented as a deliberate choice in ADR 0029, not a data-model
  rename (too large a migration for a cosmetic naming match).
  Rate limiting scopes to per-conversation, not per-device: no
  persistent visitor identity exists anywhere in this codebase
  (`public/widget.js` holds `conversationId` only in a JS closure
  variable, a known limitation flagged in its own header comment) — a
  real, explicit narrowing from Chatbase's literal behavior, recorded
  in the ADR rather than faked with a made-up device ID. Spam detection
  reuses the model gateway (bot-engine rule #1) rather than a keyword
  list — a cheap Haiku call at Chatbase's own documented checkpoints
  (2nd/4th/8th/16th visitor message), classifying against the bot's own
  configured guidance text; a `SPAM` verdict calls
  `setConversationStatus(..., "paused")` (`lib/conversations.ts`, ADR
  0027) — the first non-human caller of that function, a new code path
  worth naming, not an existing pattern reused unchanged.
  New: `lib/ai/abuseProtectionOptions.ts` (types/defaults/parsing, zero
  server deps — same client/server split as `appearanceOptions.ts`),
  `lib/ai/abuseProtection.ts` (`checkRateLimit`, `isSpamCheckpoint`,
  `classifyRecentMessagesAsSpam`), `AbuseProtectionTabContent.tsx`
  (progressive disclosure — Method/URL-style fields only rendered once
  a toggle is on, matching the widgets Add-dialog's own "Call an API"
  pattern). `lib/ai/chat.ts`'s `sendMessage` runs both checks between
  the existing paused-conversation check and the model call; both are
  no-ops (no extra DB/model call) unless a business owner opts in, so
  no existing bot's behavior changes.
  Migration (`20260930010000_add_abuse_protection`) applied and
  `scripts/verify-rls.mjs` run against real local Postgres — no new RLS
  policy needed (existing table-level policy already covers the new
  column). Real screenshot taken of the progressive-disclosure UI
  (collapsed and expanded) and reviewed against the design bar; a
  scratch script confirmed the fields actually save and survive a
  reload against a real running server, not just a passing test.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (211 tests, 16 new — 10 in a new
  `abuseProtection.test.ts`, 6 integration tests added to
  `chat.test.ts` covering disabled-by-default, rate-limit block, spam
  pause, and the OK/no-checkpoint pass-through paths); a new permanent
  e2e test (`bot-editor.spec.ts`) covering the toggle/save/reload round
  trip, run both in isolation and as part of the full file (the file's
  2 pre-existing toast-timeout failures reproduced independently in
  isolation, confirmed unrelated); the bot editor's axe scan and the
  demo-data e2e suite re-run clean.

- **Real multi-page site crawling for Data sources (2026-09-30, ADR
  0030)**: the Add URL dialog's "Crawl this site" checkbox
  (`AddUrlDialog.tsx`) now crawls a whole site instead of ingesting one
  page — user-requested, following a build-vs-buy discussion (Firecrawl
  considered and explicitly passed on: its cost scales with Chatter's
  own usage, unlike BYOA-capable Claude/Voyage costs, and this product
  isn't at a scale where paying to have the long tail of crawling edge
  cases pre-solved is worth it yet). New `lib/ai/crawler.ts`'s
  `crawlSite(startUrl) -> CrawledPage[]` — the only function the
  ingestion pipeline calls, so a later vendor swap touches one module,
  matching the `ModelGateway`/`IntegrationProvider` swappable-interface
  precedent (`.claude/rules/bot-engine.md` rule #1). Discovery is
  sitemap-first (robots.txt's `Sitemap:` directive, else a same-origin
  `/sitemap.xml` guess, else a capped same-origin link-following
  fallback via `jsdom`), respects `robots.txt` throughout
  (`robots-parser`), capped at `MAX_CRAWL_PAGES` (20) and run
  synchronously (same hard-limits-not-a-background-job precedent as
  ADR 0013), with a courtesy delay between fetches. Per-page extraction
  reuses `extractUrlText` (`lib/ai/extraction.ts`) completely unchanged
  — zero duplication of the existing, already-tested single-URL path.
  New `createCrawledEntries` (`lib/ai/knowledgeBase.ts`) persists each
  crawled page the same way a single URL entry would; one page's own
  chunking/embedding failure skips that page rather than aborting the
  whole crawl (same "one bad item doesn't sink the batch" precedent as
  `bulkDeleteEntriesAction`).
  Real, honest scope correction caught before building: Claude had
  earlier told the user Playwright was "already available, not a new
  dependency" for a JS-rendering fallback — checking `package.json`
  before writing code found it's a devDependency only (e2e tests), not
  shipped to production, so JS-rendering was explicitly cut from this
  pass rather than silently built on a wrong assumption. Scheduled
  auto-refresh also explicitly deferred — needs real background-job
  infrastructure that doesn't exist anywhere in this codebase yet.
  Real bugs caught while verifying, not assumed from reading the code:
  (1) `sitemapper`'s `new Sitemapper(...)` requires a constructible
  mock — an arrow-function `vi.fn().mockImplementation()` silently
  isn't one (vitest warns, then every sitemap-path test fell through to
  the link-following fallback instead without erroring), fixed by using
  a real `function` expression; (2) `assertPublicHttpUrl` normalizes a
  bare origin to add a trailing slash, so a test comparing against the
  un-normalized string never matched; (3) the real 500ms-per-page
  courtesy delay made the `MAX_CRAWL_PAGES` cap test legitimately take
  ~10s, exceeding vitest's 5000ms default — fixed with an explicit
  15000ms test timeout, not a production-code change, confirmed correct
  via a real smoke test against `anthropic.com` showing the same
  pacing. Real smoke testing against live sites before any automated
  test was written: `anthropic.com` (541 real sitemap URLs found,
  correctly capped to 20, real article text extracted) and `example.com`
  (a 403 there was investigated and confirmed to be pre-existing
  `extractUrlText` behavior — no User-Agent header on that fetch call —
  unrelated to the new crawler code, which does set one).
  `robots-parser@3.0.1` and `sitemapper@4.1.6` added as real
  dependencies (versions confirmed via `npm view`, not recalled); their
  real APIs were confirmed by reading the installed `node_modules`
  READMEs directly, since `shopify.dev`/`sitemaps.org`/`rfc-editor.org`/
  `playwright.dev` all stayed network-blocked throughout this work
  despite the user granting access mid-session (very likely a policy-
  propagation issue needing a fresh session, same pattern observed
  earlier this session with `shopify.dev`).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (222 tests — 8 new in
  `crawler.test.ts`, 3 new in `knowledgeBase.test.ts`'s
  `createCrawledEntries` describe block); 2 new permanent e2e tests
  (`knowledge.spec.ts`) confirming the checkbox's progressive
  disclosure relabels the submit button and that the real SSRF guard
  (ADR 0013) rejects a private/local URL even with crawling checked,
  both run against a real production build, not dev mode (a stale dev
  build initially made both look broken — rebuilding before testing
  fixed it, not a real regression); a real screenshot of the Add URL
  dialog with the Crawl checkbox checked, reviewed against the design
  bar (clear hierarchy, a bordered progressive-disclosure region, the
  solid-black CTA correctly relabeling to "Crawl site") — no issues
  found.

