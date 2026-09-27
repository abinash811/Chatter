import { withOrgContext } from "@/lib/db";

// Data layer for the collect_lead tool's captured contact info
// (lib/ai/tools/collectLead.ts) and its console view
// (app/(console)/bots/[botId]/leads/). Generic across every vertical
// (guardrail #2) — matches Chatbase's "Leads" dashboard, no ecommerce
// assumption.

export interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  createdAt: Date;
}

export async function listLeads(orgId: string, botId: string): Promise<LeadRow[]> {
  const leads = await withOrgContext(orgId, (tx) =>
    tx.lead.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
    }),
  );
  return leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    note: lead.note,
    createdAt: lead.createdAt,
  }));
}
