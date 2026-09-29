import { describe, it, expect } from "vitest";
import { buildWidgetTool, parseRenderWidgetPayload } from "@/lib/ai/tools/widget";

describe("buildWidgetTool", () => {
  it("names the tool render_widget_<name> and takes no input", () => {
    const tool = buildWidgetTool({
      id: "widget-1",
      name: "booking_form",
      triggerDescription: "Show this once the visitor wants to book.",
      submitLabel: "Book now",
      schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    });

    expect(tool.name).toBe("render_widget_booking_form");
    expect(tool.description).toBe("Show this once the visitor wants to book.");
    expect(tool.inputSchema).toEqual({ type: "object", properties: {}, required: [], additionalProperties: false });
  });

  it("handle() returns a tagged JSON payload carrying the widget's schema", async () => {
    const schema = { type: "object", properties: { name: { type: "string", title: "Name" } }, required: [], additionalProperties: false };
    const tool = buildWidgetTool({
      id: "widget-1",
      name: "booking_form",
      triggerDescription: "desc",
      submitLabel: "Book now",
      schema,
    });

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
