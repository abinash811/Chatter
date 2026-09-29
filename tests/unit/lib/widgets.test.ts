import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const findMany = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ widget: { create, findMany } })),
}));

import { slugifyWidgetName, createWidget, listWidgets, listEnabledWidgetsForExecution } from "@/lib/widgets";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("slugifyWidgetName", () => {
  it("lowercases and underscores a human-typed name", () => {
    expect(slugifyWidgetName("Booking Form")).toBe("booking_form");
  });

  it("strips punctuation and collapses repeats", () => {
    expect(slugifyWidgetName("Lead--Capture!! Form??")).toBe("lead_capture_form");
  });
});

describe("createWidget", () => {
  it("builds a real JSON Schema from typed fields, including a select field's enum", async () => {
    create.mockResolvedValue({ id: "widget-1" });

    await createWidget("org-1", "bot-1", {
      name: "booking_form",
      triggerDescription: "Show this once the visitor wants to book.",
      submitLabel: "Book now",
      fields: [
        { name: "name", label: "Your name", type: "text", required: true, options: [] },
        { name: "partySize", label: "Party size", type: "number", required: false, options: [] },
        { name: "newsletter", label: "Subscribe?", type: "boolean", required: false, options: [] },
        { name: "time", label: "Preferred time", type: "select", required: true, options: ["Morning", "Evening"] },
      ],
    });

    expect(create).toHaveBeenCalledTimes(1);
    const { data } = create.mock.calls[0][0];
    expect(data.schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string", title: "Your name" },
        partySize: { type: "number", title: "Party size" },
        newsletter: { type: "boolean", title: "Subscribe?" },
        time: { type: "string", title: "Preferred time", enum: ["Morning", "Evening"] },
      },
      required: ["name", "time"],
      additionalProperties: false,
    });
    expect(data.submitLabel).toBe("Book now");
  });

  it("skips a field with a blank name", async () => {
    create.mockResolvedValue({ id: "widget-1" });

    await createWidget("org-1", "bot-1", {
      name: "form",
      triggerDescription: "desc",
      submitLabel: "",
      fields: [{ name: "", label: "", type: "text", required: false, options: [] }],
    });

    const { data } = create.mock.calls[0][0];
    expect(data.schema.properties).toEqual({});
    expect(data.submitLabel).toBe("Submit");
  });
});

describe("listWidgets", () => {
  it("round-trips a schema back into typed fields", async () => {
    findMany.mockResolvedValue([
      {
        id: "widget-1",
        name: "booking_form",
        triggerDescription: "Show this once the visitor wants to book.",
        submitLabel: "Book now",
        schema: {
          type: "object",
          properties: { time: { type: "string", title: "Preferred time", enum: ["Morning", "Evening"] } },
          required: ["time"],
          additionalProperties: false,
        },
        enabled: true,
        createdAt: new Date(),
      },
    ]);

    const rows = await listWidgets("org-1", "bot-1");
    expect(rows[0].fields).toEqual([{ name: "time", label: "Preferred time", type: "select", required: true, options: ["Morning", "Evening"] }]);
  });
});

describe("listEnabledWidgetsForExecution", () => {
  it("only returns enabled widgets, for the runtime tool factory", async () => {
    findMany.mockResolvedValue([
      { id: "widget-1", name: "booking_form", triggerDescription: "desc", submitLabel: "Submit", schema: {} },
    ]);

    const widgets = await listEnabledWidgetsForExecution("org-1", "bot-1");
    expect(findMany).toHaveBeenCalledWith({ where: { botId: "bot-1", enabled: true } });
    expect(widgets).toHaveLength(1);
  });
});
