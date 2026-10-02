import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile } from "fs/promises";
import path from "path";
import { detectFileKind, extractFileText, extractUrlText } from "@/lib/ai/extraction";

// pdf-parse/mammoth/jsdom+@mozilla/readability run for real here (no
// module mocking) — each was already smoke-tested by hand against a
// real minimal PDF, a real bundled mammoth fixture, and real sample
// HTML before this file was written (CLAUDE.md's "never commit code
// that hasn't actually been run"). Only global `fetch` is mocked, for
// extractUrlText's happy/error paths — the SSRF guard and HTML parsing
// underneath it are real.
//
// `playwright` (ADR 0031's JS-rendering fallback) is mocked too — a
// real chromium.launch() here would make these "unit" tests actually
// launch a browser and hit the live network on every "no content"
// case, which is exactly the hermeticity bug this mock exists to avoid
// (caught for real: the first version of this fallback had no mock, and
// the existing "no extractable article content" test below silently
// started making a real network call to example.com). Defaults to
// "no browser available" (`launch` rejects) so every pre-existing test
// below that doesn't care about rendering keeps its original,
// plain-fetch-only behavior unchanged.
const launchChromium = vi.fn();
vi.mock("playwright", () => ({
  chromium: { launch: (...args: unknown[]) => launchChromium(...args) },
}));

// ADR 0032's Firecrawl last-resort fallback — mocked for the same
// hermeticity reason as `playwright` above, plus `FIRECRAWL_API_KEY` is
// explicitly cleared in beforeEach rather than relying on it being unset
// in whatever environment runs these tests (a real key present locally
// would otherwise make `scrapeWithFirecrawl` skip its own "not
// configured" short-circuit and actually call out to the mock — still
// hermetic either way here, but explicit beats incidental).
// A real `function`, not an arrow function — `new Firecrawl(...)` in
// extraction.ts requires a constructible mock (the same lesson
// crawler.test.ts's Sitemapper mock already learned the hard way: an
// arrow-function mockImplementation silently isn't `new`-able, and
// vitest only warns rather than failing loud).
const firecrawlScrape = vi.fn();
vi.mock("firecrawl", () => ({
  Firecrawl: vi.fn().mockImplementation(function MockFirecrawl() {
    return { scrape: (...args: unknown[]) => firecrawlScrape(...args) };
  }),
}));

describe("detectFileKind", () => {
  it("detects pdf by mimetype or extension", () => {
    expect(detectFileKind("doc.pdf", "application/octet-stream")).toBe("pdf");
    expect(detectFileKind("doc.bin", "application/pdf")).toBe("pdf");
  });

  it("detects docx by mimetype or extension", () => {
    expect(detectFileKind("doc.docx", "application/octet-stream")).toBe("docx");
    expect(
      detectFileKind("doc.bin", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe("docx");
  });

  it("detects txt/md as text", () => {
    expect(detectFileKind("notes.txt", "application/octet-stream")).toBe("text");
    expect(detectFileKind("notes.md", "application/octet-stream")).toBe("text");
    expect(detectFileKind("notes.bin", "text/plain")).toBe("text");
  });

  it("returns null for an unsupported type", () => {
    expect(detectFileKind("image.png", "image/png")).toBeNull();
  });
});

describe("extractFileText", () => {
  it("extracts text from a real minimal PDF", async () => {
    // Hand-built minimal single-page PDF (pdf.js recovers a missing xref
    // table) — verified by hand to actually parse before this test was
    // written, not assumed.
    const pdf = [
      "%PDF-1.4",
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 200 200] /Contents 5 0 R >>\nendobj",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
      "5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 10 100 Td (Hello PDF) Tj ET\nendstream\nendobj",
      "trailer\n<< /Size 6 /Root 1 0 R >>",
      "%%EOF",
    ].join("\n");
    const buffer = Buffer.from(pdf, "latin1");

    const text = await extractFileText("doc.pdf", "application/pdf", buffer);

    expect(text).toContain("Hello PDF");
  });

  it("extracts text from a real docx fixture", async () => {
    const buffer = await readFile(
      path.join(process.cwd(), "node_modules/mammoth/test/test-data/simple-list.docx"),
    );

    const text = await extractFileText("list.docx", "application/octet-stream", buffer);

    expect(text).toContain("Apple");
    expect(text).toContain("Banana");
  });

  it("reads a .txt/.md file directly as utf8, no library involved", async () => {
    const text = await extractFileText("notes.txt", "text/plain", Buffer.from("Store hours: 9-5.", "utf8"));
    expect(text).toBe("Store hours: 9-5.");
  });

  it("throws a plain-language error for an unsupported file type", async () => {
    await expect(extractFileText("image.png", "image/png", Buffer.from(""))).rejects.toThrow(/unsupported file/i);
  });
});

describe("extractUrlText", () => {
  const originalFetch = global.fetch;
  const originalFirecrawlKey = process.env.FIRECRAWL_API_KEY;
  beforeEach(() => {
    global.fetch = vi.fn();
    launchChromium.mockReset().mockRejectedValue(new Error("no browser available in this test"));
    firecrawlScrape.mockReset();
    delete process.env.FIRECRAWL_API_KEY;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalFirecrawlKey === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = originalFirecrawlKey;
  });

  it("rejects a malformed URL before ever fetching", async () => {
    await expect(extractUrlText("not a url")).rejects.toThrow(/doesn't look like a valid url/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) protocol", async () => {
    await expect(extractUrlText("ftp://example.com/file")).rejects.toThrow(/http:\/\/ and https:\/\//i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(["http://localhost/admin", "http://127.0.0.1/", "http://192.168.1.1/", "http://169.254.169.254/latest"])(
    "rejects a private/local address (%s) — basic SSRF guard",
    async (url) => {
      await expect(extractUrlText(url)).rejects.toThrow(/private or local address/i);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("fetches a public URL, builds a DOM, and returns the Readability-extracted article", async () => {
    const html = `<!doctype html><html><head><title>Return Policy</title></head><body>
      <nav>Home</nav>
      <article><h1>Returns</h1><p>You can return any item within 30 days of delivery for a full refund, as long as it is unused and in its original packaging with all tags attached.</p></article>
      <footer>Copyright</footer>
    </body></html>`;
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: new Map(),
      text: async () => html,
    } as unknown as Response);

    const result = await extractUrlText("https://example.com/returns");

    expect(result.title).toBe("Return Policy");
    expect(result.text).toContain("return any item within 30 days");
  });

  it("throws a plain-language error on a non-2xx response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404, headers: new Map() });
    await expect(extractUrlText("https://example.com/missing")).rejects.toThrow(/status 404/);
  });

  it("throws when the page has no extractable article content", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: new Map(),
      text: async () => "<html><body></body></html>",
    } as unknown as Response);
    await expect(extractUrlText("https://example.com/blank")).rejects.toThrow(/couldn't find readable/i);
    // No browser available in this test (the beforeEach default) — still
    // confirms the fallback was attempted, not skipped, before giving up.
    expect(launchChromium).toHaveBeenCalled();
  });

  // ADR 0031 — the fallback path, retrying with a real headless browser
  // when the plain fetch sees only a JS framework's empty shell.
  describe("JS-rendering fallback (ADR 0031)", () => {
    function mockBrowser(renderedHtml: string) {
      launchChromium.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          content: vi.fn().mockResolvedValue(renderedHtml),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      });
    }

    it("doesn't bother rendering when the plain fetch already found a real article", async () => {
      const html = `<html><head><title>Hours</title></head><body><article><p>${"We're open 9-5 every weekday, including holidays except Christmas and New Year's Day. ".repeat(3)}</p></article></body></html>`;
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: async () => html,
      } as unknown as Response);

      await extractUrlText("https://example.com/hours");

      expect(launchChromium).not.toHaveBeenCalled();
    });

    it("retries with a real headless browser when the plain fetch only sees a JS framework's empty shell, and uses the rendered content", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: async () => `<html><head><title>App</title></head><body><div id="root"></div></body></html>`,
      } as unknown as Response);
      mockBrowser(
        `<html><head><title>Pricing</title></head><body><article><p>${"Our Pro plan is $29 per month and includes unlimited projects and priority support. ".repeat(3)}</p></article></body></html>`,
      );

      const result = await extractUrlText("https://example.com/pricing");

      expect(launchChromium).toHaveBeenCalled();
      expect(result.title).toBe("Pricing");
      expect(result.text).toContain("Pro plan is $29 per month");
    });

    it("still throws the plain-language error when the rendered page has no real content either", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: async () => `<html><body><div id="root"></div></body></html>`,
      } as unknown as Response);
      mockBrowser(`<html><body><div id="root"></div></body></html>`);

      await expect(extractUrlText("https://example.com/still-empty")).rejects.toThrow(/couldn't find readable/i);
    });

    it("falls back gracefully (same plain-language error) when the browser itself fails to render the page", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: async () => `<html><body><div id="root"></div></body></html>`,
      } as unknown as Response);
      launchChromium.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockRejectedValue(new Error("navigation timeout")),
          content: vi.fn(),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      });

      await expect(extractUrlText("https://example.com/times-out")).rejects.toThrow(/couldn't find readable/i);
    });
  });

  // ADR 0032 — the Firecrawl last resort, only reached once both the
  // plain fetch and our own headless browser have already failed.
  describe("Firecrawl last-resort fallback (ADR 0032)", () => {
    function mockEmptyPageAndFailedRender() {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: async () => `<html><body><div id="root"></div></body></html>`,
      } as unknown as Response);
      // The beforeEach default already makes launchChromium reject (no
      // browser available), so the render fallback fails too — reaching
      // Firecrawl requires both earlier steps to have already failed.
    }

    it("is never attempted when FIRECRAWL_API_KEY isn't set (platform-funded, not a required dependency)", async () => {
      mockEmptyPageAndFailedRender();

      await expect(extractUrlText("https://example.com/blocked")).rejects.toThrow(/couldn't find readable/i);

      expect(firecrawlScrape).not.toHaveBeenCalled();
    });

    it("is used as the true last resort, with a stealth proxy, once both earlier steps have failed", async () => {
      process.env.FIRECRAWL_API_KEY = "fc-test-key";
      mockEmptyPageAndFailedRender();
      firecrawlScrape.mockResolvedValue({
        markdown: "# Pricing\n\nOur Pro plan is $29 per month and includes unlimited projects.",
        metadata: { title: "Pricing" },
      });

      const result = await extractUrlText("https://example.com/blocked");

      expect(result.title).toBe("Pricing");
      expect(result.text).toContain("Pro plan is $29 per month");
      expect(firecrawlScrape).toHaveBeenCalledWith(
        "https://example.com/blocked",
        expect.objectContaining({ proxy: "stealth", onlyMainContent: true }),
      );
    });

    it("isn't called at all when the headless browser already found real content", async () => {
      process.env.FIRECRAWL_API_KEY = "fc-test-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: async () => `<html><head><title>App</title></head><body><div id="root"></div></body></html>`,
      } as unknown as Response);
      launchChromium.mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          content: vi
            .fn()
            .mockResolvedValue(
              `<html><head><title>Pricing</title></head><body><article><p>${"Our Pro plan is $29 per month and includes unlimited projects and priority support. ".repeat(3)}</p></article></body></html>`,
            ),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      });

      await extractUrlText("https://example.com/pricing");

      expect(firecrawlScrape).not.toHaveBeenCalled();
    });

    it("still throws the plain-language error when Firecrawl also finds nothing useful", async () => {
      process.env.FIRECRAWL_API_KEY = "fc-test-key";
      mockEmptyPageAndFailedRender();
      firecrawlScrape.mockResolvedValue({ markdown: "", metadata: {} });

      await expect(extractUrlText("https://example.com/truly-blocked")).rejects.toThrow(/couldn't find readable/i);
    });

    it("degrades to the same plain-language error, not a raw one, when Firecrawl itself throws", async () => {
      process.env.FIRECRAWL_API_KEY = "fc-test-key";
      mockEmptyPageAndFailedRender();
      firecrawlScrape.mockRejectedValue(new Error("Firecrawl API error: 429 rate limited"));

      await expect(extractUrlText("https://example.com/rate-limited")).rejects.toThrow(/couldn't find readable/i);
    });
  });
});
