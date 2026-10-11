import { Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { PageHeader } from "@/components/console/PageHeader";
import registerManifest from "@/scripts/register-manifest.json";

const REGISTER_COPY: Record<string, { label: string; description: string }> = {
  linear: {
    label: "Linear",
    description: "Daily-driver screens: dense, h-row/h-row-sm, minimal decoration.",
  },
  notion: {
    label: "Notion",
    description: "Configuration/creative surfaces: calm, generous spacing, plain-language labels.",
  },
  stripe: {
    label: "Stripe",
    description: "Anything touching real data/credentials: restrained, no decoration for its own sake.",
  },
};

// Page templates, not components — these are shapes duplicated across
// several real pages, documented here with one live, real example of
// each rather than a static mockup. Phase 3 of the 2026-10-08 scoping
// decision: extract only what's genuinely identical everywhere
// (PageHeader); document, don't force-refactor, patterns that vary
// deliberately per screen (the Dialog creation flow, the editor's own
// title+badge+actions header).
export function PageTemplatesSection() {
  const registerRows = Object.entries(registerManifest).filter(([key]) => key !== "_comment");

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-sm font-medium">PageHeader</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          components/console/PageHeader.tsx — extracted from the identical title+count+action markup duplicated
          across Bots/Leads/Approvals/Custom actions/Data sources/Widgets. This is the real component, rendered live.
        </p>
        <div className="mt-3 rounded-lg border border-border p-4 shadow-xs">
          <PageHeader
            title="Leads"
            count={3}
            action={
              <Button type="button" size="sm" variant="outline">
                Export CSV
              </Button>
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium">
          Dialog-based creation flow{" "}
          <span className="text-xs font-normal text-muted-foreground">(documented, not extracted)</span>
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          NewBotDialog.tsx / AddActionDialog.tsx / AddWidgetDialog.tsx / AddUrlDialog.tsx all follow the same shape —
          a header-level trigger button opens a real shadcn Dialog (see the Overlays tab above for a live one) whose
          form posts through a server action and closes itself on success. Left as a convention, not a shared
          component: each dialog's fields are genuinely different, and forcing one generic &quot;AddEntityDialog&quot;
          would mean a props API shaped like a form builder for a pattern that only saves a handful of lines per
          call site.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium">
          Editor header <span className="text-xs font-normal text-muted-foreground">(documented, not extracted)</span>
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          BotEditorForm.tsx&apos;s header (title + publish-status Badge on the left, Preview/Save/Publish actions on
          the right) deliberately isn&apos;t PageHeader — it carries a status badge next to the title and more than
          one action, a shape unique to the one screen that edits and publishes a bot. Forcing it into PageHeader&apos;s
          title/count/action shape would mean bending that component&apos;s API around a single caller.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium">Registers</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every console route&apos;s assigned register (docs/architecture.md §7, enforced by
          scripts/check-register-assignment.mjs) — read straight from scripts/register-manifest.json, so this table
          can&apos;t drift from what the guardrail actually checks.
        </p>
        <div className="rounded-lg border border-border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Register</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registerRows.map(([route, register]) => (
                <TableRow key={route}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{route}</TableCell>
                  <TableCell>
                    <Badge variant="muted" title={REGISTER_COPY[register as string]?.description}>
                      {REGISTER_COPY[register as string]?.label ?? (register as string)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Object.entries(REGISTER_COPY).map(([key, { label, description }]) => (
            <div key={key} className="rounded-lg border border-border p-3 text-xs text-muted-foreground shadow-xs">
              <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
              {description}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
