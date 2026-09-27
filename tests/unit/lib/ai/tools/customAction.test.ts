import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isBlockedActionUrl, buildCustomActionTool } from "@/lib/ai/tools/customAction";
import type { CustomActionForExecution } from "@/lib/customActions";

const baseAction: CustomActionForExecution = {
  id: "action-1",
  name: "check_availability",
  description: "Check appointment availability.",
  method: "POST",
  url: "https://api.example.com/availability",
  headers: { Authorization: "Bearer secret" },
  inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
};

describe("isBlockedActionUrl (SSRF guard)", () => {
  it("allows a public https URL", () => {
    expect(isBlockedActionUrl("https://api.example.com/hook")).toBe(false);
  });

  it("blocks non-https URLs", () => {
    expect(isBlockedActionUrl("http://api.example.com/hook")).toBe(true);
  });

  it("blocks localhost and loopback addresses", () => {
    expect(isBlockedActionUrl("https://localhost/hook")).toBe(true);
    expect(isBlockedActionUrl("https://127.0.0.1/hook")).toBe(true);
  });

  it("blocks the AWS/GCP/Azure metadata address", () => {
    expect(isBlockedActionUrl("https://169.254.169.254/latest/meta-data")).toBe(true);
  });

  it("blocks private network ranges", () => {
    expect(isBlockedActionUrl("https://10.0.0.5/hook")).toBe(true);
    expect(isBlockedActionUrl("https://192.168.1.1/hook")).toBe(true);
    expect(isBlockedActionUrl("https://172.16.0.1/hook")).toBe(true);
  });

  it("blocks an unparseable URL", () => {
    expect(isBlockedActionUrl("not a url")).toBe(true);
  });
});

describe("buildCustomActionTool", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("exposes the tool name as custom_<action name>", () => {
    const tool = buildCustomActionTool(baseAction);
    expect(tool.name).toBe("custom_check_availability");
    expect(tool.description).toBe(baseAction.description);
  });

  it("calls the webhook with the configured headers and the input as a JSON body for POST", async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => '{"slots":["10am"]}' });
    const tool = buildCustomActionTool(baseAction);

    const result = await tool.handle("org-1", "bot-1", { date: "2026-10-01" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.example.com/availability");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret", "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ date: "2026-10-01" }));
    expect(JSON.parse(result)).toEqual({ status: "ok", result: '{"slots":["10am"]}' });
  });

  it("sends input as query params for a GET action, not a body", async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => "ok" });
    const tool = buildCustomActionTool({ ...baseAction, method: "GET" });

    await tool.handle("org-1", "bot-1", { date: "2026-10-01" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.example.com/availability?date=2026-10-01");
    expect(init.body).toBeUndefined();
  });

  it("degrades to handoff_required on a non-ok response, never guessing an answer", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "error" });
    const tool = buildCustomActionTool(baseAction);

    const result = await tool.handle("org-1", "bot-1", {});
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
  });

  it("degrades to handoff_required on a network error", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const tool = buildCustomActionTool(baseAction);

    const result = await tool.handle("org-1", "bot-1", {});
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
  });

  it("degrades to handoff_required without ever calling fetch for a blocked URL", async () => {
    const tool = buildCustomActionTool({ ...baseAction, url: "https://169.254.169.254/latest/meta-data" });

    const result = await tool.handle("org-1", "bot-1", {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(result)).toMatchObject({ status: "handoff_required" });
  });
});
