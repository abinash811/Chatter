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
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
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
  });
});
