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
(conversation inbox made non-technical).

---

- **Design system fully off CARE — all 18 primitives now on shadcn's
  real official source, `@base-ui/react` removed entirely (ADR 0017).**
  User's explicit instruction: "Remove all design dependencies and keep
  only Shadcn" — overrides ADR 0014's new-screens-first phasing (which
  had only migrated `Sidebar`/`Table` after 2 sessions) in favor of
  finishing the whole set now. All 16 remaining primitives (`Button`,
  `Dialog`, `AlertDialog`, `Tabs`, `DropdownMenu`, `Popover`, `Tooltip`,
  `Select`, `Separator`, `Avatar`, `Skeleton`, `Alert`, `Switch`,
  `RadioGroup`, `Sheet`, `ScrollArea`) pulled in one batch via the
  existing `scripts/pull-shadcn-component.mjs` (real source from
  `raw.githubusercontent.com`, never recalled/guessed) — 10 have real
  screen usage (directly, or indirectly via `Sidebar`'s own internal
  dependencies), 6 (`Popover`/`Avatar`/`Alert`/`Switch`/`RadioGroup`/
  `ScrollArea`) had zero usage anywhere in the app even under CARE,
  migrated anyway since the goal was dropping the dependency entirely,
  not just fixing load-bearing screens — documented plainly that these
  6 only got `tsc`/build verification, not real browser behavior, since
  nothing renders them. `npm uninstall @base-ui/react` once nothing
  imported it anymore; bundle size dropped measurably as a real,
  incidental benefit (e.g. the bot editor page's First Load JS: 230kB
  → 187kB).

  `tsc` surfaced 5 real API differences between Base UI and radix-ui in
  one pass (fixed, not guessed): `Tabs.Content`'s `keepMounted` →
  `forceMount`; CARE's `destructive-solid` Button variant doesn't exist
  on shadcn's real 6-variant set (→ `destructive`); `Select.Value`
  needs no `items` workaround with real radix-ui (only Base UI's popup-
  unmounts-while-closed behavior required that); `Sidebar`'s one-line
  `TooltipProvider` `delay`→`delayDuration` adaptation from the ADR
  0014 Sidebar-only migration reverted now that `Tooltip` is also real
  shadcn; and CARE's extra `AlertAction`/`SheetBody` exports (unused
  anywhere) dropped from `components/ui/index.ts`.

  **Caught one real, non-cosmetic regression by actually clicking
  through the app, not trusting `tsc`**: the knowledge base's delete
  confirmation used a `<form action={deleteFormAction}>` submit button
  nested inside `AlertDialogAction` — under real radix-ui, the dialog's
  own close-on-click dismissal unmounts mid-click and corrupts React's
  server-action wiring, so clicking "Delete" silently fired zero
  network requests (confirmed via request/response logging) — the row
  never actually got deleted, though the UI gave no visible sign
  anything was wrong. This exact flow had only ever been "verified for
  real" as a one-off manual check in an earlier session (ADR 0013's
  knowledge base pass), never as a persistent spec, so nothing would
  have caught this regression automatically. Fixed by calling the
  `useActionState` dispatch directly with manually-built `FormData`
  from `onClick` instead of relying on native form submission —
  sidesteps the race entirely. Added a permanent
  `tests/e2e/knowledge.spec.ts` regression spec (Cancel keeps the row,
  confirming Delete removes it past a real reload) so this can't be
  silently reintroduced, closing the exact kind of coverage gap
  CLAUDE.md's own "never commit code that hasn't actually been run"
  rule warns about.

  Verified: guardrails, `tsc`, a clean rebuild, all 99 unit tests
  (unchanged), all 41 `tests/e2e/` specs (40 + 1 new regression spec)
  against a genuinely fresh server, and all 11 `tests/visual/`
  baselines regenerated (every one changed, as expected — Button's real
  shadcn styling differs subtly from CARE's, affecting every screen —
  confirmed via real diff/actual images before regenerating, not
  assumed) and stable across two clean re-runs. `docs/design/design-
  system.md`'s component inventory rewritten (no more CARE-vs-shadcn
  split to track), `docs/conventions.md`'s "Building a new feature"
  step 2 updated, `docs/adr/0017-complete-shadcn-migration-drop-base-
  ui.md` added.
- **`docs/north-star.md` added** — the user's long-term "Configurable AI
  Agent Platform" product direction (chat-first now, voice/healthcare-
  multi-agent orchestration later, other verticals after that), captured
  so a new session has it without re-reading full chat history.
  `docs/roadmap.md` flagged with the current phase (Phase 1: chat-based,
  Chatbase-parity + our own product opinions; voice and other verticals
  explicitly deferred). Docs-only.
- **Console sidebar rebuilt against a real Chatbase screenshot
  reference** (user-supplied, not recalled) — replaces the bare
  "Chatter" logo + 3 nav items shell with: a real org-name header (no
  fabricated plan badge — we have no billing/plan concept yet, so one
  wasn't invented), a functional nav search filter, a "Getting started"
  checklist widget backed by real per-org data (5 steps: first bot,
  knowledge added, appearance customized, published, integration
  connected — each a live count query, not a stored flag), and a
  signed-in-user footer (avatar initial + email + logout). Top bar
  deliberately left alone this pass (user's explicit call — its real
  content, a bot switcher/type dropdown, belongs to a future bot-editor
  redesign, not the shell). `lib/auth.ts` gained `getUserEmail()` (User
  isn't RLS-protected, same reasoning as the existing login lookups);
  `lib/ai/botConfig.ts`'s `DEFAULT_APPEARANCE` exported so the checklist
  can tell a genuinely customized appearance apart from the value
  `getOrCreateDraft` silently seeds every new draft with.

  Caught two real bugs by actually running this, not trusting types:
  (1) comparing appearance against `{}` instead of `DEFAULT_APPEARANCE`
  marked "customize appearance" done the moment anyone opened the bot
  editor, before ever touching it — caught by a real e2e assertion
  expecting 1/5 and getting 2/5, not by `tsc`. (2) masking the org-name/
  user-email `<span>`s directly for `tests/visual/` made the mask
  bounding box track the text's own rendered width — same character
  *count* every run (fixed-length timestamp+random suffix) still shifts
  a few pixels per run from ordinary glyph-width variation, so the
  baseline flaked on every re-run, not just the first. Fixed by masking
  the fixed-width parent row instead of the shrink-to-fit text node;
  confirmed via two clean re-runs after the fix, where the first
  "regenerate once and move on" attempt would have shipped a still-flaky
  baseline.

  Also hit and worked around a real, pre-existing environment gap, not
  a code bug: this container had no `node_modules`, no local Postgres
  role/db/pgvector, and no `.env` — all set up fresh (`npm install`,
  `postgresql-16-pgvector` installed, `chatter` role/db created,
  `db:migrate` + `apply-sql-migrations.mjs` run) to actually verify
  against a real Postgres instead of skipping verification. Also hit the
  documented "stale `next-server` process serving an old build" hazard
  from the ADR 0014 Sidebar/Table migration entry above, twice — same
  fix (kill the stale process, rebuild, retest).

  Verified: guardrails, `tsc`, a clean rebuild, all 99 unit tests
  unchanged, all 44 `tests/e2e/` specs (41 existing + 3 new
  `tests/e2e/sidebar.spec.ts` specs: search filter, checklist progress +
  navigation, footer identity + logout), and all 11 `tests/visual/`
  baselines regenerated (every one changed, as expected — the sidebar is
  present on every console screen) and confirmed stable across two
  clean re-runs. The browser canary itself couldn't run (this
  container's Playwright install is missing the exact `chrome-headless-
  shell` revision `scripts/canary.mjs` expects — a version-pin drift
  between the pre-installed browser and the `playwright` npm package,
  unrelated to this change) — worked around with a one-off equivalent
  check using the full Chromium binary the e2e/visual suites already use
  successfully, confirming zero console/page errors on `/login` and the
  unauthenticated `/bots` redirect. Not fixed permanently; flagged here
  rather than silently skipped. `docs/design/preview/console-shell.html`
  rebuilt to match.
- **Bot-scoped top bar with a bot switcher (`components/console/
  BotTopBar.tsx`) — 2026-09-26, matches the Chatbase reference
  screenshot's own bot switcher.** Explicit user-confirmed scope: one
  persistent top bar shared across all 3 bot-scoped pages (editor/
  knowledge/integrations) via a new `app/(console)/bots/[botId]/
  layout.tsx`, replacing each page's own separate header — not scoped
  to the editor alone. Switching bots preserves the current page
  (Knowledge stays on Knowledge for the new bot) by reusing the
  pathname's subpath after `/bots/{botId}` verbatim, rather than always
  landing on the editor. `BotEditorForm.tsx`'s own top row now only
  keeps what's specific to it (publish-status badge, Save/Publish) —
  the bot name/switcher and Knowledge/Integrations links moved to the
  shared bar. Knowledge/Integrations pages' own `<h1>`s demoted to
  `<h2>` (the page's real h1 is now the switcher row's sr-only bot
  name) — a page should have exactly one h1.

  Caught two real bugs by actually running this, not trusting types:
  (1) assumed a parent layout throwing prevents a child page's own data
  fetch from starting — false for Next.js App Router, which fetches a
  layout and its page in parallel rather than sequentially. Without the
  page keeping its own lightweight bot-existence check, an invalid
  `botId` raced `getOrCreateDraft` into a raw Prisma foreign-key
  violation instead of the clean "not found" the layout throws — same
  end result (the plain-language error boundary still shows) but an
  ugly, harder-to-debug error logged along the way. Fixed by keeping a
  cheap `findUniqueOrThrow` in the editor page too, confirmed via a real
  server log showing a clean Prisma `NotFoundError` afterward, not the
  FK violation. (2) 4 existing `tests/e2e/` specs broke because their
  own selectors (`button:has-text("Publish")`, `button:has-text("Add")`,
  a bare `getByText(<bot name>)`) coincidentally substring-matched the
  new switcher — a `<button>` whose visible text is literally the bot's
  own name (test bots were named "Publish Test Bot", "Add Menu KB Bot",
  etc.) — so a click meant for the real action button silently opened
  the switcher's dropdown instead. Fixed by switching those assertions
  to `getByRole` with `exact: true` (the switcher's accessible role is
  `combobox`, not `button`, so a role-scoped query never collides) —
  worth remembering as a real, recurring hazard of adding any new
  visible-text control near existing text-based test selectors, not a
  one-off.

  Verified: guardrails, `tsc`, a clean rebuild, all 99 unit tests
  unchanged, all 47 `tests/e2e/` specs (44 existing, all updated
  selectors re-verified passing, + 3 new `tests/e2e/bot-top-bar.spec.ts`
  specs: switcher lists every bot and preserves the current page on
  switch, nav highlights the active page, and the error-boundary case
  for an invalid/foreign bot id), and all 11 `tests/visual/` baselines
  regenerated (bot editor, its publish dialog, knowledge empty/add-
  dialog, and the icon-collapsed sidebar — every screen that renders a
  bot-scoped page) and confirmed stable across two clean re-runs. Also
  manually screenshotted the Integrations page for real (no existing
  `tests/visual/` baseline for it) to confirm it correctly picked up the
  new shared top bar with zero page-specific changes needed.
  `docs/design/preview/bot-editor.html` updated to show the new shared
  top bar above each tab scene; `knowledge.html`/`settings.html`/
  `conversations.html` previews were not touched this pass and are now
  slightly stale on this one point (same honest gap-flagging as the
  general design-system-preview staleness already noted in `docs/
  design/README.md`), not silently assumed current.
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

