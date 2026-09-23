import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// First real console screen. Linear register: dense list, one row
// height (docs/architecture.md §7), no decoration beyond what's needed
// to scan a list of bots fast.
export default async function BotsPage() {
  const session = await getCurrentSession();

  const bots = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        versions: { where: { status: "published" }, take: 1 },
      },
    }),
  );

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="text-lg font-semibold">Bots</h1>
        <Button size="sm">New bot</Button>
      </div>

      <div className="mt-4 divide-y divide-border border-y border-border">
        {bots.length === 0 && (
          <p className="py-8 text-sm text-muted-foreground">
            No bots yet — create one to get started.
          </p>
        )}
        {bots.map((bot) => (
          <a
            key={bot.id}
            href={`/bots/${bot.id}`}
            className="flex h-row items-center justify-between px-2 text-sm hover:bg-muted"
          >
            <span className="font-medium">{bot.name}</span>
            <Badge variant={bot.versions.length > 0 ? "default" : "muted"}>
              {bot.versions.length > 0 ? "Published" : "Draft only"}
            </Badge>
          </a>
        ))}
      </div>
    </div>
  );
}
