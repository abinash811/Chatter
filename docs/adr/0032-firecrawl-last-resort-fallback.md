# ADR 0032: Firecrawl as a last-resort fallback for URL/crawl ingestion

Status: accepted

Date: 2026-10-02

## Context

ADR 0031 closed the common JS-rendering gap by self-hosting a headless
browser, but named its own limit honestly: a self-hosted, un-disguised
Chromium can still be stopped by a site actively trying to block
automated browsers (bot-detection, blocked data-center IPs) — a
different problem than "needs JavaScript to run." The user asked to add
Firecrawl back in to cover that remaining case, and specifically asked
whether doing so as a third step was actually buying anything over
skipping straight to Firecrawl once the plain fetch fails.

That question mattered because it's the same cost-shape issue ADR 0030
and ADR 0031 already turned on: Firecrawl bills per request, a cost
that scales with Chatter's own usage. Collapsing to two steps (plain
fetch, then Firecrawl for every JS-heavy page) would make Firecrawl the
*primary* handler for every client-rendered site a business owner
ingests — likely a meaningful share of real-world sites — turning a
rare safety net into a recurring, usage-scaled bill. Keeping the
self-hosted browser as the second step is what keeps Firecrawl's usage
low: it only runs for the narrower population of sites that *also*
defeat a plain headless browser, not every JS-rendered one.

## Decision

**Add Firecrawl as a third, last-resort step**, only reached when both
earlier steps have already failed to find real content:

1. Plain `fetch` + Readability (existing, ADR 0013) — handles the
   common case, free.
2. Self-hosted headless Chromium (ADR 0031) — handles JS-rendered
   pages, free (our own compute).
3. **Firecrawl** (`firecrawl` npm package, `app.scrape(url, { formats:
   ["markdown"], onlyMainContent: true, proxy: "stealth" })`) — handles
   the rare page that's also actively resisting automated access,
   where Firecrawl's stealth proxying and anti-detection work earn
   their cost. Reached in `extractUrlText` only when step 2's result is
   still under the same insufficient-text threshold ADR 0031 already
   defined.

**Platform-funded, not BYOA**: a single `FIRECRAWL_API_KEY` configured
by us, not something a business owner sets up — consistent with the
"rare safety net, not a primary path" framing; asking every business
owner to bring their own key for a fallback most will never trigger
would make the fallback practically unused. Degrades silently (skipped,
not an error) when the key isn't set, same pattern as every other
optional provider key in this codebase (`ANTHROPIC_API_KEY`,
`VOYAGE_API_KEY`).

A real, unrelated finding surfaced while installing the package: `npm
audit` flagged `firecrawl`'s pinned `axios@1.18.0` dependency as high
severity (several real CVEs, including an SSRF-relevant redirect-
handling bug). Pinned via `package.json`'s `overrides` field to
`axios@^1.20.0` (the first patched version, confirmed via `npm view`)
rather than accepting the vulnerable transitive dependency or ignoring
the audit finding.

## Alternatives considered

- **Skip the self-hosted browser, go straight from plain fetch to
  Firecrawl** — the exact alternative the user asked about directly.
  Rejected: this was the original mistake ADR 0030/0031 already
  decided against, just one layer deeper — it would make Firecrawl's
  bill scale with how many of our customers' sites are JS-rendered
  (likely a large, routine share of modern marketing sites), not with
  genuine hard-to-scrape edge cases.
- **Business owner brings their own Firecrawl key (BYOA)**, matching
  the Claude/Voyage pattern — zero cost to us, but most business
  owners won't configure a key for a fallback that may never trigger
  for their specific site, making the feature effectively dead in
  practice for the businesses who'd actually need it.
- **Skip Firecrawl entirely, leave the self-hosted browser as the final
  word** — simpler, zero vendor dependency, but leaves bot-blocked
  sites with no path to ingest at all beyond a business owner manually
  pasting text in instead (the text-snippet entry point already
  covers that as a manual escape hatch, but it's not automatic).
  Rejected because the user explicitly asked to close this gap now
  that the cost-shape concern was addressed by keeping it a true last
  resort.

## Consequences

Sites that specifically block automated browsers — the one case
neither the plain fetch nor our own Chromium can clear — now ingest
correctly too, with the Firecrawl cost scoped narrowly to that rare
case rather than every JS-rendered site. This is the second and final
layer of ADR 0030's originally-named gap; between ADR 0031 and this
ADR, URL and crawl ingestion now handles plain HTML, JS-rendered pages,
and bot-resistant pages, in that order of cost.

Real ongoing cost: whatever Firecrawl bills per scrape call, though
bounded by how rarely steps 1 and 2 both fail — expected to be low
relative to total ingestion volume, not measured yet against real
traffic (no live `FIRECRAWL_API_KEY` is configured in this
environment, same class of gap as the documented missing
`ANTHROPIC_API_KEY`/`VOYAGE_API_KEY`).

Not hard to reverse: `scrapeWithFirecrawl` is one function inside
`extraction.ts`, reached only from one call site. Removing it, or
swapping Firecrawl for the self-hosted Browserless option already
named in ADR 0031 as the fallback-to-the-fallback, touches that one
function, not the console UI, the crawler, or the chunking/embedding
pipeline.
