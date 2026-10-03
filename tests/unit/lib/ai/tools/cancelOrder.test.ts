import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, createPendingAction } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  createPendingAction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ integration: { findUnique } })),
}));
vi.mock("@/lib/crypto", () => ({ decrypt: vi.fn((s: string) => `decrypted:${s}`) }));
vi.mock("@/lib/pendingActions", () => ({ createPendingAction }));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { requestOrderCancellationTool, executeOrderCancellation } from "@/lib/ai/tools/cancelOrder";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("request_order_cancellation tool — handle()", () => {
  it("hands off (guardrail #4) when no Shopify integration is connected, without queuing anything", async () => {
    findUnique.mockResolvedValue(null);
    const result = await requestOrderCancellationTool.handle("org-1", "bot-1", { orderNumber: "1001" }, "conv-1");
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("returns not_found for a nonexistent order", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) });
    const result = await requestOrderCancellationTool.handle("org-1", "bot-1", { orderNumber: "1001" }, "conv-1");
    expect(JSON.parse(result)).toMatchObject({ status: "not_found" });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("returns already_cancelled without queuing a duplicate request", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [{ id: 1, cancelled_at: "2026-09-01T00:00:00Z" }] }),
    });
    const result = await requestOrderCancellationTool.handle("org-1", "bot-1", { orderNumber: "1001" }, "conv-1");
    expect(JSON.parse(result)).toMatchObject({ status: "already_cancelled" });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("queues a PendingAction and tells the visitor a human will review it — never that it's done", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [{ id: 1, cancelled_at: null }] }) });

    const result = await requestOrderCancellationTool.handle(
      "org-1",
      "bot-1",
      { orderNumber: "1001", reason: "changed my mind" },
      "conv-1",
    );

    expect(createPendingAction).toHaveBeenCalledWith("org-1", "bot-1", "conv-1", "request_order_cancellation", {
      orderNumber: "1001",
      reason: "changed my mind",
    });
    const parsed = JSON.parse(result);
    expect(parsed.status).toBe("pending_approval");
    // Must say a human will review it, never claim the order is already
    // cancelled — that's the whole point of ADR 0023's approval gate.
    expect(parsed.message).toMatch(/review/i);
    expect(parsed.message).not.toMatch(/has been cancelled|is cancelled|order cancelled/i);
  });
});

describe("request_order_cancellation tool — describeForInbox", () => {
  it("pending_approval always counts as an issue — a human still has to act", () => {
    const { summary, isIssue } = requestOrderCancellationTool.describeForInbox!(
      { orderNumber: "1001" },
      JSON.stringify({ status: "pending_approval", orderNumber: "1001" }),
    );
    expect(summary).toContain("waiting on approval");
    expect(isIssue).toBe(true);
  });
});

describe("executeOrderCancellation — the approved-execution step", () => {
  it("fails cleanly if no Shopify integration is connected", async () => {
    findUnique.mockResolvedValue(null);
    const result = await executeOrderCancellation("org-1", "bot-1", { orderNumber: "1001" });
    expect(result).toMatchObject({ status: "failed" });
  });

  it("fails if the order can no longer be found (e.g. deleted since the request was queued)", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) });
    const result = await executeOrderCancellation("org-1", "bot-1", { orderNumber: "1001" });
    expect(result).toMatchObject({ status: "failed" });
  });

  it("calls Shopify's orderCancel GraphQL mutation with the resolved order GID and succeeds", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ orders: [{ id: 555, cancelled_at: null }] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { orderCancel: { orderCancelUserErrors: [] } } }),
      });

    const result = await executeOrderCancellation("org-1", "bot-1", { orderNumber: "1001" });

    expect(result.status).toBe("executed");
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/graphql.json");
    const body = JSON.parse(init.body);
    expect(body.variables.orderId).toBe("gid://shopify/Order/555");
  });

  it("fails and surfaces Shopify's own userErrors, not a generic message", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ orders: [{ id: 555, cancelled_at: null }] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { orderCancel: { orderCancelUserErrors: [{ field: "orderId", message: "Order already fulfilled" }] } },
        }),
      });

    const result = await executeOrderCancellation("org-1", "bot-1", { orderNumber: "1001" });
    expect(result).toEqual({ status: "failed", detail: "Order already fulfilled" });
  });
});
