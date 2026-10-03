import { getCurrentSession } from "@/lib/auth";
import { listLeads } from "@/lib/leads";
import { LeadsTable } from "./LeadsTable";

export default async function LeadsPage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const leads = await listLeads(session.orgId, botId);

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          Leads{" "}
          {leads.length > 0 && <span className="text-sm font-normal text-muted-foreground">{leads.length}</span>}
        </h1>
      </div>
      <LeadsTable leads={leads} />
    </div>
  );
}
