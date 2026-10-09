// File/URL -> plain text extraction for knowledge ingestion (ADR 0013).
// Pure extraction only — no DB, no embeddings, no chunking (that's
// lib/ai/chunking.ts + lib/ai/knowledgeBase.ts). Library choices per
// docs/research/knowledge-ingestion-libraries.md, versions checked via
// `npm view` at install time, not recalled.

import { existsSync } from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { chromium } from "playwright";
import { Firecrawl } from "firecrawl";

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — see ADR 0013 (sync processing, v1)
const MAX_URL_RESPONSE_BYTES = 5 * 1024 * 1024;
const URL_FETCH_TIMEOUT_MS = 10_000;

// ADR 0031 — a plain fetch sees nothing on a JS-rendered page (its real
// content only exists after the page's own JavaScript runs), so a
// too-short Readability result is treated as a signal to retry with a
// real headless browser rather than a reason to give up. 150 chars is
// comfortably below any real article's length but above what an empty
// JS-shell page (`<div id="root"></div>`) typically renders as plain
// HTML, so it doesn't fire on short-but-real pages.
const MIN_TEXT_LENGTH_BEFORE_RENDER_FALLBACK = 150;
const BROWSER_RENDER_TIMEOUT_MS = 15_000;
const FIRECRAWL_TIMEOUT_MS = 20_000;
const CRAWLER_USER_AGENT = "ChatterBot/1.0 (+https://chatter.example/crawler)";

// Same sandbox-chromium override playwright.config.ts already uses for
// this specific environment; a normal deploy target needs its own
// `npx playwright install chromium` (or equivalent) since `playwright`
// doesn't ship browser binaries in the npm package itself — see ADR 0031.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";

async function renderWithBrowser(url: URL): Promise<string | null> {
  const browser = await chromium
    .launch(existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {})
    .catch(() => null);
  if (!browser) return null;

  try {
    const page = await browser.newPage({ userAgent: CRAWLER_USER_AGENT });
    await page.goto(url.toString(), { waitUntil: "networkidle", timeout: BROWSER_RENDER_TIMEOUT_MS });
    return await page.content();
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}

function extractArticle(html: string, url: URL) {
  const dom = new JSDOM(html, { url: url.toString() });
  return new Readability(dom.window.document).parse();
}

function hasInsufficientText(article: ReturnType<typeof extractArticle>): boolean {
  return !article?.textContent || article.textContent.trim().length < MIN_TEXT_LENGTH_BEFORE_RENDER_FALLBACK;
}

// ADR 0032 — the true last resort: only reached when the plain fetch
// AND our own headless browser (above) both failed to find real
// content, which narrows this to pages that are either actively
// blocking automated browsers or hit some other edge case our own
// Chromium can't clear — not "every JS-rendered page" (renderWithBrowser
// already handles the common JS case for free). Platform-funded, not
// BYOA — a business owner configures nothing; silently skipped (not an
// error) when FIRECRAWL_API_KEY isn't set, same placeholder-key
// degradation as every other optional provider in this codebase.
async function scrapeWithFirecrawl(url: URL): Promise<{ title: string; text: string } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  try {
    const app = new Firecrawl({ apiKey });
    const doc = await app.scrape(url.toString(), {
      formats: ["markdown"],
      onlyMainContent: true,
      proxy: "stealth",
      timeout: FIRECRAWL_TIMEOUT_MS,
    });
    const text = doc.markdown?.trim();
    if (!text) return null;
    return { title: doc.metadata?.title?.trim() || url.toString(), text };
  } catch {
    return null;
  }
}

// A known, expected failure (bad input) with a message safe to show the
// business owner as-is — as opposed to an unexpected one (a library
// throwing on a corrupt file, a network error), which
// app/(console)/bots/[botId]/knowledge/actions.ts logs server-side and
// shows a generic message for instead, same reasoning as every other
// action in this codebase never surfacing a raw error to the UI.
export class KnowledgeIngestionError extends Error {}

export type SupportedFileKind = "pdf" | "docx" | "text";

export function detectFileKind(filename: string, mimeType: string): SupportedFileKind | null {
  const lower = filename.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md") || mimeType.startsWith("text/")) return "text";
  return null;
}

export async function extractFileText(filename: string, mimeType: string, buffer: Buffer): Promise<string> {
  const kind = detectFileKind(filename, mimeType);
  if (kind === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (kind === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (kind === "text") {
    return buffer.toString("utf8");
  }
  throw new KnowledgeIngestionError(`Unsupported file type: ${filename}. Upload a PDF, DOCX, .txt, or .md file.`);
}

// Basic SSRF guard: this URL is fetched server-side on the business
// owner's behalf (not visitor-supplied — the console is behind auth),
// but a private/loopback/link-local target should still never be
// fetched from here. Deliberately not a complete guard — it checks the
// literal hostname, not the DNS-resolved IP, so it doesn't stop DNS
// rebinding or a malicious redirect to a private address; a full guard
// would need custom DNS resolution with the resolved IP pinned for the
// actual socket connection. Documented as a known gap (docs/security.md)
// rather than silently assumed complete.
export function assertPublicHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new KnowledgeIngestionError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new KnowledgeIngestionError("Only http:// and https:// URLs are supported.");
  }
  const hostname = url.hostname.toLowerCase();
  const isPrivate =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname);
  if (isPrivate) {
    throw new KnowledgeIngestionError("That URL points to a private or local address, which isn't supported.");
  }
  return url;
}

export async function extractUrlText(rawUrl: string): Promise<{ title: string; text: string }> {
  const url = assertPublicHttpUrl(rawUrl);

  const res = await fetch(url, { signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS) }).catch(() => {
    throw new KnowledgeIngestionError("Couldn't reach that URL. Check it's correct and publicly accessible.");
  });
  if (!res.ok) {
    throw new KnowledgeIngestionError(`That URL returned an error (status ${res.status}).`);
  }
  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_URL_RESPONSE_BYTES) {
    throw new KnowledgeIngestionError("That page is too large to ingest (over 5MB).");
  }

  const html = await res.text();
  let article = extractArticle(html, url);

  // ADR 0031 — the plain fetch above only ever sees a JS-rendered page's
  // pre-JavaScript HTML shell, which Readability correctly reads as
  // "no real content." Only retried here, not tried first, so the vast
  // majority of pages (which don't need it) stay on the fast, cheap path.
  if (hasInsufficientText(article)) {
    const renderedHtml = await renderWithBrowser(url);
    if (renderedHtml) {
      const renderedArticle = extractArticle(renderedHtml, url);
      if (!hasInsufficientText(renderedArticle)) {
        article = renderedArticle;
      }
    }
  }

  // ADR 0032 — our own browser still couldn't find real content, which
  // narrows this to the rare hard case (active bot-blocking, not just
  // "needs JS"). Firecrawl is never tried before this point.
  if (hasInsufficientText(article)) {
    const firecrawlResult = await scrapeWithFirecrawl(url);
    if (firecrawlResult) return firecrawlResult;
  }

  if (!article || !article.textContent?.trim()) {
    throw new KnowledgeIngestionError("Couldn't find readable article content on that page.");
  }
  return { title: article.title?.trim() || url.toString(), text: article.textContent.trim() };
}
