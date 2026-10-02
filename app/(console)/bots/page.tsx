import { Bot as BotIcon } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { BotsTable } from "@/components/console/BotsTable";
import { NewBotDialog } from "./NewBotDialog";
import { LoadSampleDataButton } from "./LoadSampleDataButton";

// First real console screen. Linear register: dense list, one row
// height (docs/architecture.md §7), no decoration beyond what's needed
// to scan a list of bots fast — but still a real shadow state per
// docs/design/principles.md #5, not a bare bordered box.
export default async function BotsPage() {
  const session = await getCurrentSession();

  const bots = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findMany({
      where: { archivedAt: null }, // ADR 0018 — an archived bot never re-appears on its own list
      orderBy: { createdAt: "desc" },
      include: {
        versions: { where: { status: "published" }, take: 1 },
      },
    }),
  );

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          Bots{" "}
          {bots.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {bots.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <LoadSampleDataButton />
          <NewBotDialog />
        </div>
      </div>

      {bots.length === 0 ? (
        // Dialog-based creation flow (docs/design/audit.md's "Bots list
        // — open findings") — the empty state now has a real CTA of its
        // own instead of pointing back up at the header's button.
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <BotIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No bots yet</p>
          <p className="text-sm text-muted-foreground">
            Create one to get started, or load sample data to see how it all works first.
          </p>
          <div className="flex items-center gap-2">
            <LoadSampleDataButton label="Load sample data" />
            <NewBotDialog triggerLabel="Create your first bot" />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <BotsTable
            bots={bots.map((bot) => ({
              id: bot.id,
              name: bot.name,
              createdAt: bot.createdAt,
              published: bot.versions.length > 0,
            }))}
          />
        </div>
      )}
    </div>
  );
}
