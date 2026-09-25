import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  afterEach(() => vi.useRealTimers());

  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("resets the window after it elapses", () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 1, 1_000)).toBe(true);
    expect(checkRateLimit(key, 1, 1_000)).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(checkRateLimit(key, 1, 1_000)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    expect(checkRateLimit(a, 1, 60_000)).toBe(true);
    expect(checkRateLimit(a, 1, 60_000)).toBe(false);
    expect(checkRateLimit(b, 1, 60_000)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("takes the first entry of a comma-separated x-forwarded-for chain", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' with no header", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
