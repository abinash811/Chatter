import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { PageHeader } from "@/components/console/PageHeader";
import { ArchivedBotsForm } from "./ArchivedBotsForm";

// ADR 0018's restore half (2026-10-11) — a separate dedicated view, not
// a status filter on /bots (user's explicit choice: the main list's
// row-click-to-editor can't work for an archived bot anyway, since that
// route 404s for one by design, so archived bots want their own simple
// list, not a toggle on a list built around a different interaction).
// Linear register, same as /bots itself: a dense, read-mostly list.
export default async function ArchivedBotsPage() {
  const session = await getCurrentSession();

  const bots = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findMany({
      where: { archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      select: { id: true, name: true, archivedAt: true },
    }),
  );

  return (
    <div>
      <PageHeader title="Archived bots" count={bots.length > 0 ? bots.length : undefined} />
      <ArchivedBotsForm
        bots={bots.map((bot) => ({ id: bot.id, name: bot.name, archivedAt: bot.archivedAt as Date }))}
      />
    </div>
  );
}
