import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const findMany = vi.fn();
const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ widget: { create, findMany, findUnique } })),
}));
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((plaintext: string) => `enc:${plaintext}`),
  decrypt: vi.fn((stored: string) => stored.replace(/^enc:/, "")),
}));

import {
  slugifyWidgetName,
  createWidget,
  listWidgets,
  listEnabledWidgetsForExecution,
  getWidgetByNameForExecution,
} from "@/lib/widgets";

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

  it("Phase 2 (ADR 0028): stores encrypted headers and API config when given", async () => {
    create.mockResolvedValue({ id: "widget-1" });

    await createWidget("org-1", "bot-1", {
      name: "booking_form",
      triggerDescription: "desc",
      submitLabel: "Submit",
      fields: [{ name: "name", label: "Name", type: "text", required: true, options: [] }],
      api: { method: "POST", url: "https://api.example.com/book", headers: { Authorization: "Bearer secret" }, writeCapable: false },
    });

    const { data } = create.mock.calls[0][0];
    expect(data.apiUrl).toBe("https://api.example.com/book");
    expect(data.apiMethod).toBe("POST");
    expect(data.headersEncrypted).toBe('enc:{"Authorization":"Bearer secret"}');
    expect(data.writeCapable).toBe(false);
  });

  it("defaults to no API config (collection-only, Phase 1 behavior) when api is omitted", async () => {
    create.mockResolvedValue({ id: "widget-1" });

    await createWidget("org-1", "bot-1", {
      name: "booking_form",
      triggerDescription: "desc",
      submitLabel: "Submit",
      fields: [{ name: "name", label: "Name", type: "text", required: true, options: [] }],
    });

    const { data } = create.mock.calls[0][0];
    expect(data.apiUrl).toBeNull();
    expect(data.apiMethod).toBeNull();
    expect(data.headersEncrypted).toBeNull();
    expect(data.writeCapable).toBe(false);
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
        apiUrl: null,
        apiMethod: null,
        headersEncrypted: null,
        writeCapable: false,
      },
    ]);

    const rows = await listWidgets("org-1", "bot-1");
    expect(rows[0].fields).toEqual([{ name: "time", label: "Preferred time", type: "select", required: true, options: ["Morning", "Evening"] }]);
  });

  it("Phase 2: never exposes header values — only whether headers exist", async () => {
    findMany.mockResolvedValue([
      {
        id: "widget-1",
        name: "booking_form",
        triggerDescription: "desc",
        submitLabel: "Submit",
        schema: { type: "object", properties: {}, required: [], additionalProperties: false },
        enabled: true,
        createdAt: new Date(),
        apiUrl: "https://api.example.com/book",
        apiMethod: "POST",
        headersEncrypted: 'enc:{"Authorization":"Bearer secret"}',
        writeCapable: true,
      },
    ]);

    const rows = await listWidgets("org-1", "bot-1");
    expect(rows[0].hasHeaders).toBe(true);
    expect(rows[0].apiUrl).toBe("https://api.example.com/book");
    expect(rows[0].writeCapable).toBe(true);
    expect(rows[0]).not.toHaveProperty("headers");
    expect(rows[0]).not.toHaveProperty("headersEncrypted");
  });
});

describe("listEnabledWidgetsForExecution", () => {
  it("only returns enabled widgets, for the runtime tool factory", async () => {
    findMany.mockResolvedValue([
      {
        id: "widget-1",
        name: "booking_form",
        triggerDescription: "desc",
        submitLabel: "Submit",
        schema: {},
        apiUrl: null,
        apiMethod: null,
        headersEncrypted: null,
        writeCapable: false,
      },
    ]);

    const widgets = await listEnabledWidgetsForExecution("org-1", "bot-1");
    expect(findMany).toHaveBeenCalledWith({ where: { botId: "bot-1", enabled: true } });
    expect(widgets).toHaveLength(1);
  });
});

describe("getWidgetByNameForExecution", () => {
  it("decrypts headers for the approvals executor", async () => {
    findUnique.mockResolvedValue({
      id: "widget-1",
      name: "booking_form",
      triggerDescription: "desc",
      submitLabel: "Submit",
      schema: {},
      apiUrl: "https://api.example.com/book",
      apiMethod: "POST",
      headersEncrypted: 'enc:{"Authorization":"Bearer secret"}',
      writeCapable: true,
    });

    const widget = await getWidgetByNameForExecution("org-1", "bot-1", "booking_form");

    expect(findUnique).toHaveBeenCalledWith({ where: { botId_name: { botId: "bot-1", name: "booking_form" } } });
    expect(widget?.headers).toEqual({ Authorization: "Bearer secret" });
  });

  it("returns null when the widget no longer exists", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getWidgetByNameForExecution("org-1", "bot-1", "gone")).toBeNull();
  });
});
