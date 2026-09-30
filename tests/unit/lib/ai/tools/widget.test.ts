import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WidgetForExecution } from "@/lib/widgets";

const { listEnabledWidgetsForExecution, getWidgetByNameForExecution, performActionRequest, createPendingAction } = vi.hoisted(() => ({
  listEnabledWidgetsForExecution: vi.fn(),
  getWidgetByNameForExecution: vi.fn(),
  performActionRequest: vi.fn(),
  createPendingAction: vi.fn(),
}));
vi.mock("@/lib/widgets", () => ({ listEnabledWidgetsForExecution, getWidgetByNameForExecution }));
vi.mock("@/lib/ai/tools/customAction", () => ({ performActionRequest }));
vi.mock("@/lib/pendingActions", () => ({ createPendingAction }));

import {
  buildWidgetTool,
  parseRenderWidgetPayload,
  getEnabledWidgetTools,
  executeWidgetSubmission,
} from "@/lib/ai/tools/widget";

function makeWidget(overrides: Partial<WidgetForExecution> = {}): WidgetForExecution {
  return {
    id: "widget-1",
    name: "booking_form",
    triggerDescription: "Show this once the visitor wants to book.",
    submitLabel: "Book now",
    schema: { type: "object", properties: { name: { type: "string", title: "Name" } }, required: [], additionalProperties: false },
    apiUrl: null,
    apiMethod: null,
    headers: {},
    writeCapable: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildWidgetTool", () => {
  it("names the tool render_widget_<name> and takes no input", () => {
    const tool = buildWidgetTool(makeWidget({ schema: { type: "object", properties: {}, required: [], additionalProperties: false } }));

    expect(tool.name).toBe("render_widget_booking_form");
    expect(tool.description).toBe("Show this once the visitor wants to book.");
    expect(tool.inputSchema).toEqual({ type: "object", properties: {}, required: [], additionalProperties: false });
  });

  it("handle() returns a tagged JSON payload carrying the widget's schema", async () => {
    const schema = { type: "object", properties: { name: { type: "string", title: "Name" } }, required: [], additionalProperties: false };
    const tool = buildWidgetTool(makeWidget({ schema }));

    const output = await tool.handle("org-1", "bot-1", {});
    expect(JSON.parse(output)).toEqual({
      type: "render_widget",
      widgetId: "widget-1",
      name: "booking_form",
      submitLabel: "Book now",
      schema,
    });
  });
});

describe("parseRenderWidgetPayload", () => {
  it("recognizes a genuine render_widget tool output", () => {
    const raw = JSON.stringify({ type: "render_widget", widgetId: "widget-1", name: "x", submitLabel: "Submit", schema: {} });
    expect(parseRenderWidgetPayload(raw)).toEqual({
      type: "render_widget",
      widgetId: "widget-1",
      name: "x",
      submitLabel: "Submit",
      schema: {},
    });
  });

  it("returns null for a normal tool's JSON output", () => {
    expect(parseRenderWidgetPayload(JSON.stringify({ status: "ok", result: "some data" }))).toBeNull();
  });

  it("returns null for non-JSON output (never throws)", () => {
    expect(parseRenderWidgetPayload("Order ORD1234 is out for delivery.")).toBeNull();
  });
});

describe("getEnabledWidgetTools (ADR 0028 Phase 2)", () => {
  it("a collection-only widget (no apiUrl) gets only the trigger tool", async () => {
    listEnabledWidgetsForExecution.mockResolvedValue([makeWidget()]);
    const tools = await getEnabledWidgetTools("org-1", "bot-1");
    expect(tools.map((t) => t.name)).toEqual(["render_widget_booking_form"]);
  });

  it("a widget with an apiUrl also gets a submit_widget_<name> tool", async () => {
    listEnabledWidgetsForExecution.mockResolvedValue([
      makeWidget({ apiUrl: "https://api.example.com/book", apiMethod: "POST" }),
    ]);
    const tools = await getEnabledWidgetTools("org-1", "bot-1");
    expect(tools.map((t) => t.name)).toEqual(["render_widget_booking_form", "submit_widget_booking_form"]);
  });

  it("the submit tool's inputSchema is the widget's own schema", async () => {
    const schema = { type: "object", properties: { name: { type: "string", title: "Name" } }, required: ["name"], additionalProperties: false };
    listEnabledWidgetsForExecution.mockResolvedValue([
      makeWidget({ apiUrl: "https://api.example.com/book", apiMethod: "POST", schema }),
    ]);
    const [, submitTool] = await getEnabledWidgetTools("org-1", "bot-1");
    expect(submitTool.inputSchema).toEqual(schema);
  });

  it("a non-write-capable submit tool calls performActionRequest and returns ok", async () => {
    listEnabledWidgetsForExecution.mockResolvedValue([
      makeWidget({ apiUrl: "https://api.example.com/book", apiMethod: "POST", headers: { "X-Key": "abc" } }),
    ]);
    performActionRequest.mockResolvedValue({ ok: true, status: 200, bodyText: '{"booked":true}' });
    const [, submitTool] = await getEnabledWidgetTools("org-1", "bot-1");

    const output = await submitTool.handle("org-1", "bot-1", { name: "Priya" });

    expect(performActionRequest).toHaveBeenCalledWith("https://api.example.com/book", "POST", { "X-Key": "abc" }, { name: "Priya" });
    expect(JSON.parse(output)).toEqual({ status: "ok", result: '{"booked":true}' });
    expect(createPendingAction).not.toHaveBeenCalled();
  });

  it("a non-write-capable submit tool degrades to handoff_required on failure (guardrail #4)", async () => {
    listEnabledWidgetsForExecution.mockResolvedValue([
      makeWidget({ apiUrl: "https://api.example.com/book", apiMethod: "POST" }),
    ]);
    performActionRequest.mockResolvedValue({ ok: false, status: 500 });
    const [, submitTool] = await getEnabledWidgetTools("org-1", "bot-1");

    const output = await submitTool.handle("org-1", "bot-1", { name: "Priya" });

    expect(JSON.parse(output)).toEqual({ status: "handoff_required", reason: "The booking_form widget's API call failed (500)." });
  });

  it("a write-capable submit tool never calls the API directly — it queues a PendingAction (ADR 0023)", async () => {
    listEnabledWidgetsForExecution.mockResolvedValue([
      makeWidget({ apiUrl: "https://api.example.com/refund", apiMethod: "POST", writeCapable: true }),
    ]);
    const [, submitTool] = await getEnabledWidgetTools("org-1", "bot-1");

    const output = await submitTool.handle("org-1", "bot-1", { name: "Priya" }, "conv-1");

    expect(performActionRequest).not.toHaveBeenCalled();
    expect(createPendingAction).toHaveBeenCalledWith("org-1", "bot-1", "conv-1", "submit_widget_booking_form", { name: "Priya" });
    expect(JSON.parse(output)).toEqual({
      status: "pending_approval",
      message: "A team member will review this before it's actually submitted.",
    });
  });
});

describe("executeWidgetSubmission (approvals console action)", () => {
  it("looks up the widget's own API config fresh by name and calls it", async () => {
    getWidgetByNameForExecution.mockResolvedValue(
      makeWidget({ apiUrl: "https://api.example.com/refund", apiMethod: "POST", headers: { "X-Key": "abc" } }),
    );
    performActionRequest.mockResolvedValue({ ok: true, status: 200, bodyText: "done" });

    const outcome = await executeWidgetSubmission("org-1", "bot-1", "booking_form", { name: "Priya" });

    expect(getWidgetByNameForExecution).toHaveBeenCalledWith("org-1", "bot-1", "booking_form");
    expect(performActionRequest).toHaveBeenCalledWith("https://api.example.com/refund", "POST", { "X-Key": "abc" }, { name: "Priya" });
    expect(outcome).toEqual({ status: "executed", detail: "done" });
  });

  it("fails gracefully if the widget was deleted before approval", async () => {
    getWidgetByNameForExecution.mockResolvedValue(null);
    const outcome = await executeWidgetSubmission("org-1", "bot-1", "gone_form", {});
    expect(outcome.status).toBe("failed");
    expect(performActionRequest).not.toHaveBeenCalled();
  });

  it("fails gracefully when the real API call fails", async () => {
    getWidgetByNameForExecution.mockResolvedValue(
      makeWidget({ apiUrl: "https://api.example.com/refund", apiMethod: "POST" }),
    );
    performActionRequest.mockResolvedValue({ ok: false, status: 503 });
    const outcome = await executeWidgetSubmission("org-1", "bot-1", "booking_form", {});
    expect(outcome).toEqual({ status: "failed", detail: "API call failed (503)." });
  });
});
