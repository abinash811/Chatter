import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { Badge, Button } from "@/components/ui";

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

  async function createBotAction(formData: FormData) {
    "use server";
    const session = await getCurrentSession();
    const name = String(formData.get("name") ?? "").trim() || "Untitled bot";
    const bot = await withOrgContext(session.orgId, (tx) =>
      tx.bot.create({ data: { orgId: session.orgId, name } }),
    );
    await getOrCreateBotPublicKey(session.orgId, bot.id);
    redirect(`/bots/${bot.id}`);
  }

  return (
    <div>
      <div className="flex h-row items-center justify-between">
        <h1 className="text-lg font-semibold">Bots</h1>
        <form action={createBotAction} className="flex items-center gap-2">
          <input
            name="name"
            placeholder="Bot name"
            required
            className="h-row-sm rounded border border-border bg-transparent px-2 text-sm"
          />
          <Button size="sm" type="submit">
            New bot
          </Button>
        </form>
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
