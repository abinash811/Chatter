import { withOrgContext } from "@/lib/db";

// Data layer for the collect_lead tool's captured contact info
// (lib/ai/tools/collectLead.ts) and its console view (app/(console)/
// leads/). Generic across every vertical (guardrail #2) — matches
// Chatbase's "Leads" dashboard, no ecommerce assumption.
//
// ADR 0038 (2026-10-04): org-wide, not bot-scoped — a lead is a lead
// regardless of which bot collected it, same reasoning as Conversations.
// botId stays on the row (the schema didn't change) so the console can
// show which bot it came from and filter by it.

export interface LeadRow {
  id: string;
  botId: string;
  botName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  createdAt: Date;
}

export async function listLeads(orgId: string, botId?: string): Promise<LeadRow[]> {
  const leads = await withOrgContext(orgId, (tx) =>
    tx.lead.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
      include: { bot: { select: { name: true } } },
    }),
  );
  return leads.map((lead) => ({
    id: lead.id,
    botId: lead.botId,
    botName: lead.bot.name,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    note: lead.note,
    createdAt: lead.createdAt,
  }));
}
