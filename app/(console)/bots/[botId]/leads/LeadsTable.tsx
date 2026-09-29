import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { relativeTime } from "@/lib/utils";
import type { LeadRow } from "@/lib/leads";

// Linear register (docs/architecture.md §7) — a dense, read-only data
// list, same pattern as BotsTable. No client interactivity needed (no
// row click, no actions yet), so this stays a plain server component.
export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
        <p className="text-sm font-medium">No leads yet</p>
        <p className="text-sm text-muted-foreground">
          Contact info your bot collects from visitors will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right">Captured</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="h-row">
              <TableCell className="font-medium">{lead.name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{lead.email ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{lead.phone ?? "—"}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{lead.note ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">{relativeTime(lead.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
