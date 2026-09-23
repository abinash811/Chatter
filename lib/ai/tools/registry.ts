import type { ModelTool } from "@/lib/ai/gateway";

// Per docs/architecture.md §2's "interface vs connector" design rule:
// a Tool's name/description/inputSchema is what Claude sees and must stay
// stable; `handle` is the swappable fulfillment (direct API call today,
// an MCP client call later) — never inline that choice at the call site.
export interface Tool extends ModelTool {
  handle(orgId: string, botId: string, input: Record<string, unknown>): Promise<string>;
}

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  registry.set(tool.name, tool);
}

// Reads which tools are enabled from the bot's published config
// (BotConfigVersion.tools — a list of tool names) so a template/business
// only ever gets the tools it's actually configured for.
export function getToolsForNames(names: string[]): Tool[] {
  return names.map((name) => {
    const tool = registry.get(name);
    if (!tool) throw new Error(`Unknown tool "${name}" referenced by bot config`);
    return tool;
  });
}

export async function runTool(
  name: string,
  orgId: string,
  botId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Unknown tool "${name}"`);
  return tool.handle(orgId, botId, input);
}
