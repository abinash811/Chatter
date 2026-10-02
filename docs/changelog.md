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
(functions that call a real API, ADR 0028).

---

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

- **JS-rendering fallback for URL/crawl ingestion (2026-10-02, ADR
  0031)**: closes the one named gap ADR 0030 shipped with — a JS-heavy
  site (React/Vue, real content only exists after its own JavaScript
  runs) previously crawled but extracted little or no readable text.
  User-requested after a plain-language discussion of the build-vs-rent
  tradeoff (self-host our own browser vs. rent one from Browserless/
  Firecrawl) — explicit decision: build it ourselves first, keep
  renting as the named fallback plan if self-hosting proves difficult,
  consistent with ADR 0030's own call on the adjacent decision.
  `playwright` promoted from a devDependency (e2e tests only) to a real
  production dependency — `lib/ai/extraction.ts`'s `extractUrlText` now
  retries with a real headless Chromium only when the plain-fetched
  page yields under 150 characters of Readability-extracted text (the
  signature of an empty JS-framework shell), re-running the same
  Readability extraction against the rendered DOM. A retry, not a
  default: the common case (plain server-rendered HTML) never touches
  the browser-launch path, so most ingestion stays exactly as fast and
  cheap as before. `lib/ai/crawler.ts` needed zero changes — it already
  calls `extractUrlText` per page unchanged, so every crawled page gets
  the fallback automatically.
  Real bug this mock exists to prevent, caught before it shipped: the
  first version of `tests/unit/lib/ai/extraction.test.ts` had no
  `playwright` mock, so the pre-existing "no extractable article
  content" test started actually launching a real browser and hitting
  the live network on every run (9s vs. 1.7s after mocking) — a real
  hermeticity bug in the test, not the production code; fixed with a
  `vi.mock("playwright", ...)` defaulting to "no browser available" so
  every pre-existing test keeps its original, plain-fetch-only
  behavior, with 4 new dedicated tests covering the fallback itself
  (skips rendering when the plain fetch already has real content;
  renders and uses the result when it doesn't; still throws the same
  plain-language error when even the rendered page is empty; degrades
  gracefully when the browser itself fails to launch or navigate).
  Real environment verification, not assumed from reading the code: a
  scratch script launched the real sandbox Chromium
  (`/opt/pw-browsers/chromium`, the same override `playwright.config.ts`
  already uses) against a local JS-only test page and confirmed it
  genuinely executes JavaScript and returns the rendered DOM when
  invoked from plain application code, not just from inside
  `npx playwright test`.
  `docs/changelog.md` itself archived its oldest 2026-09 entries into a
  new `docs/changelog/2026-09-part4.md` in the same pass (its own
  archival policy — crossed ~500 lines again).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails;
  full unit suite (226 tests, 4 new); `docs/open-questions.md` #8 (app
  compute platform) annotated with the new real-Chromium-binary
  constraint this adds to that still-open decision.

- **Firecrawl last-resort fallback for URL/crawl ingestion (2026-10-02,
  ADR 0032)**: closes the one case ADR 0031 still left open — a site
  actively resisting automated browsers (bot-detection), not just one
  that needs JavaScript to run. User asked a sharp, worth-recording
  question before approving: given we'd pay for Firecrawl anyway, is a
  3-step chain (plain fetch → self-hosted browser → Firecrawl) actually
  optimizing anything over skipping straight to Firecrawl once the
  plain fetch fails? Answer, explained plainly before building: yes —
  the self-hosted browser (ADR 0031) already handles the common
  JS-rendered case for free; skipping it would make Firecrawl the
  primary handler for every JS-heavy site a business owner has, which
  is exactly the usage-scaled-cost problem ADR 0030/0031 already
  rejected Firecrawl over, just one layer deeper. Keeping the
  self-hosted step narrows Firecrawl's real trigger population to
  sites that *also* defeat a plain headless browser — a much smaller,
  genuinely rare case.
  `scrapeWithFirecrawl` (`lib/ai/extraction.ts`) is the true last
  resort in `extractUrlText`'s chain, called only when the self-hosted
  render step has also failed to find enough text — `app.scrape(url, {
  formats: ["markdown"], onlyMainContent: true, proxy: "stealth" })`
  (`firecrawl` npm package, version confirmed via `npm view`, its real
  API read from the installed package's own README/types since
  `firecrawl.dev`'s docs site wasn't checked directly). Platform-funded
  (one `FIRECRAWL_API_KEY` we configure, not BYOA) — explained to the
  user as a deliberate choice before building: a business owner
  bringing their own key for a fallback they'd rarely if ever trigger
  would make the feature practically unused; degrades silently
  (skipped, not an error) when the key isn't set, same pattern as every
  other optional provider key in this codebase.
  Real, unrelated security finding caught while installing: `npm audit`
  flagged `firecrawl`'s pinned `axios@1.18.0` transitive dependency as
  high severity (several real CVEs, including an SSRF-relevant
  redirect-handling bug) — fixed via `package.json`'s `overrides` field
  pinning `axios@^1.20.0` (confirmed the first patched version via `npm
  view axios versions`), not by ignoring the finding or accepting the
  vulnerable version.
  Real test-hermeticity bug avoided proactively, having just been
  caught for real in ADR 0031's own commit: the `firecrawl` mock in
  `tests/unit/lib/ai/extraction.test.ts` initially risked the same
  "arrow function isn't `new`-able" mistake `tests/unit/lib/ai/
  crawler.test.ts`'s `Sitemapper` mock made earlier — caught before
  committing this time, not after, by writing the mock as a real
  `function` expression from the start. 5 new tests cover: Firecrawl
  never attempted when no key is set; used as the true last resort with
  a stealth proxy once both earlier steps fail; skipped when the
  self-hosted browser already succeeded; still throws the same
  plain-language error when Firecrawl also finds nothing; degrades to
  that same error rather than a raw one when Firecrawl itself throws.
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails
  (`npm audit` back down to the 2 pre-existing, already-tracked Next.js/
  postcss vulnerabilities); a production build (confirms `firecrawl`
  stays server-only, no client bundle impact); full unit suite (231
  tests, 5 new); `tests/e2e/knowledge.spec.ts` and the knowledge a11y
  scan re-run against the real production build (one flaky failure in
  the delete-entry test, confirmed non-deterministic — passed on one
  isolated re-run, failed on another, consistent with the pre-existing
  documented toast-timeout flake, not a regression from this change).

- **TypeScript 7 + Next.js 16 upgrade, 2 of 4 deferred Dependabot
  majors resolved (2026-10-02, ADR 0033)**: user asked to resolve the
  "4 Dependabot majors deliberately deferred" line CLAUDE.md's "Known
  gaps" had carried since 2026-09-26 without anyone picking up the
  actual work. Checked each major against this codebase's real usage
  before deciding anything (not generic release notes): TypeScript 7's
  new defaults (`strict`, ES2022 target, `moduleResolution`) already
  matched our `tsconfig.json` exactly; Next 16's real breaking changes
  (`middleware.ts`→`proxy.ts`, `revalidateTag()`'s new required
  argument, parallel routes needing `default.js`) don't exist anywhere
  in this codebase (grepped, not assumed). Prisma 5→7 deliberately
  **not** included — it's an architecture change (new `prisma-client`
  generator, required driver adapters, a new `prisma.config.ts`)
  touching `lib/db.ts`'s RLS mechanism directly, staying its own
  dedicated future pass with its own ADR.
  `typescript@7.0.2` and `next@16.3.8` installed, then Next's own
  official codemod (`npx @next/codemod@canary upgrade latest -y
  --skip-eslint-upgrade --skip-react-upgrade`) run to catch anything
  grep might have missed — confirmed no code transforms were needed,
  matching the risk assessment. `--skip-eslint-upgrade` because this
  project has no ESLint config at all; `--skip-react-upgrade` because
  `react@19`/`react-dom@19` already satisfied Next 16's peer range.
  **Two real, undocumented regressions caught only by running the full
  verification sweep, not just `tsc`+build** (exactly the class of bug
  CLAUDE.md's "never commit code that hasn't actually been run" rule
  exists for):
  (1) A real WCAG AA color-contrast regression — the full
  `accessibility.spec.ts` run found 9 pages newly failing. Root-caused
  with a real in-browser contrast calculator (composited fg-over-bg on
  a canvas, read back actual sRGB bytes, computed relative luminance
  per the real WCAG formula — not oklch math by hand) rather than
  guessed: 3 design tokens (`--muted-foreground`, `--destructive`, and
  `AuthShell.tsx`'s `text-panel-foreground/45`) were already razor-thin
  (4.0-4.36:1 against the 4.5:1 minimum) before this upgrade, and a
  small color-math rounding shift in the new Turbopack/Lightning CSS
  pipeline tipped several over the line at once. Confirmed genuinely
  new (not newly-caught-but-pre-existing) by bisecting: reverted to the
  old deps, the same test passed clean. While investigating, also found
  `docs/design/design-system.md`'s own prior "4.74:1, verified" claim
  for `muted-foreground` had checked it against `--background` (white)
  instead of `--muted` (97% L) — the backdrop it's actually paired with
  at every real usage site — a methodology gap in the original
  verification, not just a stale number. Fixed at the token level with
  real contrast math against every real pairing (not patched
  per-element, not re-verified against one convenient backdrop):
  `--muted-foreground` 55.6%→48% L (6.04:1), `--destructive` 57.7%→45%
  L (6.02-6.91:1 across every usage site — badges, button text, error
  text), `/45`→`/60` opacity on `AuthShell.tsx`'s one usage (7.04:1).
  `docs/design/design-system.md` and `docs/design/audit.md` both
  corrected with the real numbers and the methodology lesson, not just
  the new values.
  (2) A real JSX-rendering regression — 6 of `tests/e2e/`'s "seeded X
  appear in the list" specs failed with a heading-not-found error. The
  rendered accessible name had silently changed from `"Leads 2"` to
  `"Leads2"` (no space) on every page using the pattern `<h1>Label
  {count > 0 && <span>{count}</span>}</h1>` (Bots, Leads, Data sources,
  Custom actions, Widgets, Conversations — 6 files, found via a
  codebase-wide grep, not assumed to be isolated to the one failing
  test first noticed). These relied on incidental JSX whitespace
  between the label text and the conditional span, which the new
  build's output no longer preserves the same way. Confirmed genuinely
  new via the same bisection as the contrast issue. Fixed by making the
  space explicit (`Label{" "}`) at all 6 sites rather than patching the
  one test or depending on the old incidental behavior again — a
  whitespace-only text node doesn't generate a visible flex item, so
  this didn't add any visual gap (confirmed via the regenerated visual
  baselines, pixel-reviewed by hand).
  Verified: `npx tsc --noEmit` clean; all 10 `check:all` guardrails; a
  production build; full unit suite (231 tests, unchanged — this pass
  touched no unit-tested logic); the full `tests/e2e/` suite (117/117
  passing after both fixes, confirmed clean twice); the full
  `accessibility.spec.ts` suite (15/15, 0 serious/critical violations,
  up from 9 failing); all 19 `tests/visual/` baselines regenerated
  (13 genuinely changed pixels from the contrast fix, 6 pixel-identical)
  and manually reviewed — the spacing fix introduced no visible layout
  change, the contrast fix is visibly legible without looking washed
  out or jarring.

- **Prisma 7 upgrade, closing the last 2 deferred Dependabot majors
  (2026-10-02, ADR 0034)**: user asked to close out the "Prisma
  5→7 (client+CLI) deliberately deferred" item ADR 0033 had left. The
  highest-risk of the 4 original Dependabot majors — a real
  architecture change, not a version bump, touching `lib/db.ts`'s
  `withOrgContext` (the literal mechanism enforcing guardrail #1,
  tenant isolation via RLS) — so this got its own dedicated pass with
  real verification, not folded into the earlier TS/Next pass.
  `prisma.io`'s docs stayed network-blocked (consistent with every
  prior session), so everything below was confirmed by actually
  running the real installed CLI and reading its real errors/type
  definitions, not trusted from secondary-source summaries.
  Two real findings from that approach: (1) npm's `latest` dist-tag for
  `prisma` already points to an `8.0.0` release candidate — pinned
  explicitly to `7.10.0` (the exact version the open Dependabot PRs
  targeted, confirmed via `npm view prisma versions` as the latest real
  stable 7.x), same lesson as ADR 0024's TanStack Table pin; (2) the
  existing `prisma-client-js` generator still works completely
  unchanged under 7.10.0 (confirmed by running `prisma generate` with
  it, no deprecation warning) — every secondary source describing "the
  Prisma 7 migration" assumed the newer `prisma-client` generator
  (different output location, 11 files' import paths change), which is
  real and Prisma's recommended path, but not the only one available
  today.
  Presented this as a genuine tradeoff before building anything (per
  CLAUDE.md's process rule): keep the old generator now (3 files
  change: `lib/db.ts`, `lib/auth.ts`, `scripts/verify-rls.mjs` — the
  only 3 real `new PrismaClient()` call sites) vs. switch to the new
  one in the same pass (14 files, bigger diff in the pass already
  touching RLS). User chose the smaller, old-generator path, deferring
  the generator switch as its own future pass.
  Real, confirmed-by-running requirements, not assumed: a driver
  adapter (`@prisma/adapter-pg`) is now mandatory at runtime —
  constructing `new PrismaClient()` with no arguments throws a real
  error naming this; `schema.prisma`'s `datasource` block can no longer
  hold a connection `url` at all (hard error, confirmed before changing
  anything) — moved into a new, mandatory `prisma.config.ts`.
  Real regression caught only by running the full e2e suite, not just
  `tsc`+build: Prisma 5's engine quietly auto-loaded `.env` for any
  `PrismaClient` consumer; with the adapter, *this codebase* now reads
  `process.env.DATABASE_URL` directly, and Node doesn't auto-load
  `.env` on its own. Next.js's own server already loads `.env`, so the
  running app was fine, but `tests/e2e/helpers.ts` (Playwright's own
  Node process) and `scripts/verify-rls.mjs` don't — 31 e2e specs
  failed with "User was denied access on the database `(not
  available)`" until this was found and fixed with the same
  `process.loadEnvFile()` defensive pattern already used in
  `scripts/apply-sql-migrations.mjs`/`scripts/predev-check.mjs`, added
  to `lib/db.ts` itself (every consumer gets it for free) and
  `scripts/verify-rls.mjs`.
  Real, unrelated security finding while installing: `npm audit`
  flagged `prisma`'s own transitive `mysql2` (auth-downgrade CVE) and
  `deepmerge-ts` (stack-exhaustion CVE) — pinned via `package.json`'s
  `overrides` to patched versions, same pattern as ADR 0032's `axios`
  fix.
  Verified: `npx tsc --noEmit` clean; a production build; all 10
  `check:all` guardrails; full unit suite (231, unchanged — Prisma is
  mocked at the module boundary in every test); `node scripts/verify-
  rls.mjs` run for real against a live local Postgres instance, all 3
  tenant-isolation assertions passing (the one piece of this migration
  that genuinely couldn't be verified by reading code or `tsc` alone);
  the full `tests/e2e/` suite (117/117 after the env-loading fix,
  confirmed clean — the 1 failure before that was the pre-existing,
  already-documented toast-timeout flake, confirmed by an isolated
  re-run); the full `accessibility.spec.ts` suite (15/15, 0
  violations); `npm audit` clean of the new findings. All 4 of the
  originally-deferred Dependabot majors are now resolved.

