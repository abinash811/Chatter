// Real multi-page site crawling for Data sources (ADR 0030). Discovery
// only — sitemap-first, robots.txt-respecting, capped link-following
// fallback — then reuses extractUrlText (lib/ai/extraction.ts) per page
// unchanged, the exact same extraction every single-URL ingestion
// already uses. No JS rendering (ADR 0030's deliberate, named gap).
//
// Swappable by design (bot-engine rule #1's ModelGateway/
// IntegrationProvider precedent, applied here): crawlSite() is the only
// thing lib/ai/knowledgeBase.ts calls. A vendor (Firecrawl or
// otherwise) later means rewriting what's behind this one function, not
// the console UI, storage, or chunking/embedding pipeline.

import robotsParser from "robots-parser";
import Sitemapper from "sitemapper";
import { JSDOM } from "jsdom";
import { assertPublicHttpUrl, extractUrlText, KnowledgeIngestionError } from "@/lib/ai/extraction";

// A hard cap, not a suggestion — keeps a crawl finishing inside one
// synchronous request (ADR 0013's precedent: hard limits instead of a
// background job). 20 pages is generous for a small/medium marketing
// site's crawlable surface while staying well inside realistic request
// timeouts even with a courtesy delay between fetches.
export const MAX_CRAWL_PAGES = 20;

const ROBOTS_FETCH_TIMEOUT_MS = 10_000;
const SITEMAP_FETCH_TIMEOUT_MS = 10_000;
const LINK_DISCOVERY_FETCH_TIMEOUT_MS = 10_000;
// Politeness floor between requests to the same site when no explicit
// Crawl-delay is given — real crawlers wait between requests so a small
// business's own server never sees a burst; not enforced by any spec,
// just good manners, same reasoning as ADR 0013's SSRF guard being about
// not being a bad actor on someone else's infrastructure.
const DEFAULT_COURTESY_DELAY_MS = 500;
const USER_AGENT = "ChatterBot/1.0 (+https://chatter.example/crawler)";

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRobots(origin: string): Promise<ReturnType<typeof robotsParser>> {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(ROBOTS_FETCH_TIMEOUT_MS) });
    const body = res.ok ? await res.text() : "";
    return robotsParser(robotsUrl, body);
  } catch {
    // No robots.txt, or it timed out/errored — an empty ruleset allows
    // everything, matching how every real crawler treats a missing
    // robots.txt (guardrail #4's "degrade, don't fail" spirit, applied
    // to a non-AI piece of the engine).
    return robotsParser(robotsUrl, "");
  }
}

async function discoverViaSitemap(sitemapUrl: string, origin: string): Promise<string[]> {
  const sitemap = new Sitemapper({ timeout: SITEMAP_FETCH_TIMEOUT_MS });
  const { sites } = await sitemap.fetch(sitemapUrl);
  return sites.filter((url) => {
    try {
      return new URL(url).origin === origin;
    } catch {
      return false;
    }
  });
}

async function discoverLinksFromPage(pageUrl: string, origin: string): Promise<string[]> {
  const res = await fetch(pageUrl, {
    signal: AbortSignal.timeout(LINK_DISCOVERY_FETCH_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT },
  }).catch(() => null);
  if (!res || !res.ok) return [];
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) return [];

  const html = await res.text();
  const dom = new JSDOM(html, { url: pageUrl });
  const links = Array.from(dom.window.document.querySelectorAll("a[href]"))
    .map((a) => a.getAttribute("href"))
    .filter((href): href is string => !!href);

  const resolved = new Set<string>();
  for (const href of links) {
    try {
      const absolute = new URL(href, pageUrl);
      absolute.hash = "";
      if (absolute.origin === origin && (absolute.protocol === "http:" || absolute.protocol === "https:")) {
        resolved.add(absolute.toString());
      }
    } catch {
      // Not a valid URL (mailto:, javascript:, etc.) — skip.
    }
  }
  return Array.from(resolved);
}

// Discovers up to MAX_CRAWL_PAGES in-scope, robots.txt-allowed URLs
// starting from startUrl — sitemap first, breadth-first link-following
// as the fallback when no sitemap exists.
async function discoverUrls(startUrl: string): Promise<string[]> {
  const start = assertPublicHttpUrl(startUrl);
  const origin = start.origin;
  const robots = await fetchRobots(origin);

  const isAllowed = (url: string) => robots.isAllowed(url, USER_AGENT) !== false;
  const crawlDelayMs = (robots.getCrawlDelay(USER_AGENT) ?? DEFAULT_COURTESY_DELAY_MS / 1000) * 1000;

  if (!isAllowed(start.toString())) {
    throw new KnowledgeIngestionError("This site's robots.txt disallows crawling its homepage.");
  }

  const sitemapUrls = robots.getSitemaps();
  const candidateSitemaps = sitemapUrls.length > 0 ? sitemapUrls : [`${origin}/sitemap.xml`];

  for (const sitemapUrl of candidateSitemaps) {
    try {
      const discovered = await discoverViaSitemap(sitemapUrl, origin);
      if (discovered.length > 0) {
        return [start.toString(), ...discovered.filter((u) => u !== start.toString())]
          .filter(isAllowed)
          .slice(0, MAX_CRAWL_PAGES);
      }
    } catch {
      // No sitemap at this URL, or it failed to parse — try the next
      // candidate, then fall back to link-following below.
    }
  }

  // No usable sitemap — breadth-first link-following from the start
  // page, same-origin only, respecting robots.txt and a courtesy delay
  // between each page fetched purely for link discovery.
  const visited = new Set<string>();
  const queue: string[] = [start.toString()];
  const inScope: string[] = [];

  while (queue.length > 0 && inScope.length < MAX_CRAWL_PAGES) {
    const next = queue.shift()!;
    if (visited.has(next) || !isAllowed(next)) continue;
    visited.add(next);
    inScope.push(next);

    if (inScope.length >= MAX_CRAWL_PAGES) break;
    const links = await discoverLinksFromPage(next, origin);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }
    await sleep(crawlDelayMs);
  }

  return inScope;
}

// Crawls a site starting from startUrl and extracts readable content
// from every in-scope page — one bad page (a 404, a non-HTML response,
// no readable content) is skipped, not fatal to the whole crawl, same
// "degrade, don't fail the whole thing" spirit as every action tool's
// guardrail #4. Throws only when nothing could be crawled at all.
export async function crawlSite(startUrl: string): Promise<CrawledPage[]> {
  const urls = await discoverUrls(startUrl);
  if (urls.length === 0) {
    throw new KnowledgeIngestionError("Couldn't find any pages to crawl on that site.");
  }

  const pages: CrawledPage[] = [];
  for (const url of urls) {
    try {
      const { title, text } = await extractUrlText(url);
      pages.push({ url, title, text });
    } catch {
      // A single page failing (no readable content, fetch error) skips
      // that page rather than failing the whole crawl.
    }
    await sleep(DEFAULT_COURTESY_DELAY_MS);
  }

  if (pages.length === 0) {
    throw new KnowledgeIngestionError("Found pages on that site, but couldn't extract readable content from any of them.");
  }
  return pages;
}
