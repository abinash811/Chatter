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

import { requestRefundTool, executeRefund } from "@/lib/ai/tools/requestRefund";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("request_refund tool — handle()", () => {
  it("hands off (guardrail #4) when no Shopify integration is connected, without queuing anything", async () => {
    findUnique.mockResolvedValue(null);
    const result = await requestRefundTool.handle("org-1", "bot-1", { orderNumber: "1001" }, "conv-1");
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("returns not_found for a nonexistent order", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) });
    const result = await requestRefundTool.handle("org-1", "bot-1", { orderNumber: "1001" }, "conv-1");
    expect(JSON.parse(result)).toMatchObject({ status: "not_found" });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("returns already_refunded without queuing a duplicate request", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [{ id: 1, financial_status: "refunded", total_price: "20.00" }] }),
    });
    const result = await requestRefundTool.handle("org-1", "bot-1", { orderNumber: "1001" }, "conv-1");
    expect(JSON.parse(result)).toMatchObject({ status: "already_refunded" });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("queues a PendingAction and tells the visitor a human will review it — never that it's done", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [{ id: 1, financial_status: "paid", total_price: "20.00" }] }),
    });

    const result = await requestRefundTool.handle(
      "org-1",
      "bot-1",
      { orderNumber: "1001", reason: "wrong size" },
      "conv-1",
    );

    expect(createPendingAction).toHaveBeenCalledWith("org-1", "bot-1", "conv-1", "request_refund", {
      orderNumber: "1001",
      reason: "wrong size",
    });
    const parsed = JSON.parse(result);
    expect(parsed.status).toBe("pending_approval");
    expect(parsed.message).toMatch(/review/i);
    expect(parsed.message).not.toMatch(/has been refunded|refund issued|refunded already/i);
  });
});

describe("request_refund tool — describeForInbox", () => {
  it("pending_approval always counts as an issue — a human still has to act", () => {
    const { summary, isIssue } = requestRefundTool.describeForInbox!(
      { orderNumber: "1001" },
      JSON.stringify({ status: "pending_approval", orderNumber: "1001" }),
    );
    expect(summary).toContain("waiting on approval");
    expect(isIssue).toBe(true);
  });
});

describe("executeRefund — the approved-execution step", () => {
  it("fails cleanly if no Shopify integration is connected", async () => {
    findUnique.mockResolvedValue(null);
    const result = await executeRefund("org-1", { orderNumber: "1001" });
    expect(result).toMatchObject({ status: "failed" });
  });

  it("fails if the order can no longer be found (e.g. deleted since the request was queued)", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) });
    const result = await executeRefund("org-1", { orderNumber: "1001" });
    expect(result).toMatchObject({ status: "failed" });
  });

  it("fails if the order has no completed payment transaction to refund through", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [{ id: 555, financial_status: "paid", total_price: "20.00" }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [] }) });

    const result = await executeRefund("org-1", { orderNumber: "1001" });
    expect(result).toMatchObject({ status: "failed" });
  });

  it("calls Shopify's refundCreate GraphQL mutation against the parent sale transaction and succeeds", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [{ id: 555, financial_status: "paid", total_price: "20.00" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [{ id: 999, kind: "sale", status: "success", gateway: "shopify_payments" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { refundCreate: { refund: { id: "gid://shopify/Refund/1" }, userErrors: [] } } }),
      });

    const result = await executeRefund("org-1", { orderNumber: "1001" });

    expect(result.status).toBe("executed");
    const [url, init] = fetchMock.mock.calls[2];
    expect(String(url)).toContain("/graphql.json");
    const body = JSON.parse(init.body);
    expect(body.variables.input.orderId).toBe("gid://shopify/Order/555");
    expect(body.variables.input.transactions[0].parentId).toBe("gid://shopify/OrderTransaction/999");
    expect(body.variables.input.transactions[0].amount).toBe("20.00");
  });

  it("fails and surfaces Shopify's own userErrors, not a generic message", async () => {
    findUnique.mockResolvedValue({ shopDomain: "store.myshopify.com", accessToken: "enc" });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [{ id: 555, financial_status: "paid", total_price: "20.00" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [{ id: 999, kind: "sale", status: "success", gateway: "shopify_payments" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { refundCreate: { refund: null, userErrors: [{ field: "amount", message: "Amount exceeds refundable total" }] } },
        }),
      });

    const result = await executeRefund("org-1", { orderNumber: "1001" });
    expect(result).toEqual({ status: "failed", detail: "Amount exceeds refundable total" });
  });
});
