// File/URL -> plain text extraction for knowledge ingestion (ADR 0013).
// Pure extraction only — no DB, no embeddings, no chunking (that's
// lib/ai/chunking.ts + lib/ai/knowledgeBase.ts). Library choices per
// docs/research/knowledge-ingestion-libraries.md, versions checked via
// `npm view` at install time, not recalled.

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — see ADR 0013 (sync processing, v1)
const MAX_URL_RESPONSE_BYTES = 5 * 1024 * 1024;
const URL_FETCH_TIMEOUT_MS = 10_000;

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
function assertPublicHttpUrl(rawUrl: string): URL {
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
  const dom = new JSDOM(html, { url: url.toString() });
  const article = new Readability(dom.window.document).parse();
  if (!article || !article.textContent?.trim()) {
    throw new KnowledgeIngestionError("Couldn't find readable article content on that page.");
  }
  return { title: article.title?.trim() || url.toString(), text: article.textContent.trim() };
}
