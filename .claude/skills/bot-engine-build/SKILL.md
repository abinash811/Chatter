---
name: bot-engine-build
description: Use before writing or modifying anything under lib/ai/ or lib/integrations/ — the model gateway, tool registry, chat loop, or an action tool/integration adapter. Enforces the interface/connector split and the guardrails that are easy to violate by accident in this layer.
---

# Bot engine build

Before writing code in `lib/ai/` or `lib/integrations/`:

1. **Read the existing interface before adding to it.** `lib/ai/gateway.ts`
   (`ModelGateway`), `lib/ai/tools/registry.ts` (`Tool`), and
   `lib/integrations/provider.ts` (`IntegrationProvider`) are the
   interface/connector boundaries (docs/architecture.md §2). A new tool
   or provider implements the existing interface — it does not add a new
   parameter, a new special case, or a new way of calling the model that
   bypasses the interface. If the interface genuinely can't express what
   you need, that's a design conversation, not a workaround.

2. **Every tenant-scoped read/write goes through `withOrgContext`**
   (`lib/db.ts`), never a raw Prisma client. `scripts/check-tenant-
   isolation.mjs` enforces this at commit time, but don't rely on the
   check to catch it — write it correctly the first time.

3. **No vertical names in `lib/ai/gateway.ts`, `chat.ts`,
   `systemPrompt.ts`, `botConfig.ts`, `lib/db.ts`, or `lib/auth.ts`.**
   `scripts/check-no-vertical-logic.mjs` enforces this. A tool or
   integration adapter *named* after a vertical concept
   (`checkOrderStatus.ts`, `shopify.ts`) is fine and expected — the
   violation is the core engine branching on which vertical it's
   serving.

4. **Every action tool must degrade to handoff, never guess.** If a
   tool's fulfillment depends on an integration that isn't connected
   (`Integration` row missing), return a structured "handoff_required"
   result — see `checkOrderStatus.ts` for the pattern — never fabricate
   an answer.

5. **Don't add a second place that logs tool calls.** `lib/ai/chat.ts`
   already logs every tool call to `ToolCallLog` in one place, right
   after `runTool` — that's what makes guardrail #6 actually complete.
   A tool implementation logging its own calls would create a second,
   inconsistent source of truth.

6. **Run it before committing** — `npm run check:all && npx tsc --noEmit`
   at minimum; `node scripts/verify-rls.mjs` if you touched anything
   RLS-adjacent. See CLAUDE.md's "never commit code that hasn't actually
   been run."
