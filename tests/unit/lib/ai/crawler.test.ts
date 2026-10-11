import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ADR 0030. robots-parser's own real parsing logic runs unmocked (it's
// pure string parsing, already smoke-tested by hand against real
// robots.txt content before this file was written) — only global fetch,
// Sitemapper, and extractUrlText (already unit-tested on its own) are
// mocked, same discipline as extraction.test.ts.

const sitemapFetch = vi.fn();
// A real `function`, not an arrow function — `new Sitemapper(...)` in
// crawler.ts requires a constructible mock, which an arrow-function
// mockImplementation silently isn't (vitest warns, then the `new` call
// throws and every sitemap-path test below would silently fall through
// to the link-following fallback instead — caught for real by checking
// which discovery path actually ran, not assumed).
vi.mock("sitemapper", () => ({
  default: vi.fn().mockImplementation(function MockSitemapper() {
    return { fetch: sitemapFetch };
  }),
}));

const extractUrlText = vi.fn();
vi.mock("@/lib/ai/extraction", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/extraction")>("@/lib/ai/extraction");
  return { ...actual, extractUrlText };
});

describe("crawlSite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockRobotsTxt(body: string, ok = true) {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (String(url).endsWith("/robots.txt")) {
        return Promise.resolve({ ok, text: async () => body } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
    });
  }

  it(
    "discovers pages via a sitemap referenced in robots.txt and extracts each",
    async () => {
      mockRobotsTxt("User-agent: *\nSitemap: https://example.com/sitemap.xml");
      sitemapFetch.mockResolvedValue({
        sites: ["https://example.com/a", "https://example.com/b", "https://example.com/c"],
      });
      extractUrlText.mockImplementation(async (url: string) => ({ title: url, text: `content of ${url}` }));

      const pages = await (await import("@/lib/ai/crawler")).crawlSite("https://example.com");

      expect(pages).toHaveLength(4); // start page + 3 sitemap URLs
      expect(pages.map((p) => p.url)).toContain("https://example.com/a");
      expect(extractUrlText).toHaveBeenCalledWith("https://example.com/a");
    },
    // Same real per-page courtesy delay as the MAX_CRAWL_PAGES test
    // below (crawler.ts's real `setTimeout`, not a mock) — 4 pages'
    // worth (~2s) plus test/import overhead was close enough to
    // vitest's 5000ms default to flake under parallel-worker load (a
    // real, confirmed flake, not a one-off — found independently twice).
    10_000,
  );

  it("falls back to /sitemap.xml when robots.txt lists no Sitemap directive", async () => {
    mockRobotsTxt("User-agent: *\nDisallow:");
    sitemapFetch.mockResolvedValue({ sites: ["https://example.com/page1"] });
    extractUrlText.mockResolvedValue({ title: "t", text: "some real content here" });

    const { crawlSite } = await import("@/lib/ai/crawler");
    await crawlSite("https://example.com");

    expect(sitemapFetch).toHaveBeenCalled();
  });

  it(
    "caps discovery at MAX_CRAWL_PAGES even when the sitemap has far more",
    async () => {
      mockRobotsTxt("Sitemap: https://example.com/sitemap.xml");
      const manyUrls = Array.from({ length: 500 }, (_, i) => `https://example.com/page-${i}`);
      sitemapFetch.mockResolvedValue({ sites: manyUrls });
      extractUrlText.mockResolvedValue({ title: "t", text: "some real content here" });

      const { crawlSite, MAX_CRAWL_PAGES } = await import("@/lib/ai/crawler");
      const pages = await crawlSite("https://example.com");

      expect(pages.length).toBeLessThanOrEqual(MAX_CRAWL_PAGES);
      expect(extractUrlText).toHaveBeenCalledTimes(pages.length);
    },
    // Real per-page courtesy delay (crawler.ts's DEFAULT_COURTESY_DELAY_MS)
    // means 20 pages legitimately takes ~10s here — not a hang.
    15_000,
  );

  it("filters out sitemap URLs from a different origin", async () => {
    mockRobotsTxt("Sitemap: https://example.com/sitemap.xml");
    sitemapFetch.mockResolvedValue({
      sites: ["https://example.com/ours", "https://evil.example/not-ours"],
    });
    extractUrlText.mockResolvedValue({ title: "t", text: "some real content here" });

    const { crawlSite } = await import("@/lib/ai/crawler");
    const pages = await crawlSite("https://example.com");

    expect(pages.every((p) => new URL(p.url).origin === "https://example.com")).toBe(true);
  });

  it("refuses to crawl when robots.txt disallows the homepage itself", async () => {
    mockRobotsTxt("User-agent: *\nDisallow: /");

    const { crawlSite } = await import("@/lib/ai/crawler");
    await expect(crawlSite("https://example.com")).rejects.toThrow(/robots\.txt disallows/i);
    expect(sitemapFetch).not.toHaveBeenCalled();
  });

  it("falls back to link-following when no sitemap exists, staying same-origin only", async () => {
    mockRobotsTxt("User-agent: *\nDisallow:"); // no Sitemap: directive
    sitemapFetch.mockRejectedValue(new Error("no sitemap"));
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      const u = String(url);
      if (u.endsWith("/robots.txt")) {
        return Promise.resolve({ ok: true, text: async () => "Disallow:" } as unknown as Response);
      }
      if (u === "https://example.com/") {
        return Promise.resolve({
          ok: true,
          headers: new Map([["content-type", "text/html"]]),
          text: async () =>
            `<html><body><a href="/about">About</a><a href="https://other.example/x">Off-site</a></body></html>`,
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        headers: new Map([["content-type", "text/html"]]),
        text: async () => `<html><body>no links</body></html>`,
      } as unknown as Response);
    });
    extractUrlText.mockResolvedValue({ title: "t", text: "some real content here" });

    const { crawlSite } = await import("@/lib/ai/crawler");
    const pages = await crawlSite("https://example.com");

    const urls = pages.map((p) => p.url);
    expect(urls).toContain("https://example.com/");
    expect(urls).toContain("https://example.com/about");
    expect(urls.some((u) => u.includes("other.example"))).toBe(false);
  });

  it("skips a page whose extraction fails, without aborting the rest of the crawl", async () => {
    mockRobotsTxt("Sitemap: https://example.com/sitemap.xml");
    sitemapFetch.mockResolvedValue({ sites: ["https://example.com/good"] });
    extractUrlText.mockImplementation(async (url: string) => {
      // assertPublicHttpUrl normalizes the bare origin to a trailing slash.
      if (url === "https://example.com/") throw new Error("fetch failed");
      return { title: "t", text: "real content" };
    });

    const { crawlSite } = await import("@/lib/ai/crawler");
    const pages = await crawlSite("https://example.com");

    expect(pages).toHaveLength(1);
    expect(pages[0].url).toBe("https://example.com/good");
  });

  it("throws a plain-language error when every page fails to extract", async () => {
    mockRobotsTxt("Sitemap: https://example.com/sitemap.xml");
    sitemapFetch.mockResolvedValue({ sites: [] });
    extractUrlText.mockRejectedValue(new Error("nope"));

    const { crawlSite } = await import("@/lib/ai/crawler");
    await expect(crawlSite("https://example.com")).rejects.toThrow(/couldn't extract readable content/i);
  });
});
