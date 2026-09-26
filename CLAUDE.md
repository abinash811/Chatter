# Chatter — Project Guide

## What this is

A vertical-agnostic AI chat platform — embeddable widget + admin dashboard —
in the spirit of Zipchat AI, but not restricted to ecommerce. The same core
engine should serve ecommerce, healthcare, automotive, and any other
industry, powered by Claude.

## Status: active build

Tech stack is chosen (ADR 0002) and real code exists — see README.md for
what's scaffolded. A few architecture questions are still open; check
`docs/open-questions.md` before scaffolding a component whose design is
listed there. If you're asked to build something whose design is still
open, resolve the question with the user (or write the ADR if it's
implicitly obvious) before writing code, don't guess silently.

## Current state — read this first every session

Updated at the end of each session so a new session (or a new
contributor) has zero ambiguity about what's real vs. planned. If you
make a meaningful change, update this before ending your turn.

**Done:**
- Guardrail automation: 7 static checks (`npm run check:all`), a
  browser canary, pre-commit hook, CI against real Postgres+pgvector.
- Tenant isolation (RLS, ADR 0003), model gateway + tool registry + chat
  loop, widget CORS + botKey resolution, Shopify connect flow.
- Console: bot list, bot detail/edit (draft/publish), integrations page.
- Console auth: email + password (ADR 0006, superseding ADR 0004's
  Google OAuth) — `/login` and `/signup` have a real design pass
  (`docs/design/preview/auth.html`, `components/auth/AuthShell.tsx`).
- Design-system practice: `docs/design/preview/`, `docs/design/
  principles.md` (the sharp, opinionated bar — component reuse, tokens,
  depth/polish, plain language, register mapping), a shared-component
  barrel (`components/ui/index.ts`), naming/import/review conventions
  (`docs/conventions.md`, now including a "Building a new feature"
  intake process: requirement → design → data/security → current-
  practice check → build → verify → ship checklist). `/bots` and the
  bot editor implemented and approved (`docs/design/preview/
  bots-list.html`, `bot-editor.html`) — icon avatars, relative
  timestamps, real hover/shadow depth (Card now ships `shadow-sm` by
  default, Button has a tactile active-press state), sidebar nav icons.
- Render deployment prep (ADR 0005).
- Product management docs: `docs/roadmap.md` (Now/Next/Later),
  `docs/features.md` (built vs. planned catalog), `docs/security.md`,
  `docs/accessibility.md` — informed by competitor research on Gorgias,
  Intercom Fin, and Drift/Tidio (`docs/research/competitive-
  landscape.md`), on top of the existing Zipchat research.
- Design tokens finalized (ADR 0007): primary color, a six-step type
  scale, verified contrast (caught and fixed one real dark-mode
  contrast bug in the process).
- `docs/research/current-practices.md` — a living reference checked
  before adopting any new technical pattern, not a one-time snapshot.
- Ongoing system hardening: `scripts/predev-check.mjs` (runs
  automatically before `npm run dev`, on whoever's machine runs it —
  catches a placeholder `DATABASE_URL`, Postgres not running, or a
  corrupted Prisma client install before the dev server even starts),
  `orgId` indexes added to every RLS-scoped table (was previously
  unindexed on all of them), `ship-checklist` skill updated to match
  the current 7 guardrail checks and the docs that now need checking,
  Zod validation on `/login` and `/signup` (`lib/schemas/auth.ts` —
  surfaced and fixed a real bug in the process: failed form submits were
  clearing the email field too, not just the password), Dependabot
  (`.github/dependabot.yml`, weekly npm + Actions updates), rate
  limiting on both public widget routes (`lib/rateLimit.ts`, in-memory —
  correct for Render's single-instance deployment, see `docs/
  security.md` for the multi-instance caveat), a toast system (Sonner,
  `components/ui/toaster.tsx`, close button always shown) wired into the
  bot editor's save/publish (previously silent either way — surfaced
  and fixed a real server/client serialization bug in the process), and
  error boundaries (`app/error.tsx`, `app/global-error.tsx`) with
  plain-language messages, verified against a real thrown error, and a
  component library beyond Button/Input/Badge — `Textarea`, `Label`,
  `Checkbox`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/
  `CardContent` — wired into a real screen (the bot editor now uses
  Card-per-section, matching `docs/design/preview/bot-editor.html`),
  not added speculatively.
- `tests/e2e/` — a persistent Playwright regression suite (11 specs:
  auth flows, bot-editor save/publish/toasts, the error boundary),
  replacing the prior pattern of writing a throwaway verification
  script and deleting it after one run. Wired into `ci.yml` after the
  canary. Closes the biggest gap from the 2026-09-25 "critique our
  setup" discussion — nothing previously re-checked these flows on a
  later change.
- Design system now an exact copy of CARE's (`ohcnetwork/care_fe` +
  `ohcnetwork/careui`), not our own palette — ADR 0008, superseding
  ADR 0007's violet accent. Every real Tailwind color value (emerald
  primary, neutral scale, red/amber/violet semantics, indigo ring)
  computed from `tailwindcss/colors`, not guessed. Full CARE token set
  now defined in `app/globals.css`/`tailwind.config.ts` (background/
  card/popover/secondary/sidebar-* tiers, not just the 8 we had),
  radius `0.625rem`, Figtree font (`next/font/google`). Every existing
  screen re-themed automatically — no component edits needed, since
  nothing used raw colors. Verified with a real headless-browser run
  against a production build (computed `--accent` and font both
  confirmed live) and a screenshot. `docs/design/preview/*.html`
  mockups updated to match.
- Design polish: subtle CSS-keyframe float/drift animation on the
  `/login`+`/signup` hero panel's two decorative circles
  (`prefers-reduced-motion` respected).

- 18 real CARE primitives pulled and committed permanently —
  `Dialog`, `AlertDialog`, `Tabs`, `Table`, `DropdownMenu`, `Popover`,
  `Tooltip`, `Select`, `Separator`, `Avatar`, `Skeleton`, `Sidebar`,
  `Alert`, `Switch`, `RadioGroup`, `Sheet`, `ScrollArea`, and `Button`
  itself replaced with CARE's real one (ours only had 4 variants/2
  sizes; theirs has 8 variants incl. `secondary`/`tertiary`/`link`/
  `destructive-solid` and icon-square sizes the pulled Dialog/Sheet/
  Sidebar all depend on). One-time pull — not re-fetched on every use;
  these are now ours to maintain, same as any other file in the repo.
  Added `@base-ui/react@^1.8.0` (real version checked via `npm view`,
  matches what `careui` itself pins) and a `primary` numbered emerald
  scale + `primary`/`primary-foreground` DEFAULT pair to
  `tailwind.config.ts` (CARE's components reference both the numbered
  steps and the bare semantic pair — missing the DEFAULT silently
  broke the Log In button's fill, caught by an actual screenshot, not
  by `tsc`). `check-design-tokens.mjs` now exempts verbatim-pulled
  files (marked by their `@type registry:` header) from the raw-color
  guardrail — CARE's real design vocabulary uses numbered Tailwind
  scale steps directly for hover/active shades, not just single
  semantic tokens; hand-authored app code still must use a token.
  Verified: full guardrail suite, `tsc`, production build, and all 11
  `tests/e2e/` specs (unchanged, still passing) against the real
  swapped-in Button — not just a visual check.
- `scripts/pull-care-component.mjs` itself: one-line command for
  anything still needed later, not a manual research pass each time
  (verified against a real component before the batch pull above).
  `components.json` registers the `careui` registry too, but the
  shadcn CLI itself can't actually fetch from it — its `{name}`
  URL-substitution only replaces the first occurrence (verified in
  the CLI's own bundle), and CARE serves each item at a path needing
  the name twice (`registry/care-ui/<name>/<name>.json`). Our script
  reads the same JSON directly instead, sidestepping that CLI
  limitation — and also
  the fact that this cloud session's egress policy blocks
  `careui.ohc.network` outright (`--from <local-checkout>` covers
  that case; live `fetch()` is the path for any environment with real
  network access — a contributor's machine, CI, etc.).
  `docs/conventions.md`'s "Building a new feature" step 2 points here
  before anyone hand-builds a primitive we don't have.
- Bot editor rebuilt on CARE's real record-editing *shape*, not just its
  components — the user's explicit correction that the design-consistency
  goal was page composition, not component swapping. Landed as a new,
  documented principle (`docs/design/principles.md` #10: persistent top
  bar with Save/Publish always visible + real `Tabs` instead of stacked
  `Card`s + a `Dialog` confirmation before anything that changes what's
  live) so every future multi-section record-editing screen follows the
  same shape instead of a fresh layout decision each time.
  `BotEditorForm.tsx` rewritten accordingly; `page.tsx` is now a thin
  data-fetch shell. Caught and fixed a real upstream bug in the process:
  CARE's own pulled `components/ui/tabs.tsx` used bare
  `data-horizontal:`/`data-vertical:` Tailwind classes, but Base UI's
  Tabs only ever sets a valued `data-orientation="horizontal"|"vertical"`
  attribute, never that bare boolean one — confirmed via compiled CSS
  output and Base UI's own source, not guessed — so the tabs rendered as
  an unstyled vertical stack. Patched to `data-[orientation=...]:`
  bracket syntax (documented as a correctness-fix exception to "never
  hand-edit a pulled file," which is for style preference, not bugs).
  Also caught a false-positive E2E assertion in the process (the old
  publish test's `getByText("Published")` was matching the pre-existing
  "Never published" badge, so it never actually verified a publish
  happened) and fixed three stale violet (`#7c3aed`, pre-ADR-0008)
  color defaults found opportunistically in `lib/ai/botConfig.ts`,
  `app/(console)/bots/[botId]/actions.ts`, and `public/widget.js` — all
  now `#065f46` matching the real `--accent`. Verified: `tests/e2e/`
  rewritten for the new Tabs+Dialog structure (publish now requires
  confirming in the dialog, a new Cancel-leaves-unpublished test, the
  tools checkbox test switches tabs first) and all specs pass; a new
  `tests/visual/` spec for the publish dialog, baselines regenerated and
  confirmed stable across two clean re-runs; `docs/design/preview/
  bot-editor.html` rebuilt to match (Persona/Tools/Appearance tab scenes
  plus the publish-dialog scene, embed snippet now inside the Appearance
  tab instead of a separate section).
- **CARE component policy reversed (ADR 0010): reference only, no more
  verbatim source pulls.** The 3 silent bugs above (Sidebar's dead v4
  class, Button's missing DEFAULT token, Tabs' dead `data-horizontal:`)
  share one root cause: Tailwind classes/CSS vars/`data-*` selectors are
  invisible to `tsc`/the build/every guardrail — a class that never
  matches anything just silently no-ops, so verbatim-copying CARE's
  source meant silently inheriting every assumption its authors made
  about *their* exact Base UI/Tailwind versions, unchecked by anything
  automated. User's explicit decision: use CARE's real screens as a
  visual/behavioral reference only from here on — hand-author the JSX/
  Tailwind against our own already-verified tokens (`app/globals.css`)
  and `@base-ui/react`'s real primitives for behavior, don't copy its
  className strings verbatim. `scripts/pull-care-component.mjs` stays in
  the repo (still useful for `--from <local-checkout>` reference-reading)
  but is no longer the default path — `docs/conventions.md`'s "Building
  a new feature" step 2 updated accordingly. Does **not** reverse ADR
  0008 — CARE is still the exact visual target, tokens/colors/radius/
  font unchanged; only the *mechanism* for matching new UI to it changes.
  Whether to retroactively rewrite the 18 already-pulled primitives is
  a separate, undecided question — see `docs/open-questions.md` #5.
- **Bot editor depth/polish pass (principles.md #5/#9)** — user pushed
  back that the design system was "very basic," not Linear/Notion/
  Stripe-caliber, after comparing our actual bot editor screenshot
  against a real CARE reference. Root cause: the token/primitive
  *infrastructure* was done (ADR 0008), but no screen had actually
  executed the *technique* layer `docs/research/design-system-
  standards.md` already researched (deliberate depth/shadow, real
  hover/active states, a considered layout instead of accidental
  whitespace) — principle 9 already named this exact failure mode.
  Scoped to one screen first (user's explicit choice) before touching
  any other: `BotEditorForm.tsx`'s Persona/Guardrails/Tools/Appearance
  tab content now sits inside a real `Card` (border + shadow + its own
  `CardTitle`) instead of bare text floating on the page background,
  and the column is `mx-auto`-centered instead of pinned to the left
  edge with dead canvas to the right. `Input`/`Textarea`/`Checkbox`
  (our own hand-rolled primitives, not CARE pulls) given `shadow-xs` +
  a `hover:border-strong-border` transition to match `Button`'s
  existing polish tier. Caught a real, separate bug while verifying the
  new hover state for real (not just screenshotting it): a bare
  unlayered `* { border-color: hsl(var(--border)); }` in
  `app/globals.css` was silently winning over *every* `hover:border-*`
  utility in the app — including `Button`'s pre-existing `secondary`/
  `ghost`/`destructive` hover-border variants — because Tailwind v4
  puts utilities (hover variants included) in `@layer utilities`, which
  CSS cascade layers always rank below any unlayered rule regardless of
  specificity. Confirmed via `getComputedStyle` before/after a real
  `page.hover()`, not a screenshot (a screenshot wouldn't have shown a
  1-shade border color change either way). Fixed by moving that rule
  into `@layer base` alongside the official Tailwind-v4-codemod border
  shim already there. Verified: guardrails, `tsc`, build, all 14
  `tests/e2e/` specs unchanged, all 7 `tests/visual/` specs (6 baselines
  regenerated — the shadow/hover addition is a real, correct visual
  diff — confirmed stable across two clean re-runs), and the hover fix
  itself re-verified for real post-fix (`getComputedStyle` genuinely
  changes on hover now). `docs/design/preview/bot-editor.html` updated
  to match (Card-wrapped scenes). Sidebar's near-empty look was
  diagnosed separately as *not* a component bug (the real CARE
  `Sidebar` is correctly wired) — it only has one nav item because the
  product only has one console section today; a user/org identity
  footer (matching CARE's avatar+name pattern) is real, small, deferred
  scope, not yet built.
- **CARE dropped as visual reference entirely — ADR 0011.** User still
  found the bot editor "very basic," and pushed on why: `care_fe`'s
  GitHub repo is component *source code*, not a design artifact —
  reading TSX/Tailwind tells us nothing about what a designer decided
  on density/hierarchy/polish for a real finished screen. Tried to fix
  this properly (get real screenshots/live access to CARE's actual
  product via `WebSearch`/`WebFetch`) and every avenue failed for
  environment reasons, not CARE-specific ones: CARE's whole domain
  family blocked, GitHub's own image CDNs blocked, confirmed
  non-CARE-specific by testing `linear.app` and `en.wikipedia.org`
  (also blocked), and the Playwright MCP browser is separately broken
  here (Chromium needs `--no-sandbox` as root; MCP config can't
  hot-reload mid-session). User's decision: stop referencing CARE's
  product at all, build from documented real knowledge of Linear/
  Notion/Stripe instead (the actual bar per principles.md #9 and
  `docs/research/design-system-standards.md`) — refines ADR 0010, does
  not reverse it (still no verbatim source pulls); ADR 0008's tokens/
  colors are unaffected. First application: `components/ui/card.tsx`
  retuned — `bg-soft-background` as a calm recessed panel (not a plain
  white box with only a border), white `Input`/`Textarea` fields
  popping inside it, bigger `CardTitle` for real hierarchy, more
  generous padding (`p-6`, `space-y-4`) — drawn from documented Notion/
  Stripe conventions, not CARE's code. `docs/conventions.md`'s
  "Building a new feature" step 2 updated to point at Linear/Notion/
  Stripe conventions instead of "check CARE." Verified: guardrails,
  `tsc`, build, all 14 `tests/e2e/` specs, all 7 `tests/visual/` specs
  (only `bot-editor.png` actually changed — confirms the Input/Textarea
  `bg-background` change was a correct no-op on white-background
  screens — stable across two re-runs).
- **Knowledge base ingestion (manual Q&A) — closes the biggest actual
  product gap, not a design task.** `search_knowledge_base` already did
  a real pgvector similarity search; nothing anywhere ever wrote a row
  into `KnowledgeSource`/`KnowledgeChunk`, so a published bot had zero
  knowledge to answer from. `lib/ai/knowledgeBase.ts` (list/create/
  delete, one source+chunk per Q&A pair, embeds question+answer
  together) and `/bots/[botId]/knowledge` (`KnowledgeForm.tsx` — a real
  CARE `Table` list + an `Add Q&A` `Dialog`, an `AlertDialog` delete
  confirmation, reachable from the bot editor's top bar next to
  Integrations). `searchKnowledgeBaseTool` now restates the question
  alongside the answer for a `qa`-kind chunk instead of returning a
  bare answer. Two real bugs caught by actually running it, not
  trusting types: (1) exporting a plain object (the idle `useActionState`
  seed) from a `"use server"` file 500'd every page render — Next.js
  only allows async function exports there; fixed by moving the
  constant into the client component, same as `BotEditorForm.tsx`
  already does. (2) The same "failed submit silently wipes the form"
  bug already fixed once on `/login` — `useActionState`'s `<form>`
  resets uncontrolled fields on any action completion regardless of
  success/failure; fixed by echoing `question`/`answer` back in the
  error state and re-seeding via `defaultValue`, confirmed via
  `inputValue()` before/after a real failed submit, not a screenshot.
  `VOYAGE_API_KEY` is a placeholder in this environment (same class of
  gap as the documented missing `ANTHROPIC_API_KEY`), so the real
  embeddings call itself has never been exercised here — everything up
  to that boundary (the raw-SQL pgvector write/read, RLS isolation
  specific to these two tables, the full list/add/delete UI flow) was
  verified for real against a real Postgres+pgvector instance and a
  real browser, with a directly-seeded entry standing in for a
  successful embed. `tests/unit/lib/ai/knowledgeBase.test.ts` +
  `tests/unit/lib/ai/tools/searchKnowledgeBase.test.ts` (9 new specs),
  `tests/e2e/knowledge.spec.ts` (4 specs covering what's reachable
  without a real key, including a regression test for bug (2)), a new
  `tests/visual/` spec (empty state + Add Q&A dialog), and
  `docs/design/preview/knowledge.html`. `docs/business-logic.md` has
  the full "Knowledge base ingestion" writeup including the
  verification note. File/URL ingestion is separate, larger,
  deliberately not-built scope — `docs/roadmap.md`/`docs/features.md`
  updated to reflect manual Q&A done, file upload still open.
- **Onboarding wizard + optional BYOA + real secrets encryption at rest
  (ADR 0012).** User asked for a self-serve setup flow and the ability
  to bring your own Claude API key, with a one-time-fee framing that
  surfaced a separate business-model question (deferred to `docs/
  open-questions.md`'s "Not yet asked" — billing/pricing stays
  explicitly undecided; only onboarding + BYOA were actually built).
  `Org.onboardedAt` (null until done) gates every `(console)` page —
  `app/(console)/layout.tsx` redirects to `/onboarding` (outside that
  route group, no redirect loop possible) until a brand-new account
  names its workspace and its first bot in one combined screen
  (`app/onboarding/`, `lib/onboarding.ts`) — no template picker (only
  one template exists) or teammate invites (separate, larger, no design
  done) in this pass. Completing onboarding lands straight in the new
  bot's editor, not an empty `/bots` list. Resolves `docs/open-
  questions.md` #5 (BYOA), previously deferred.

  BYOA: `Org.anthropicApiKeyEncrypted`, nullable, off by default,
  editable from a new `/settings` page (`app/(console)/settings/`) —
  an API key is billing-account-level, not per-bot, so it lives on
  `Org`. `lib/ai/gateway.ts`'s `getModelGateway()` takes an optional
  `apiKey`; `lib/ai/chat.ts` decrypts the org's key (if set) and passes
  it through — the Anthropic SDK falls back to its own env-var default
  otherwise. No interface-shape change, so tools/RAG/the chat loop
  don't know or care which key served a call. `/settings` never echoes
  the real key back once saved — only "a key is set" + a masked input
  + a Remove action.

  Encryption: while building BYOA, found `Integration.accessToken`
  (Shopify tokens) had stood with a literal "encryption mechanism TODO"
  comment, storing real OAuth tokens in plaintext — flagged this to the
  user rather than silently repeating the same shortcut for the new,
  more sensitive Anthropic key (direct billing exposure if leaked).
  User confirmed: build real encryption now, close both gaps in the
  same pass. `lib/crypto.ts` — AES-256-GCM via Node's built-in `crypto`,
  no new dependency, keyed by a new required `ENCRYPTION_KEY` env var
  (32 bytes, base64) — applied to both `Org.anthropicApiKeyEncrypted`
  and `Integration.accessToken`. Authenticated encryption: a tampered
  ciphertext fails to decrypt instead of silently returning garbage.

  Caught a real bug by actually running it, not trusting types: the
  exact same `"use server" can only export async functions` mistake as
  the knowledge feature (`settingsIdleState` exported from `actions.ts`
  500'd every render) — fixed the same way, constant moved into the
  client component.

  Verified: guardrails, `tsc`, a real Prisma migration applied against
  the actual dev Postgres (`prisma migrate diff` also wanted to drop
  `knowledge_chunks.embedding` — a column deliberately outside
  `schema.prisma` since Prisma can't declare `vector` natively — that
  part of the diff was hand-excluded from the migration file), RLS
  verification against the real new `orgs` columns, 9 new unit specs
  (`lib/crypto.ts` real AES round-trip + tamper/missing-key/wrong-length
  failure modes; `lib/ai/chat.ts`/`gateway.ts`'s BYOA key-threading),
  15 new `tests/e2e/` specs across `onboarding.spec.ts` and
  `settings.spec.ts` (all previously-passing specs across 5 files
  updated for the new post-signup redirect target — extracted a shared
  `tests/e2e/helpers.ts` in the process, since the same signup+bot-
  creation flow was duplicated in six places), a real save→reload→
  remove BYOA round-trip confirming the DB stores ciphertext (not the
  raw key) and the UI never re-renders it, 2 new `tests/visual/`
  baselines (onboarding, settings — org-name field masked, it's
  per-run-unique). `docs/design/preview/onboarding.html` and
  `settings.html` added; `docs/business-logic.md` has the full write-up
  (Onboarding, BYOA, and Secrets-encryption-at-rest sections);
  `docs/security.md`, `docs/features.md`, `docs/glossary.md`, README.md
  updated to match.

  **Known side effect, not a bug**: `bots/page.tsx`'s "No bots yet"
  empty state is now unreachable through any real user journey (a first
  bot always exists post-onboarding, no bot-delete feature exists) —
  left in place, cheap to keep, reachable again once deletion ships.
  `tests/e2e/bots-list.spec.ts`'s old empty-state test was removed with
  a comment explaining why, not silently deleted.
- **File/URL knowledge ingestion (ADR 0013) — closes the remaining MVP
  ingestion scope from `docs/product-spec.md`** ("file upload and/or
  manual Q&A at minimum for v1"; manual Q&A shipped separately). Real
  library choices checked via `npm view`/WebSearch first, captured in
  `docs/research/knowledge-ingestion-libraries.md`, not recalled: PDF
  via `pdf-parse` v2.4.5, DOCX via `mammoth` v1.12.3 (added at the
  user's explicit choice — the research note originally scoped only
  PDF/txt/md, DOCX was flagged unresearched), `.txt`/`.md` read
  directly, URL→readable-text via `jsdom` v30.1.1 +
  `@mozilla/readability` v0.6.0. `lib/ai/extraction.ts` (pure
  extraction + a basic SSRF guard on URL ingestion — literal-hostname
  check against localhost/private/link-local ranges, not DNS-resolution-
  based; documented as a partial guard in `docs/security.md`, not
  silently assumed complete) and `lib/ai/chunking.ts` (a hand-rolled
  recursive paragraph→sentence→hard-cutoff splitter, ~2000 chars/~10%
  overlap, grounded in 2026 RAG chunking benchmarks — no LangChain/
  LlamaIndex) are new, `lib/ai/knowledgeBase.ts` extended with
  `createFileEntry`/`createUrlEntry` and a generalized
  `listKnowledgeSources`/`deleteKnowledgeSource` (renamed from the
  qa-only `listQaEntries`/`deleteQaEntry` — the delete logic was never
  actually qa-specific, only its name was). Synchronous processing for
  v1, not a background job (user's explicit choice, given no job queue
  exists anywhere in this codebase yet) — bounded by `MAX_FILE_BYTES`
  (5MB) and `MAX_CHUNKS` (200) so a request can't run away; `next.
  config.js` raised `serverActions.bodySizeLimit` to `6mb` for headroom.
  Embeddings for a multi-chunk file/URL entry are computed *before*
  `withOrgContext`'s transaction opens, not inside it — sequentially
  embedding every chunk inside `prisma.$transaction` would hold that
  transaction (and its default timeout) open for as long as the
  provider takes across every chunk; `createQaEntry` already had this
  shape for its one chunk, this generalizes it. `KnowledgeIngestionError`
  distinguishes expected user-facing failures (bad file type, oversized
  upload, malformed/private URL, no extractable text, too many chunks —
  shown as-is in a toast) from unexpected ones (logged server-side,
  generic message), same "never surface a raw error" discipline as
  every other action in this codebase. UI: `KnowledgeForm.tsx`'s single
  "Add Q&A" button became a `DropdownMenu` (Add Q&A/Upload file/Add
  URL) with each dialog split into its own file (`AddQaDialog.tsx`,
  `AddFileDialog.tsx`, `AddUrlDialog.tsx`) and the list extracted to
  `KnowledgeTable.tsx` — kept `KnowledgeForm.tsx` under the file-length
  guardrail, caught for real by `check:filelength` failing at 313 lines
  before the split. Table generalized from Question/Answer columns to
  Title/Type/Chunks/Created, since a file/url source can have many
  chunks, not one fixed answer. `searchKnowledgeBaseTool` now names the
  source title for a file/url chunk (`From "<title>": ...`), matching
  the qa case's existing `Q: .../A: ...` restatement. Verified for
  real, not just type-checked: `pdf-parse` against a real hand-built
  minimal PDF, `mammoth` against a real bundled `.docx` fixture,
  `jsdom`+`@mozilla/readability` against real sample HTML (all three
  smoke-tested by hand before being committed to unit tests), a
  directly-seeded file/url source+chunk against a real Postgres+
  pgvector instance confirming the generalized list/delete and that
  `search_knowledge_base`'s raw query retrieves file/url chunks
  identically to qa chunks, a real browser upload of that same hand-
  built PDF through the full multipart→buffer→extraction server-action
  pipeline (correctly reaching the embeddings-call boundary, not
  erroring anywhere in extraction), and a real `localhost` URL rejected
  by the SSRF guard end-to-end through the browser. Full guardrail
  suite, `tsc`, 24 new/updated unit specs, `tests/e2e/knowledge.spec.ts`
  rewritten (9 specs, up from 4 — the new dropdown, both new dialogs,
  the real .txt upload, the real SSRF-guard rejection), and
  `tests/visual/`'s knowledge baselines regenerated and confirmed
  stable across two clean re-runs. `docs/adr/0013-file-url-knowledge-
  ingestion.md`, `docs/business-logic.md`, `docs/security.md`,
  `docs/features.md`, `docs/roadmap.md`, `docs/glossary.md`,
  `docs/design/preview/knowledge.html`/`README.md` all updated.
- **`docs/ai-tech-radar.md` created — a RAG-architecture maturity gap
  analysis, not yet built.** User asked what a "high-class,
  international-company-level" RAG product needs beyond what ADR
  0013 shipped; identified 8 real gaps (table/OCR-aware parsing,
  heading-aware cleaning/structuring, adaptive per-source chunking,
  parent-child/contextual retrieval, hybrid vector+full-text search,
  reranking, query rewriting, an eval harness) against the current
  pipeline. **Explicit user decision: document only, don't build yet**
  — phased into `docs/roadmap.md`'s Next (retrieval-quality upgrade:
  hybrid search + reranking + query rewriting — prioritized first since
  it improves every already-ingested chunk, no re-ingestion needed) and
  Later (ingestion-quality upgrade: adaptive chunking + parent-child +
  table/OCR parsing; eval harness — user's own call to adopt an
  open-source framework later rather than hand-roll one now). The radar
  itself is a new, separate living doc (distinct from whatever general-
  product tech radar exists outside this repo) tracking AI/RAG tech
  specifically via adopt/trial/assess/hold rings — registered in this
  file's "Where things live" list. Reranker vendor is the one concrete
  open decision recorded there: Voyage `rerank-2` (same vendor/key as
  `lib/ai/embeddings.ts`, lowest integration cost) vs. Cohere Rerank
  v3.5 (strongest standalone reranker in isolation, per general
  knowledge — not yet re-verified via WebSearch since no build is
  happening yet); whichever is picked, the plan is a `RerankProvider`
  interface matching `ModelGateway`/`EmbeddingsProvider`'s existing
  swap-the-provider pattern so switching vendors later stays a
  contained change.
- **"Self-serve configurability" roadmap pillar planned — not built.**
  User's explicit product bar: "a dumb person should be able to land on
  this, configure, and use it" — build Zipchat-caliber self-serve
  ecommerce first, then scale to other verticals (healthcare named
  explicitly). Investigated real current status (not assumed) before
  planning: confirmed no `/conversations` console route exists despite
  `Conversation`/`Message`/`ToolCallLog` all being written on every chat
  turn — corrected `docs/roadmap.md`'s "Now" bullet, which read like
  this was already built. Six pillars added to `docs/roadmap.md`'s new
  "Self-serve configurability" section, each with real status: tool
  enable/disable already built (bot editor Tools tab, nothing to do);
  appearance/theming editor a known gap, promoted from vague to explicit
  scope; conversation inbox + filters the single biggest concrete gap
  (data exists, zero UI); prompt/persona templates, nudges (a wholly new
  concept, not even in the schema — added to `docs/glossary.md`), and an
  LLM model picker + pricing display are new scope needing a decision
  before they're buildable. 3 new entries added to `docs/open-
  questions.md` (renumbered to #5/#6/#7 once ADR 0014 below resolved
  the old #5 — prompt-template scope, nudges scope/mechanism, model-
  picker pricing display) — none silently assumed. Also recorded the
  explicit healthcare-second-vertical sequencing in `docs/roadmap.md`'s
  Later section, blocked on open question #3 (regulated-vertical
  compliance posture) same as before. Docs-only — no code written this
  pass, matching the user's explicit "plan the roadmap" framing, not a
  build request.
- **Design system moved off CARE entirely: shadcn/ui's official
  registry + Claude Console's real layout — ADR 0014, supersedes ADR
  0008/0010/0011.** User supplied real screenshots of Claude Console
  (Dashboard, Skills pages) — resolves ADR 0011's exact unsolved problem
  (no real screenshots of a finished product to reference, only CARE's
  source code) with an actual finished product. Explicit user choices
  via `AskUserQuestion`: don't chase Anthropic's brand serif (shadcn's
  own defaults instead — a separate commercial product shouldn't copy
  another's exact brand assets); re-pull all 18 CARE primitives from
  shadcn's official registry over time (resolves the old open-questions
  #5, "leave CARE primitives as-is," which this decision overrides);
  new-screens-first rollout, not a blanket repaint. Investigated real
  constraints before building anything: `ui.shadcn.com`'s live registry
  API is denied by this session's egress policy (confirmed via
  `$HTTPS_PROXY/__agentproxy/status` — a genuine policy denial, not a
  target-server issue), but `raw.githubusercontent.com` is reachable and
  shadcn's actual new-york-v4 component source is checked into their
  repo as static files — fetched and verified for real (Button, Table,
  Card), confirming shadcn's official registry uses the unified
  `radix-ui` package (v1.6.7, checked via `npm view`), not `@base-ui/
  react` like CARE's fork. `scripts/pull-shadcn-component.mjs` built to
  fetch this real source (mirrors `scripts/pull-care-component.mjs`'s
  shape). **Caught and immediately fixed a real mistake while verifying
  it**: an early version of the script defaulted to writing straight
  into `components/ui/button.tsx` — the shared barrel every existing
  CARE-themed screen imports from — clobbering the live version before
  any rollout decision existed for that specific component; caught via
  `git status`/`git diff --stat` right after running it, reverted with
  `git checkout --` before anything was committed, and the script fixed
  to print to stdout by default with an explicit `--write` flag required
  to touch `components/ui/`. `docs/conventions.md`'s "Building a new
  feature" step 2 and `docs/architecture.md` §7 both updated to the new
  system (the latter also fixed a long-stale "tech stack still open"
  line that had never been updated through ADRs 0008 or 0010/0011).
  This pass was docs + a verified-but-not-yet-integrated tooling script
  only — the actual token rewrite followed in the next session (see the
  Done bullet immediately below).
- **Token layer actually rewritten to shadcn's neutral palette +
  `docs/design/design-system.md` written — ADR 0014's second half.**
  Unlike components (phased, new-screens-first), color/radius tokens
  are global CSS variables in `app/globals.css` — there's no way to
  phase them per-screen, confirmed and flagged to the user before
  touching anything: swapping the values re-themes every existing
  screen immediately, same blanket effect ADR 0007→0008's CARE swap
  had. Every value computed from the real, installed `tailwindcss/
  colors` package (neutral/red/amber/violet scales), not guessed — same
  discipline ADR 0008 used. Primary is now monochrome (near-black
  light/near-white dark), matching both shadcn's actual default *and*
  Claude Console's real screenshots (solid-black buttons, no colored
  chrome). Switched from CARE's HSL-triplet-in-a-`hsl(var(--x))`-
  wrapper convention to shadcn's own real convention (raw `oklch(...)`
  values assigned directly) — required to use real oklch values at
  all, and picked up dark-mode alpha-channel borders (`oklch(1 0 0 /
  10%)`) as a genuine capability upgrade the old HSL-triplet format
  couldn't express. Figtree (`next/font/google`, CARE's typeface)
  removed from `app/layout.tsx` entirely — shadcn's real default has no
  custom font, just the platform sans-serif stack; explicit user
  decision not to chase Anthropic's brand serif either.

  Caught two real bugs by actually building and checking this, not
  trusting types: (1) a CSS comment (`soft-*/strong-*/disabled...`)
  contained a literal `*/` mid-sentence, closing the comment early —
  Lightning CSS's minifier choked on the orphaned text as real CSS
  (`Unexpected token Delim('*')`), caught by a full clean rebuild
  (`rm -rf .next && npm run build`), invisible on a cached build. (2)
  `components/ui/sidebar.tsx` (a CARE-pulled file) had a raw
  `hsl(var(--sidebar-border))` inside an arbitrary-value Tailwind
  class — silently wrong the moment the underlying variable became a
  full oklch string instead of an HSL triplet (`hsl(oklch(...))` is
  invalid), invisible to `tsc`/the build, only found by grepping every
  real source file for `hsl(var(--` after the rewrite. Fixed to
  `var(--sidebar-border)` directly — the same class of pulled-file bug
  ADR 0010 was created to prevent, caught this time by being thorough
  rather than by luck.

  Verified for real, not just computed on paper: a real headless-
  browser check (`getComputedStyle` on `/login`) confirmed `--
  background`/`--foreground`/`--primary` resolve to the expected white/
  black/black, the submit button's actual rendered background is
  `oklch(0 0 0)`, zero console errors on reload. Contrast specifically:
  rendered each token to an actual `<canvas>` pixel (not hand-computed
  oklch math) and calculated real WCAG ratios — `muted-foreground`
  4.74:1, `soft-foreground` 7.81:1, both passing AA text contrast;
  `border`/`disabled-foreground` intentionally ~1.3–1.5:1, correct for
  non-text elements, matching shadcn's own real border value exactly.
  Full guardrail suite, `tsc`, all 82 unit tests, all 34 `tests/e2e/`
  specs unchanged and passing, all 9 `tests/visual/` baselines
  regenerated (every one changed, as expected — a real, deliberate
  diff) and confirmed stable across two clean re-runs.
  `docs/design/design-system.md` (new) consolidates every token value,
  its provenance, the component inventory, and what's still stale
  (`docs/design/preview/*.html`'s hardcoded colors — flagged as a known
  gap in `docs/design/README.md`, not silently ignored, since these are
  static reference mockups and nothing breaks, but they visibly drifted
  from what the app now renders). `docs/conventions.md` and this file
  updated to point at it.
- **`Sidebar` and `Table` migrated to shadcn's official registry source
  (ADR 0014) — first 2 of the 18 CARE-derived primitives.** Both fetched
  for real via `scripts/pull-shadcn-component.mjs` from
  `raw.githubusercontent.com` (not recalled/guessed), import paths
  adapted to this repo's aliases. A deliberate exception to strict
  new-screens-first phasing, at the user's direct request: both are
  shared shell components every existing console page already depends
  on, not a new screen — their public API surface (`SidebarProvider`,
  `Sidebar`, `SidebarHeader`/`Content`/`Footer`/`Group`/`GroupContent`/
  `Menu`/`MenuItem`/`MenuButton`, `SidebarInset`, `SidebarTrigger`,
  `Table`/`TableHeader`/`Body`/`Row`/`Head`/`Cell`) is unchanged, so
  every consumer (`AppSidebar.tsx`, `app/(console)/layout.tsx`,
  `BotsTable.tsx`) needed zero edits. New `radix-ui` dependency (v1.6.7,
  checked via `npm view`) — shadcn's official registry uses the unified
  `radix-ui` package, not CARE's `@base-ui/react`. `tsc` surfaced
  exactly one real incompatibility: shadcn's Sidebar passes
  `delayDuration={0}` to `TooltipProvider`, but Chatter's CARE-derived
  `tooltip.tsx` names the same prop `delay` — fixed with a one-line,
  documented change (kept Tooltip itself on its CARE-derived version
  rather than cascading the migration to it, Button, Sheet, Separator,
  and Skeleton, since this confirmed everything else was already
  structurally compatible). Table kept one deliberate deviation from
  the verbatim shadcn source: `TableHead`'s `bg-soft-background` tint
  (shadcn's own plain default has none) — matches Claude Console's real
  screenshots, which do show a tinted header row.

  Caught a real false-alarm regression while verifying: the first full
  `tests/e2e/` run after the migration showed every test past the first
  timing out at 30s, looking like a severe Sidebar bug. Root cause was
  a stale leftover `next-server` process still bound to port 3000,
  serving an old build's chunk manifest that no longer matched the
  freshly rebuilt `.next` output — confirmed via direct Playwright
  debugging (console/pageerror capture caught `ChunkLoadError`s and
  `400`s on `_next/static` assets) before touching any component code,
  then fixed by force-killing the stale process and starting a
  genuinely fresh server. Re-ran clean: all 34 `tests/e2e/` specs
  passed at normal speed (~20s). This recurred once more on the actual
  verification pass reported here (a second leftover `next-server`
  process was found and killed the same way) — a real, repeatable
  hazard of this environment, not a one-off; worth remembering that a
  30s-timeout wall on every test past the first means "stale server,"
  not "real regression."

  Verified: guardrails, `tsc`, a full clean rebuild (`rm -rf .next &&
  npm run build`), `npm run test:unit` (82 passed), all 34
  `tests/e2e/` specs (confirmed passing against a genuinely fresh
  server both times), real behavioral checks (sidebar collapse toggles
  `data-state`, `sidebar_state` cookie persists across reload, tooltip
  renders on hover of a collapsed nav icon confirming the `delay={0}`
  fix), and 7 `tests/visual/` baselines regenerated (exactly the
  console-shell-dependent ones — login/signup/onboarding correctly
  unchanged, since they're outside the console route group) and
  confirmed stable across two clean re-runs. `docs/design/design-
  system.md`'s component inventory updated to reflect these 2 as
  migrated, 16 still CARE-derived.
- **Conversation inbox built (ADR 0015) — closes the single biggest
  concrete gap from `docs/roadmap.md`'s "Self-serve configurability"
  pillar #5.** `Conversation`/`Message`/`ToolCallLog` were written on
  every chat turn since the chat loop first shipped but had no console
  UI to view them; `/conversations` (filterable list — bot, date range,
  handoff-triggered) and `/conversations/[conversationId]` (full
  message transcript with tool calls rendered inline, guardrail #6
  traceability actually surfaced in the UI) close it. Dashboard-only
  for v1 — resolved `docs/open-questions.md` #2 via a new ADR 0015
  rather than building it silently, since that question was
  specifically about this feature and had sat open; no email/Slack
  push channel in this pass, matching the question's own original
  recommendation. Deliberately did **not** add a `status`/"resolved"
  column — `docs/roadmap.md`'s "Resolution-rate analytics" already
  flagged that as needing a real product definition first, so ADR 0015
  left it open rather than quietly picking one while building the
  inbox (tracked as the new `docs/open-questions.md` #7). Handoff-
  triggered is derived, not stored: a conversation counts as
  handoff-triggered if any of its `ToolCallLog` rows' `output` contains
  `handoff_required` (the string every action tool already returns per
  guardrail #4) — computed at query time (`lib/conversations.ts`), no
  schema change or backfill needed. Added a `destructive` variant to
  the hand-authored `Badge` primitive (only had `default`/`muted`
  before) for the handoff indicator.

  Caught two real bugs by actually running it, not trusting types:
  (1) Base UI's `<Select.Value>` (first real usage anywhere in this
  app — the bot/date-range filters) can only resolve a selected item's
  label from an actually-mounted `<Select.Item>`, and its popup content
  unmounts while closed — without passing an `items` list to
  `Select.Root`, the trigger displayed the raw value (`"all"`) instead
  of its label (`"All bots"`) until first opened. Caught by an actual
  screenshot, fixed by passing `items`, re-verified by screenshot. (2)
  While writing the verification scripts themselves (not the app):
  `page.waitForLoadState("networkidle")` right after a Playwright click
  that triggers a Next.js client-side (soft) navigation is unreliable —
  it can resolve before the RSC transition completes, making a
  correctly-working row-click look like a dead click. Confirmed by
  direct `elementFromPoint` + timing diagnostics that the app's click
  handler and navigation were correct the whole time; the flaw was in
  the test script's own wait strategy. Documented in `tests/e2e/
  conversations.spec.ts`'s own specs (which use `expect(page).
  toHaveURL(...)` instead) so this doesn't get rediscovered later.

  Verified: guardrails, `tsc`, a clean rebuild, `npm run test:unit` (89
  passed — 7 new specs for the handoff-derivation logic, mocked at the
  `withOrgContext` boundary same as `lib/ai/chat.ts`'s existing tests),
  all 40 `tests/e2e/` specs (6 new — empty state, seeded-list rendering,
  the handoff-only filter, the bot filter, the detail transcript, and a
  real cross-org tenant-isolation check hitting another org's
  conversation id directly), and 2 new `tests/visual/` baselines
  (conversations list, conversation detail) plus the 5 existing
  console-shell-dependent baselines regenerated for the new sidebar nav
  item (an expected, correct diff — confirmed via the actual diff image
  before regenerating, not assumed) — all stable across two clean
  re-runs. Conversations can't be created through the console UI (only
  the widget chat API, which needs a real `ANTHROPIC_API_KEY`, a
  placeholder in this environment) — `tests/e2e/helpers.ts`'s new
  `seedConversations` writes directly via Prisma through the same
  `withOrgContext` + `BotPublicKey` bootstrap mechanism the app itself
  uses, standing in for a real chat turn, same pattern already
  established for the knowledge base's embeddings-call boundary.
  `docs/design/preview/conversations.html` (new, added to `docs/design/
  README.md`), `docs/business-logic.md`, `docs/features.md`,
  `docs/roadmap.md`, and `docs/adr/0015-conversation-inbox-dashboard-
  only.md` all added/updated; `docs/open-questions.md` #2 resolved and
  removed (remaining entries renumbered), a new #7 added for the
  deferred "resolved" status semantics.
- **Conversation inbox made genuinely non-technical (ADR 0016) —
  user's explicit framing: this screen is "logs for non-tech persons,"
  not a developer debugging view, and needs a general way to "filter
  conversations with issues."** The inbox as shipped under ADR 0015
  showed raw tool-call JSON and only recognized one specific tool's
  literal `handoff_required` string as an "issue" — missed
  `search_knowledge_base`'s own "nothing found" outcome entirely, and
  wasn't readable by a business owner who doesn't know what
  `handoff_required` means. Added an optional `describeForInbox(input,
  output)` method to the `Tool` interface (`lib/ai/tools/registry.ts`)
  — each tool decides, next to its own input/output shape, what a
  plain-language summary and an "issue" mean for itself (guardrail #2:
  the core engine never special-cases a specific tool). Implemented for
  both existing tools: `check_order_status` flags `handoff_required`
  *and* `not_found` (either way the visitor didn't get an answer, e.g.
  "Looked up order #1234 — no matching order found."); `search_
  knowledge_base` flags its own "nothing found" sentence (e.g.
  "Searched the knowledge base for \"shipping to Mars\" — nothing
  found."). A tool without `describeForInbox` gets a generic fallback
  (the exact ADR 0015 behavior), so this is additive, not breaking.
  Renamed the "Handoff" concept to **"Issue"** throughout — `hasIssue`,
  the `issuesOnly`/`issues=1` filter and URL param, the "Issue" badge,
  the table's "Issues" column, the "Has an issue" checkbox label — a
  plain-language umbrella a non-technical reviewer recognizes.
  `ConversationThread.tsx` now shows each tool call's plain-language
  summary as the primary, always-visible line; the raw tool name/input/
  output JSON stays real and available (guardrail #6 traceability) but
  moved behind a native `<details>` "Technical details" disclosure
  instead of being deleted, so an engineer debugging a bad answer can
  still get at it from the same page a business owner uses. Deliberately
  did **not** hide the raw data entirely or add a second "developer
  view" page — one page serves both audiences.

  Caught one real bug while writing this, not trusting types: the
  `handoff_required` reason string already ends in a period
  ("...connected for this bot yet."), so appending ". Handed off to a
  human." produced a double period — fixed by stripping the trailing
  period before interpolating, caught by actually reading the rendered
  summary in a real browser screenshot, not just running the unit test
  (whose fixture string happened not to end in one).

  Verified: guardrails, `tsc`, a clean rebuild, `npm run test:unit` (99
  passed — 12 new specs: a new `tests/unit/lib/ai/tools/
  checkOrderStatus.test.ts` file, `describeForInbox` cases added to
  `searchKnowledgeBase.test.ts`, and `conversations.test.ts` rewritten to
  exercise the real tool registry rather than a re-mocked stand-in,
  including a generic-fallback case for an unregistered tool name), all
  40 `tests/e2e/` specs (rewritten `conversations.spec.ts` — new
  copy/selectors, plus a check that the raw tool name is genuinely
  hidden until "Technical details" is expanded), and 2 regenerated
  `tests/visual/` baselines (conversations list, conversation detail —
  the only two that changed) stable across two clean re-runs. Manually
  seeded and screenshotted both tool types' issue cases (an order
  lookup handoff and a knowledge-base miss) in a real browser to
  confirm the plain-language copy actually reads well, not just that
  the boolean flag is correct. `docs/adr/0016-conversation-inbox-plain-
  language-issues.md` (new), `docs/architecture.md` §2 (documents the
  new optional `Tool.describeForInbox`), `docs/business-logic.md`,
  `docs/features.md`, `docs/design/preview/conversations.html`, and
  `docs/design/README.md` all updated.
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

**Known gaps:**
- 🔲 Design system tokens/infra and a real 18-component primitive layer
  are done — **all 18 now on shadcn's real official source, ADR 0017**
  (superseding the ADR 0008/CARE-pull mechanism entirely; see the Done
  bullet below). Bots list (real `Table`) and the bot editor (persistent
  top bar + `Tabs` + `Dialog`, principles.md #10) are rebuilt on these
  primitives, not just recolored. Still open: the integrations page,
  using the same primitives where they fit (and, going forward,
  principles.md #10's shape wherever it applies) — a design/layout gap,
  not a component-source gap anymore.
- 🔲 The depth/polish pass (principles.md #5/#9 — real Card boundaries,
  centered layout, hover/shadow states on Input/Textarea/Checkbox) is
  done on the bot editor only, by deliberate scope choice (one screen
  proven completely before spreading the pattern). login/signup, the
  bots list, and integrations haven't had this pass yet — apply the
  same recipe (Card-wrap floating content, `mx-auto` instead of
  pinned-left, check every interactive element's hover/focus/active
  state renders for real via `getComputedStyle`, not just a screenshot)
  when each is next touched. A sidebar user/org identity footer
  (avatar + name, matching CARE's own pattern) is separately unbuilt —
  not a bug, just not scoped yet.
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

## Where things live

- `docs/product-spec.md` — MVP scope and product decisions made so far
- `docs/glossary.md` — domain terms in plain language; add a term in the
  same PR that introduces it
- `docs/business-logic.md` — how the core flows actually work (draft/
  publish, the chat/tool-calling loop, tenant isolation in practice) —
  update in the same PR as the code it describes
- `docs/api.md` — every HTTP route, one place
- `docs/architecture.md` — system design, living doc, updated as decisions land
- `docs/roadmap.md` — Now/Next/Later feature priorities
- `docs/ai-tech-radar.md` — living adopt/trial/assess/hold tracker for
  AI/RAG-specific technology (models, retrieval, chunking/parsing,
  eval/ops) — separate from `docs/roadmap.md` (that's *what's next*;
  this is *what's true about our stack right now*) and from whatever
  general-product tech radar exists outside this repo.
- `docs/features.md` — every feature, one place, built vs. planned;
  update in the same PR as the code that ships or changes one
- `docs/security.md` — tenant isolation, auth, secrets, traceability,
  known gaps, in one reference instead of scattered across guardrails/ADRs
- `docs/accessibility.md` — the concrete rules for a genuinely usable
  interface (the "why" is in `docs/research/design-system-standards.md`)
- `docs/adr/` — Architecture Decision Records, one per significant,
  hard-to-reverse decision. Template at `docs/adr/template.md`.
- `docs/research/` — competitive and technical research notes
- `docs/research/current-practices.md` — a living reference, unlike the
  other research notes: checked (or updated) before introducing any new
  technical pattern, so a decision doesn't quietly rely on stale
  training-data memory of "how this is usually done."
- `docs/open-questions.md` — decisions not yet made; owner is the user
- `docs/conventions.md` — naming, shared-component import rule, file-size
  guidance, git workflow, and the review checklist.
- `tests/e2e/` — the persistent Playwright regression suite (`npm run
  test:e2e`), run in CI on every push. When you verify a browser flow
  by hand, it belongs here as a real spec, not a throwaway script
  deleted after one run.
- `docs/design/principles.md` — the sharp, opinionated design bar every
  screen is checked against (component reuse, tokens, depth/polish,
  plain language, the Linear/Notion/Stripe register mapping). Read this
  before `docs/design/preview/`.
- `docs/design/design-system.md` — the consolidated real reference:
  every current token value + its provenance, the component inventory
  and which source each primitive is actually on (shadcn-official vs.
  still-CARE-derived). Check this before hand-picking a color/spacing
  value or assuming a component's source. If it and `app/globals.css`
  ever disagree, the CSS is correct and this file is stale.
- `docs/design/preview/` — static HTML mockups, the visual ground truth
  for a page before it's built in code. **Before writing any new page or
  UI pattern, check this folder first.** If a preview exists, match it
  exactly. If none exists, follow the token/component rules in
  `docs/architecture.md` §7 and `app/globals.css`, then add a preview
  here after shipping — don't skip the visual pass just because no
  preview exists yet. See `docs/design/README.md`.

## Non-negotiable guardrails

These hold regardless of what stack or framework we end up on.

1. **Tenant isolation is sacred.** One business's knowledge base,
   conversations, config, or analytics must never leak into another
   business's bot context, retrieval results, logs, or dashboard — no
   exceptions, no shortcuts for convenience or speed.
2. **No vertical-specific logic in the core engine.** Anything specific to
   ecommerce/healthcare/automotive/etc. goes through the template/config
   layer (see `docs/adr/0001-generic-base-with-vertical-templates.md`). If
   you find yourself writing `if industry == "healthcare"` in core code,
   stop — that belongs in a template, not the engine.
3. **Regulated verticals get explicit guardrail prompts, not vibes.**
   Healthcare/finance/legal templates must refuse diagnosis/legal/financial
   advice and say so plainly in their default system prompt. This is part
   of the template definition, not an afterthought bolted on later.
4. **Every action tool degrades gracefully.** If a business hasn't wired up
   a real integration (order lookup, booking system, inventory API, etc.),
   the tool falls back to "collect info, hand off to a human" — it never
   fails silently and never hallucinates an answer it can't back up.
5. **Secrets never ship to widget client code.** The embeddable widget only
   ever talks to our backend over its own API; it never holds a Claude API
   key, DB credential, or any other secret.
6. **Every AI answer is traceable.** Log what was retrieved and which tools
   were called for a given response, so debugging and trust don't rely on
   guesswork.

## Process rules

- Record every hard-to-reverse decision (data model shape, storage choice,
  auth model, multi-tenancy strategy, vendor choice) as an ADR using the
  `new-adr` skill and `docs/adr/template.md`.
- Capture non-trivial research (competitor analysis, library evaluation,
  architecture pattern comparison) in `docs/research/` using the
  `research-note` skill — it needs to survive context compaction and be
  usable by a future session, not just live in chat scrollback.
- Don't scaffold code for a component whose design is still listed in
  `docs/open-questions.md`. Resolve it or explicitly flag the assumption
  you're making first.
- The standard engineering rules already in the system prompt still apply
  in full (no speculative abstraction, no unnecessary error handling,
  minimal comments, etc.) — this file adds project-specific rules on top,
  it does not replace those.
- **Never commit code that hasn't actually been run.** `npx tsc --noEmit`
  catches TypeScript boundary mismatches; it does not catch a broken SQL
  migration, a stale dependency version, or whether RLS policies even got
  created — none of those are visible from reading code. This isn't
  theoretical: a real test run (README.md's "Verified by a real run")
  found three such bugs in already-committed code, including every RLS
  policy silently failing to create. `.github/workflows/ci.yml` now runs
  `scripts/verify-rls.mjs` and a full build against a real Postgres+
  pgvector instance on every push — but CI catching it after the fact is
  the backstop, not the plan. When touching a migration, the gateway, or
  anything RLS-adjacent, actually run it (or `scripts/verify-rls.mjs`)
  before committing, in the same pass, not as a separate later step.
- **Check real version numbers, don't recall them.** A dependency version
  pinned from training-data memory can be a full major version stale (this
  happened with `@anthropic-ai/sdk`, silently missing a GA feature already
  in use). Run `npm view <package> version` before pinning anything new.
- **Check current practice, don't recall it.** Same failure mode as
  above, applied to patterns instead of version numbers — see
  `docs/research/current-practices.md`.
- **When a new technical pattern needs a real choice** (a library, a
  tool, an approach with tradeoffs) — not something with one obviously
  correct answer — explain it to the user before asking: what it is in
  plain terms, why it's needed, and how other companies/projects
  typically do it. Then ask. Don't silently pick one, and don't ask
  without the explanation first.
