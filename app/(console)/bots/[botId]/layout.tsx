import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { BotTopBar } from "@/components/console/BotTopBar";

// Shared shell for every bot-scoped page (editor/knowledge/integrations)
// — 2026-09-26 decision to lift the bot switcher + page nav out of each
// page's own ad hoc header into one persistent top bar, matching the
// Chatbase reference. Deliberately no width constraint here: the editor
// keeps its own narrower `mx-auto max-w-2xl` column (a form), while
// knowledge/integrations keep using the full width (a table/list) — only
// the top bar itself spans edge to edge.
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
    tx.bot.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  );
  if (!bots.some((bot) => bot.id === botId)) {
    // Matches the pre-existing behavior of each page's own
    // findUniqueOrThrow (still there for the child page's own data) —
    // caught by the plain-language app/error.tsx boundary, not a bare
    // Next.js 404, per tests/e2e/error-boundary.spec.ts's verified case.
    throw new Error(`Bot ${botId} not found`);
  }

  return (
    <div>
      <BotTopBar botId={botId} bots={bots} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
