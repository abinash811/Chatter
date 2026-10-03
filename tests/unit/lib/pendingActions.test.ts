import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const findMany = vi.fn();
const findUniqueOrThrow = vi.fn();
const update = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({ pendingAction: { create, findMany, findUniqueOrThrow, update } }),
  ),
}));

import {
  createPendingAction,
  listPendingActions,
  getPendingActionForExecution,
  resolvePendingAction,
} from "@/lib/pendingActions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPendingAction", () => {
  it("writes a pending row with the tool's proposed input", async () => {
    create.mockResolvedValue({ id: "pa-1" });
    await createPendingAction("org-1", "bot-1", "conv-1", "request_order_cancellation", { orderNumber: "1001" });

    expect(create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        botId: "bot-1",
        conversationId: "conv-1",
        toolName: "request_order_cancellation",
        input: { orderNumber: "1001" },
      },
    });
  });
});

describe("listPendingActions", () => {
  it("maps rows to the plain PendingActionRow shape", async () => {
    findMany.mockResolvedValue([
      {
        id: "pa-1",
        conversationId: "conv-1",
        toolName: "request_order_cancellation",
        input: { orderNumber: "1001" },
        status: "pending",
        result: null,
        createdAt: new Date("2026-09-28"),
      },
    ]);

    const rows = await listPendingActions("org-1", "bot-1");
    expect(rows).toEqual([
      {
        id: "pa-1",
        conversationId: "conv-1",
        toolName: "request_order_cancellation",
        input: { orderNumber: "1001" },
        status: "pending",
        result: null,
        createdAt: new Date("2026-09-28"),
      },
    ]);
  });
});

describe("getPendingActionForExecution", () => {
  it("returns just the toolName and input an executor needs", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "pa-1",
      toolName: "request_order_cancellation",
      input: { orderNumber: "1001" },
      status: "pending",
    });

    const result = await getPendingActionForExecution("org-1", "bot-1", "pa-1");
    expect(result).toEqual({ toolName: "request_order_cancellation", input: { orderNumber: "1001" } });
  });
});

describe("resolvePendingAction", () => {
  it("sets status, result, and resolvedAt together", async () => {
    await resolvePendingAction("org-1", "bot-1", "pa-1", "approved", "Cancellation submitted.");

    expect(update).toHaveBeenCalledWith({
      where: { id: "pa-1", botId: "bot-1" },
      data: { status: "approved", result: "Cancellation submitted.", resolvedAt: expect.any(Date) },
    });
  });

  it("supports rejecting with no result text", async () => {
    await resolvePendingAction("org-1", "bot-1", "pa-1", "rejected", null);

    expect(update).toHaveBeenCalledWith({
      where: { id: "pa-1", botId: "bot-1" },
      data: { status: "rejected", result: null, resolvedAt: expect.any(Date) },
    });
  });
});
