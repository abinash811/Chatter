import { withOrgContext } from "@/lib/db";
import { registerTool, type Tool } from "@/lib/ai/tools/registry";

// Generic across every vertical (guardrail #2) — matches Chatbase's
// "Collect Leads" action; no ecommerce assumption. Use case: the bot
// couldn't fully answer, or the visitor wants a human to follow up, so
// it captures contact info instead of losing the visitor entirely.
//
// conversationId is deliberately not recorded — Tool.handle(orgId,
// botId, input) doesn't currently receive it (lib/ai/chat.ts's runTool
// call doesn't pass one), and widening that shared interface for every
// tool just for this one isn't justified yet. See lib/leads.ts's Lead
// row shape.
export const collectLeadTool: Tool = {
  name: "collect_lead",
  description:
    "Save a visitor's contact info so a human can follow up — use this when you can't fully answer the visitor's question yourself, or when they ask to be contacted. Always tell the visitor why you're asking before requesting their details, and never demand contact info upfront.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The visitor's name, if given." },
      email: { type: "string", description: "The visitor's email address, if given." },
      phone: { type: "string", description: "The visitor's phone number, if given." },
      note: { type: "string", description: "Brief context on what the visitor needs — for the business to follow up on." },
    },
    // At least one contact method must be present — a "lead" with
    // neither an email nor a phone number gives the business no way to
    // actually follow up, so it isn't a lead at all.
    anyOf: [{ required: ["email"] }, { required: ["phone"] }],
    additionalProperties: false,
  },

  async handle(orgId, botId, input) {
    const name = (input.name as string | undefined) || null;
    const email = (input.email as string | undefined) || null;
    const phone = (input.phone as string | undefined) || null;
    const note = (input.note as string | undefined) || null;

    if (!email && !phone) {
      return JSON.stringify({ status: "error", reason: "At least an email or phone number is required." });
    }

    await withOrgContext(orgId, (tx) => tx.lead.create({ data: { orgId, botId, name, email, phone, note } }));

    return JSON.stringify({ status: "saved" });
  },

  // ADR 0016: never an issue on its own — capturing a lead is the bot
  // succeeding at a fallback, not failing. The "couldn't answer" part
  // (if any) is whatever tool call or turn led to this one, not this one
  // itself.
  describeForInbox(input) {
    const contact = (input.email as string | undefined) || (input.phone as string | undefined) || "a visitor";
    return { summary: `Captured contact info for ${contact}.`, isIssue: false };
  },
};

registerTool(collectLeadTool);
