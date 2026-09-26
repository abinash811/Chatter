import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ integration: { findUnique } })),
}));

vi.mock("@/lib/crypto", () => ({ decrypt: vi.fn((s: string) => `decrypted:${s}`) }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { checkOrderStatusTool } from "@/lib/ai/tools/checkOrderStatus";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("check_order_status tool", () => {
  it("hands off (guardrail #4) when no Shopify integration is connected", async () => {
    findUnique.mockResolvedValue(null);
    const result = await checkOrderStatusTool.handle("org-1", "bot-1", { orderNumber: "1234" });
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
  });

  it("hands off when the Shopify API call itself fails", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const result = await checkOrderStatusTool.handle("org-1", "bot-1", { orderNumber: "1234" });
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
  });

  it("returns not_found when the store has no matching order", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) });
    const result = await checkOrderStatusTool.handle("org-1", "bot-1", { orderNumber: "1234" });
    expect(JSON.parse(result)).toMatchObject({ status: "not_found" });
  });

  it("returns the found order", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [{ id: 1 }] }) });
    const result = await checkOrderStatusTool.handle("org-1", "bot-1", { orderNumber: "1234" });
    expect(JSON.parse(result)).toMatchObject({ status: "found" });
  });
});

// ADR 0016: the conversation inbox's plain-language summary + issue flag.
describe("check_order_status tool — describeForInbox", () => {
  it("found: a plain summary, not an issue", () => {
    const { summary, isIssue } = checkOrderStatusTool.describeForInbox!(
      { orderNumber: "ORD1234" },
      JSON.stringify({ status: "found", order: {} }),
    );
    expect(summary).toBe("Looked up order #ORD1234 — found it.");
    expect(isIssue).toBe(false);
  });

  it("not_found: still counts as an issue — the visitor didn't get an answer", () => {
    const { summary, isIssue } = checkOrderStatusTool.describeForInbox!(
      { orderNumber: "ORD1234" },
      JSON.stringify({ status: "not_found", orderNumber: "ORD1234" }),
    );
    expect(summary).toBe("Looked up order #ORD1234 — no matching order found.");
    expect(isIssue).toBe(true);
  });

  it("handoff_required: names the reason without a double period", () => {
    const { summary, isIssue } = checkOrderStatusTool.describeForInbox!(
      { orderNumber: "ORD1234" },
      JSON.stringify({ status: "handoff_required", reason: "No Shopify store connected for this bot yet." }),
    );
    expect(summary).toBe(
      "Tried to look up order #ORD1234 — No Shopify store connected for this bot yet. Handed off to a human.",
    );
    expect(isIssue).toBe(true);
  });
});
