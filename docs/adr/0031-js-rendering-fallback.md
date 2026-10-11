# ADR 0031: Self-hosted JS-rendering fallback for URL/crawl ingestion

Status: accepted

Date: 2026-10-02

## Context

ADR 0030 deliberately shipped multi-page crawling without a JS-rendering
fallback: `extractUrlText` (`lib/ai/extraction.ts`) only ever reads a
page's plain-fetched HTML, so a client-rendered site (a React/Vue SPA
whose real content only exists after its own JavaScript runs) crawls
successfully but extracts little or no readable text — a named, honest
gap, not a silent one.

The user asked to close this gap now, and asked specifically about the
build-vs-rent tradeoff for it: run our own headless browser (promoting
`playwright`, already a devDependency for this repo's e2e tests, to a
real production dependency) vs. renting one from a vendor (a hosted
headless-browser service like Browserless/Browserbase, or a full
scraping vendor like Firecrawl, which ADR 0030 already evaluated and
passed on for the crawling piece as a whole). This needed its own
decision rather than silently reusing ADR 0030's call, because "render
JavaScript" has a cost shape neither Claude/Voyage (BYOA, paid directly
by the business) nor our own hand-rolled crawler (near-zero marginal
cost) share: running a real browser is measurably heavier per page
(real CPU/memory, multi-second latency) than a plain `fetch()`, and a
rented version of it has the same usage-scales-with-our-own-success
cost shape ADR 0030 already rejected for the crawler itself.

## Decision

**Self-host it first; keep renting (Browserless or Firecrawl) as an
explicit, cheap-to-reach fallback plan if self-hosting proves difficult
in practice** — the user's own framing, and consistent with ADR 0030's
"build ourselves, stay swappable" call on the adjacent decision.

Concretely:

- `playwright` moves from `devDependencies` to `dependencies` —
  previously used only by this repo's own `tests/e2e/` suite, now also
  imported by production code (`lib/ai/extraction.ts`).
- `extractUrlText` tries the existing plain `fetch` + Readability
  extraction first, unchanged. **Only when that yields suspiciously
  little text** (under 150 characters — comfortably below any real
  article, but above what an empty JS-framework shell like
  `<div id="root"></div>` renders as plain HTML) does it retry by
  launching a real headless Chromium, letting the page's own JavaScript
  run (`waitUntil: "networkidle"`), and re-running the exact same
  Readability extraction against the rendered DOM.
- This is a **retry, not a default** — the large majority of real
  business sites are plain server-rendered HTML and never touch the
  browser-launch path at all, keeping the common case exactly as fast
  and cheap as before this change.
- `lib/ai/crawler.ts` needed **no changes** — it already calls
  `extractUrlText` per page unchanged, so every crawled page gets this
  fallback automatically, for free.
- A failed render (browser launch fails, navigation times out) degrades
  to the same plain-language `KnowledgeIngestionError` as today — never
  a raw error, never a hang past a 15-second render timeout.

## Alternatives considered

- **Rent a headless-browser-as-a-service now (Browserless/Browserbase)**
  — avoids running Chromium on our own compute entirely, usage-based
  pricing. Passed on for the same reason ADR 0030 passed on Firecrawl
  for the whole crawl: it's a cost that scales with our own product's
  usage, and we're not yet at a scale where that tradeoff is worth
  making before trying the free, self-hosted path first. Deliberately
  kept as the named fallback plan, not ruled out — if running our own
  browser becomes a real operational headache (deploy-target
  constraints, memory pressure under load), this is the documented next
  move, and it requires no code change beyond `renderWithBrowser`'s
  internals, same swappable-interface discipline as `crawlSite()`.
- **Firecrawl for the whole crawl, closing this gap and ADR 0030's at
  once** — already rejected in ADR 0030 on cost-shape grounds; revisiting
  it here for the same reason doesn't change that answer.
- **Render every page by default, not just as a fallback** — simpler
  code (no two-pass logic), but would make every single-page URL add
  and every crawled page pay the multi-second, heavier-compute browser
  cost even for the common plain-HTML case. Rejected: the two-pass
  "plain fetch first, render only if it looks empty" shape keeps the
  fast path fast.

## Consequences

Sites that render their real content via client-side JavaScript now
ingest correctly, closing ADR 0030's named gap, at no new recurring
vendor cost. The real cost moved from "a vendor's bill" to "our own
server's compute": a production deploy now needs a real Chromium
binary available (`npx playwright install chromium` or equivalent) and
enough memory/CPU headroom to run it under load — a genuine new
constraint on whichever app-compute target `docs/open-questions.md` #8
eventually settles on, not a free addition. This environment's sandbox
Chromium path (`/opt/pw-browsers/chromium`, already used by
`playwright.config.ts`) was reused here too, verified by a real smoke
test (a local JS-only page, rendered for real, confirming Chromium
genuinely launches and executes JavaScript outside the Playwright test
runner, not just inside it).

This is not hard to reverse: `renderWithBrowser` is one internal
function inside `extraction.ts`, not spread across the codebase —
swapping its internals for a rented Browserless/Firecrawl call later
touches that one function, same contained-change shape ADR 0030 already
established for `crawlSite()` itself.
