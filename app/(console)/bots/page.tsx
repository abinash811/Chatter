import { Bot as BotIcon } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { BotsTable } from "@/components/console/BotsTable";
import { PageHeader } from "@/components/console/PageHeader";
import { NewBotDialog } from "./NewBotDialog";
import { LoadSampleDataButton } from "./LoadSampleDataButton";

// First real console screen. Linear register: dense list, one row
// height (docs/architecture.md §7), no decoration beyond what's needed
// to scan a list of bots fast — but still a real shadow state per
// docs/design/principles.md #5, not a bare bordered box.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function BotsPage() {
  const session = await getCurrentSession();

  const [bots, conversationsThisWeek] = await withOrgContext(session.orgId, (tx) =>
    Promise.all([
      tx.bot.findMany({
        where: { archivedAt: null }, // ADR 0018 — an archived bot never re-appears on its own list
        orderBy: { createdAt: "desc" },
        include: {
          versions: { where: { status: "published" }, take: 1 },
        },
      }),
      // docs/design/audit.md's "Bots list — open findings": the page
      // "feels thin for its hierarchy," and the approved mockup doesn't
      // solve it either — needs real content, not styling. User chose
      // an org-wide stat row over a per-bot activity column (2026-10-09)
      // — real data already in the schema, no fabricated numbers
      // (guardrail #4), a rolling 7-day window rather than calendar
      // "this week" to sidestep timezone ambiguity.
      tx.conversation.count({ where: { createdAt: { gte: new Date(Date.now() - WEEK_MS) } } }),
    ]),
  );

  const publishedCount = bots.filter((bot) => bot.versions.length > 0).length;

  return (
    <div>
      <PageHeader
        title="Bots"
        count={bots.length > 0 ? bots.length : undefined}
        action={
          <>
            <LoadSampleDataButton />
            <NewBotDialog />
          </>
        }
      />

      {bots.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          {publishedCount} published · {bots.length - publishedCount} draft{bots.length - publishedCount === 1 ? "" : "s"} ·{" "}
          {conversationsThisWeek} conversation{conversationsThisWeek === 1 ? "" : "s"} this week
        </p>
      )}

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
