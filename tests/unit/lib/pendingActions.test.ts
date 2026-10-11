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
  it("maps rows to the plain PendingActionRow shape, including the bot's name (ADR 0038)", async () => {
    findMany.mockResolvedValue([
      {
        id: "pa-1",
        botId: "bot-1",
        bot: { name: "Support Bot" },
        conversationId: "conv-1",
        toolName: "request_order_cancellation",
        input: { orderNumber: "1001" },
        status: "pending",
        result: null,
        createdAt: new Date("2026-09-28"),
      },
    ]);

    const rows = await listPendingActions("org-1");
    expect(findMany).toHaveBeenCalledWith({
      where: { botId: undefined },
      orderBy: { createdAt: "desc" },
      include: { bot: { select: { name: true } } },
    });
    expect(rows).toEqual([
      {
        id: "pa-1",
        botId: "bot-1",
        botName: "Support Bot",
        conversationId: "conv-1",
        toolName: "request_order_cancellation",
        input: { orderNumber: "1001" },
        status: "pending",
        result: null,
        createdAt: new Date("2026-09-28"),
      },
    ]);
  });

  it("passes an optional botId through as a filter", async () => {
    findMany.mockResolvedValue([]);
    await listPendingActions("org-1", "bot-1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { botId: "bot-1" } }),
    );
  });
});

describe("getPendingActionForExecution", () => {
  it("returns botId, toolName, and input an executor needs (ADR 0038 — no botId param anymore)", async () => {
    findUniqueOrThrow.mockResolvedValue({
      id: "pa-1",
      botId: "bot-1",
      toolName: "request_order_cancellation",
      input: { orderNumber: "1001" },
      status: "pending",
    });

    const result = await getPendingActionForExecution("org-1", "pa-1");
    expect(findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: "pa-1" } });
    expect(result).toEqual({
      botId: "bot-1",
      toolName: "request_order_cancellation",
      input: { orderNumber: "1001" },
    });
  });
});

describe("resolvePendingAction", () => {
  it("sets status, result, and resolvedAt together", async () => {
    await resolvePendingAction("org-1", "pa-1", "approved", "Cancellation submitted.");

    expect(update).toHaveBeenCalledWith({
      where: { id: "pa-1" },
      data: { status: "approved", result: "Cancellation submitted.", resolvedAt: expect.any(Date) },
    });
  });

  it("supports rejecting with no result text", async () => {
    await resolvePendingAction("org-1", "pa-1", "rejected", null);

    expect(update).toHaveBeenCalledWith({
      where: { id: "pa-1" },
      data: { status: "rejected", result: null, resolvedAt: expect.any(Date) },
    });
  });
});
