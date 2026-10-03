import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const findMany = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) =>
    fn({ customAction: { create, findMany } }),
  ),
}));
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((plaintext: string) => `enc:${plaintext}`),
  decrypt: vi.fn((stored: string) => stored.replace(/^enc:/, "")),
}));

import { slugifyActionName, createCustomAction, listCustomActions } from "@/lib/customActions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("slugifyActionName", () => {
  it("lowercases and underscores a human-typed name", () => {
    expect(slugifyActionName("Check Availability")).toBe("check_availability");
  });

  it("strips punctuation and collapses repeats", () => {
    expect(slugifyActionName("Check--Order!! Status??")).toBe("check_order_status");
  });

  it("trims leading/trailing underscores", () => {
    expect(slugifyActionName("  -book a table- ")).toBe("book_a_table");
  });
});

describe("createCustomAction", () => {
  it("encrypts headers before storing, and builds a JSON schema from fields", async () => {
    create.mockResolvedValue({ id: "action-1" });

    await createCustomAction("org-1", "bot-1", {
      name: "book_table",
      description: "Book a table.",
      method: "POST",
      url: "https://api.example.com/book",
      headers: { Authorization: "Bearer secret" },
      fields: [{ name: "partySize", description: "how many people", required: true }],
    });

    expect(create).toHaveBeenCalledTimes(1);
    const { data } = create.mock.calls[0][0];
    expect(data.headersEncrypted).toBe('enc:{"Authorization":"Bearer secret"}');
    expect(data.inputSchema).toEqual({
      type: "object",
      properties: { partySize: { type: "string", description: "how many people" } },
      required: ["partySize"],
      additionalProperties: false,
    });
  });

  it("stores no headers when none are given", async () => {
    create.mockResolvedValue({ id: "action-1" });

    await createCustomAction("org-1", "bot-1", {
      name: "book_table",
      description: "Book a table.",
      method: "GET",
      url: "https://api.example.com/book",
      fields: [],
    });

    expect(create.mock.calls[0][0].data.headersEncrypted).toBeNull();
  });
});

describe("listCustomActions", () => {
  it("never exposes header values — only whether headers exist", async () => {
    findMany.mockResolvedValue([
      {
        id: "action-1",
        name: "book_table",
        description: "Book a table.",
        method: "POST",
        url: "https://api.example.com/book",
        headersEncrypted: "enc:{\"Authorization\":\"Bearer secret\"}",
        inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
        enabled: true,
        createdAt: new Date(),
      },
    ]);

    const rows = await listCustomActions("org-1", "bot-1");
    expect(rows[0].hasHeaders).toBe(true);
    expect(rows[0]).not.toHaveProperty("headers");
    expect(rows[0]).not.toHaveProperty("headersEncrypted");
  });
});
