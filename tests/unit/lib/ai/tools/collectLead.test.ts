import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@/lib/db", () => ({
  withOrgContext: vi.fn((_orgId: string, fn: (tx: unknown) => unknown) => fn({ lead: { create } })),
}));

import { collectLeadTool } from "@/lib/ai/tools/collectLead";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("collect_lead tool", () => {
  it("saves a lead with an email", async () => {
    create.mockResolvedValue({ id: "lead-1" });
    const result = await collectLeadTool.handle("org-1", "bot-1", { name: "Alice", email: "alice@example.com" });

    expect(create).toHaveBeenCalledWith({
      data: { orgId: "org-1", botId: "bot-1", name: "Alice", email: "alice@example.com", phone: null, note: null },
    });
    expect(JSON.parse(result)).toEqual({ status: "saved" });
  });

  it("saves a lead with only a phone number, no email", async () => {
    create.mockResolvedValue({ id: "lead-1" });
    const result = await collectLeadTool.handle("org-1", "bot-1", { phone: "555-1234" });

    expect(create).toHaveBeenCalledWith({
      data: { orgId: "org-1", botId: "bot-1", name: null, email: null, phone: "555-1234", note: null },
    });
    expect(JSON.parse(result)).toEqual({ status: "saved" });
  });

  it("refuses to save a lead with neither email nor phone, without touching the database", async () => {
    const result = await collectLeadTool.handle("org-1", "bot-1", { name: "Alice" });

    expect(create).not.toHaveBeenCalled();
    expect(JSON.parse(result)).toMatchObject({ status: "error" });
  });
});

describe("collect_lead tool — describeForInbox", () => {
  it("is never an issue — capturing a lead is a successful fallback, not a failure", () => {
    const { summary, isIssue } = collectLeadTool.describeForInbox!(
      { email: "alice@example.com" },
      JSON.stringify({ status: "saved" }),
    );
    expect(summary).toBe("Captured contact info for alice@example.com.");
    expect(isIssue).toBe(false);
  });
});
