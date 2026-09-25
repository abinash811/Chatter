import { describe, it, expect, vi, afterEach } from "vitest";
import { cn, relativeTime } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
});

describe("relativeTime", () => {
  afterEach(() => vi.useRealTimers());

  it("shows 'just now' under a minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"))).toBe("just now");
  });

  it("shows minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:05:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"))).toBe("5m ago");
  });

  it("shows hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T03:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"))).toBe("3h ago");
  });

  it("shows days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-04T00:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"))).toBe("3d ago");
  });

  it("shows months", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"))).toBe("3mo ago");
  });

  it("shows years", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2028-01-01T00:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z"))).toBe("2y ago");
  });
});
