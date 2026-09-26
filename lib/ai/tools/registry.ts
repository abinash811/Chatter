import type { ModelTool } from "@/lib/ai/gateway";

// Per docs/architecture.md §2's "interface vs connector" design rule:
// a Tool's name/description/inputSchema is what Claude sees and must stay
// stable; `handle` is the swappable fulfillment (direct API call today,
// an MCP client call later) — never inline that choice at the call site.
export interface Tool extends ModelTool {
  handle(orgId: string, botId: string, input: Record<string, unknown>): Promise<string>;
  // Optional (ADR 0016): how this tool's call should read to a
  // non-technical reviewer in the conversation inbox. A tool that
  // doesn't implement this gets a generic fallback (lib/conversations.ts)
  // — this is additive, not required.
  describeForInbox?(input: Record<string, unknown>, output: string): { summary: string; isIssue: boolean };
}

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  registry.set(tool.name, tool);
}

// Safe lookup for interpreting a historical ToolCallLog row — unlike
// getToolsForNames/runTool, this must not throw for a tool that no
// longer exists (e.g. removed from the registry after the call it
// logged was made).
export function getTool(name: string): Tool | undefined {
  return registry.get(name);
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

// For the console's bot-config editor to render "which tools can this
// bot use" as checkboxes — see app/(console)/bots/[botId]/page.tsx.
export function listAllTools(): Tool[] {
  return [...registry.values()];
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
