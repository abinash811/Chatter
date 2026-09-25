import { describe, it, expect, vi } from "vitest";
import { registerTool, getToolsForNames, listAllTools, runTool, type Tool } from "@/lib/ai/tools/registry";

function fakeTool(name: string, handle = vi.fn().mockResolvedValue("ok")): Tool {
  return { name, description: `${name} description`, inputSchema: { type: "object" }, handle };
}

describe("tool registry", () => {
  it("getToolsForNames returns the registered tools in order", () => {
    const a = fakeTool(`a-${Math.random()}`);
    const b = fakeTool(`b-${Math.random()}`);
    registerTool(a);
    registerTool(b);
    expect(getToolsForNames([a.name, b.name])).toEqual([a, b]);
  });

  it("getToolsForNames throws on an unknown tool name — a bot config referencing a tool that doesn't exist is a bug, not a silent no-op", () => {
    expect(() => getToolsForNames(["definitely-not-registered"])).toThrow(/Unknown tool/);
  });

  it("listAllTools includes every registered tool", () => {
    const t = fakeTool(`list-${Math.random()}`);
    registerTool(t);
    expect(listAllTools()).toContainEqual(t);
  });

  it("runTool calls the tool's handle with the given args and returns its result", async () => {
    const handle = vi.fn().mockResolvedValue("the answer");
    const t = fakeTool(`run-${Math.random()}`, handle);
    registerTool(t);
    const result = await runTool(t.name, "org-1", "bot-1", { q: "hi" });
    expect(result).toBe("the answer");
    expect(handle).toHaveBeenCalledWith("org-1", "bot-1", { q: "hi" });
  });

  it("runTool throws on an unknown tool name", async () => {
    await expect(runTool("nope-not-real", "org-1", "bot-1", {})).rejects.toThrow(/Unknown tool/);
  });
});
