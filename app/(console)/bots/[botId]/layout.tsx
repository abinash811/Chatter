import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";

// Shared shell for every bot-scoped page (editor/knowledge/integrations).
// ADR 0037 (2026-10-04): the bot switcher + page nav that used to live
// in a BotTopBar component here now render in AppSidebar's contextual
// sub-nav instead — this layout keeps only the existence check (still
// needed for the plain-language error boundary below) and a sr-only
// <h1> with the bot's name, the one real accessibility role BotTopBar
// used to carry. Deliberately no width constraint here: the editor
// keeps its own narrower `mx-auto max-w-2xl` column (a form), while
// knowledge/integrations keep using the full width (a table/list).
export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ botId: string }>;
}) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const bots = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findMany({
      where: { archivedAt: null }, // ADR 0018: an archived bot is "not found" here too
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  );
  const bot = bots.find((bot) => bot.id === botId);
  if (!bot) {
    // Matches the pre-existing behavior of each page's own
    // findUniqueOrThrow (still there for the child page's own data) —
    // caught by the plain-language app/error.tsx boundary, not a bare
    // Next.js 404, per tests/e2e/error-boundary.spec.ts's verified case.
    throw new Error(`Bot ${botId} not found`);
  }

  return (
    <div>
      <h1 className="sr-only">{bot.name}</h1>
      {children}
    </div>
  );
}
