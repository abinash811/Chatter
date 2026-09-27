import type { Tool } from "@/lib/ai/tools/registry";
import { listEnabledCustomActionsForExecution, type CustomActionForExecution } from "@/lib/customActions";

// Custom (business-defined) webhook tools — ADR 0022. Deliberately not a
// lib/ai/tools/registry.ts entry: a custom action's name/schema/URL are
// per-bot data authored from the console, not code known at compile
// time. lib/ai/chat.ts merges the output of getEnabledCustomActionTools()
// with the static registry's tools for each turn instead.

// SSRF guard (OWASP): the URL is business-supplied, but our server is the
// one making the outbound call, so a URL pointed at internal
// infrastructure (a private IP, localhost, or — once deployed on AWS,
// ADR 0021 — the instance metadata endpoint) must never be dialed. This
// mirrors what CLAUDE.md guardrail #4 already asks of every action tool:
// degrade to handoff rather than do something the business didn't
// actually intend.
const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^169\.254\./, // link-local — includes the AWS/GCP/Azure metadata IP
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc[0-9a-f][0-9a-f]:/i,
  /^\[?fd[0-9a-f][0-9a-f]:/i,
];

export function isBlockedActionUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return true;
  }
  if (parsed.protocol !== "https:") return true;
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname));
}

const ACTION_FETCH_TIMEOUT_MS = 10_000;

export function buildCustomActionTool(action: CustomActionForExecution): Tool {
  return {
    name: `custom_${action.name}`,
    description: action.description,
    inputSchema: action.inputSchema as Tool["inputSchema"],

    async handle(_orgId, _botId, input) {
      if (isBlockedActionUrl(action.url)) {
        return JSON.stringify({
          status: "handoff_required",
          reason: "This action's endpoint isn't reachable — a human will need to help instead.",
        });
      }

      const hasBody = action.method === "POST" || action.method === "PUT" || action.method === "PATCH";
      const url = new URL(action.url);
      if (!hasBody) {
        for (const [key, value] of Object.entries(input)) {
          url.searchParams.set(key, String(value));
        }
      }

      try {
        const res = await fetch(url, {
          method: action.method,
          headers: { ...action.headers, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
          body: hasBody ? JSON.stringify(input) : undefined,
          signal: AbortSignal.timeout(ACTION_FETCH_TIMEOUT_MS),
        });

        if (!res.ok) {
          return JSON.stringify({
            status: "handoff_required",
            reason: `The ${action.name} action failed (${res.status}).`,
          });
        }

        const text = await res.text();
        return JSON.stringify({ status: "ok", result: text });
      } catch {
        // Never fail silently or hallucinate a result (guardrail #4) — a
        // network error, timeout, or DNS failure all fall back the same way.
        return JSON.stringify({
          status: "handoff_required",
          reason: `Couldn't reach the ${action.name} action.`,
        });
      }
    },

    // No describeForInbox: a business-named, dynamically-shaped action
    // can't have inbox-summary code written ahead of time (ADR 0022).
    // Falls back to lib/conversations.ts's existing generic summary.
  };
}

export async function getEnabledCustomActionTools(orgId: string, botId: string): Promise<Tool[]> {
  const actions = await listEnabledCustomActionsForExecution(orgId, botId);
  return actions.map(buildCustomActionTool);
}
