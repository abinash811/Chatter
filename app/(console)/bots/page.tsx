import { redirect } from "next/navigation";
import { Bot as BotIcon } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { Button, Input } from "@/components/ui";
import { BotsTable } from "@/components/console/BotsTable";

// First real console screen. Linear register: dense list, one row
// height (docs/architecture.md §7), no decoration beyond what's needed
// to scan a list of bots fast — but still a real shadow state per
// docs/design/principles.md #5, not a bare bordered box.
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
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          Bots
          {bots.length > 0 && <span className="text-sm font-normal text-muted-foreground">{bots.length}</span>}
        </h1>
        <form action={createBotAction} className="flex items-center gap-2">
          <Input name="name" placeholder="Bot name" required className="h-row-sm w-40" />
          <Button size="sm" type="submit">
            New bot
          </Button>
        </form>
      </div>

      {bots.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-border py-14 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <BotIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No bots yet</p>
          <p className="text-sm text-muted-foreground">Create one above to get started.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border shadow-xs">
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
