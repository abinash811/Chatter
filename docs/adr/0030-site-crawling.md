# ADR 0030: Real multi-page site crawling for Data sources

Status: accepted

Date: 2026-09-30

## Context

`docs/open-questions.md` #3 had been open since the original Data
sources rebuild (2026-09-29): today's "Website" ingestion (`lib/ai/
extraction.ts`'s `extractUrlText`) only pulls one page a business owner
gives it — real multi-page crawling (give it a homepage, it follows the
site and ingests everything) was explicitly deferred pending this
decision. Chatbase treats this as table stakes, not a premium feature
(confirmed from their real docs, `docs/research/competitive-
landscape.md`), so this was worth resolving rather than leaving
permanently open.

The real decision wasn't just "build it" — it was **build it ourselves
vs. use a hosted crawling API** (Firecrawl was the concrete option
discussed, a real product with a real npm SDK). This needed a recorded
decision because it's a genuine build-vs-buy tradeoff with a recurring-cost
dimension, not a one-time technical choice: a vendor's price scales with
how much the feature gets used, which means it scales with Chatter's own
success — a materially different cost shape than everything else in this
product's dependency list (Claude/Voyage keys are BYOA-capable and paid
directly by the business; a crawling vendor would not be, unless we also
built BYOA for it).

## Decision

**Build our own crawler**, not Firecrawl or an equivalent vendor,
scoped deliberately smaller than "match Firecrawl feature-for-feature":

- **Sitemap-first discovery**: check `robots.txt` for a `Sitemap:`
  directive, else try `/sitemap.xml` directly; fall back to following
  same-origin links from the start page (breadth-first, capped) only
  when no sitemap exists.
- **robots.txt is respected**, not just fetched — disallowed paths are
  never crawled, via `robots-parser` (RFC 9309-compliant per its own
  docs, checked via `npm view` not recalled).
- **Capped and synchronous**, matching every other ingestion path in
  this app (ADR 0013's precedent: hard limits instead of a background
  job) — a fixed max-pages cap per crawl, no scheduled auto-recrawl.
  Auto-refresh on a schedule is explicitly out of scope here: it needs
  real background-job infrastructure (nothing in this codebase runs
  outside a request today), which is its own decision, not something to
  bundle into "can it crawl more than one page."
- **Plain fetch + JSDOM + Readability only — no JS rendering in this
  pass.** Every other ingestion path already uses this exact extraction
  stack; a crawled page reuses it unchanged. A JS-rendered-site fallback
  (using Playwright, already in this repo but only as a **dev**
  dependency for tests) is a real, deliberate follow-up, not silently
  included here — promoting it to a production dependency bundles a full
  Chromium binary into what gets deployed, and interacts with the
  still-open app-compute-platform question (`docs/open-questions.md`
  #8). Sites that render their content client-side won't ingest
  correctly under this pass; flagged honestly, not silently dropped.
- **Behind a swappable interface**, matching this codebase's existing
  discipline for exactly this situation (`ModelGateway`,
  `IntegrationProvider` — bot-engine rule #1): a single function,
  `crawlSite(startUrl, options) -> {url, title, text}[]`, is all the
  knowledge-base ingestion pipeline calls. If a vendor (Firecrawl or
  otherwise) is ever worth it — because JS-rendering coverage or crawl
  robustness becomes a real, frequent customer problem, not a
  hypothetical one — swapping the implementation behind that one
  function is a contained change, not a rewrite of the console UI,
  storage, or chunking/embedding pipeline.

## Alternatives considered

- **Firecrawl (or an equivalent hosted crawling API)** — real product,
  handles JS rendering and crawl robustness out of the box, faster to
  ship. Rejected for now: its cost scales with Chatter's own usage (a
  recurring bill tied to product success, unlike BYOA-capable Claude/
  Voyage costs a business pays directly), and Chatter isn't at a scale
  where the long tail of crawling edge cases (bot-blocking, malformed
  HTML, pagination quirks) is worth paying to have already solved — the
  swappable-interface design keeps this a real option to revisit later,
  not a door closed.
- **Include a Playwright JS-rendering fallback now** — would close the
  single biggest gap in the hand-rolled approach (client-rendered
  sites), but promotes a dev-only dependency to production, adds real
  deploy weight (a bundled Chromium binary), and makes a computing-
  platform assumption (needs a host that can run a real browser) before
  `docs/open-questions.md` #8 is even answered. Deferred as a named
  follow-up, not bundled in.
- **Scheduled auto-recrawl in the same pass** — matches Chatbase's
  weekly auto-refresh, but needs real background-job infrastructure
  that doesn't exist anywhere in this codebase yet. Out of scope here
  deliberately — see Consequences.

## Consequences

Businesses with plain server-rendered sites (the common case for SMB
marketing sites) get real multi-page ingestion today, at zero new
recurring cost. Businesses with heavily JS-rendered sites (a React/Vue
SPA with no server-rendered content) will see a crawl that finds pages
but extracts little or no readable text from them — a real, known gap,
not a silent one; worth a plain-language warning in the console UI when
extracted text looks suspiciously short. No scheduled refresh exists —
a business must re-click "Crawl" to pick up new content, same
limitation single-page URL ingestion already has today, just at a
larger scale.

This is not hard to reverse: the swappable-interface design is the
whole point — adding a JS-rendering fallback, or swapping to a vendor
entirely, later touches one internal module, not the console UI, the
`KnowledgeSource`/`KnowledgeChunk` schema, or the chunking/embedding
pipeline. What *is* a real, separate decision whenever it comes up:
background-job infrastructure for scheduled auto-refresh — this ADR
deliberately doesn't start that clock.
