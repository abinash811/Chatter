import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentSession, getUserEmail } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { DEFAULT_APPEARANCE } from "@/lib/ai/botConfig";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui";
import { AppSidebar, type GettingStartedStep } from "@/components/console/AppSidebar";

// Console shell — Linear register (docs/architecture.md §7): dense,
// minimal chrome, no per-screen layout variation. Auth check lives here
// once, not duplicated per page. Real CARE Sidebar (ADR 0008) replaces
// the hand-rolled <nav> — same collapse-state cookie CARE's own
// component reads/writes, so the expanded/collapsed choice survives a
// reload without a client-side flash.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  let orgId: string;
  try {
    orgId = (await getCurrentSession()).orgId;
  } catch {
    redirect("/login");
  }

  // ADR 0012: onboardedAt is null until app/onboarding/ completes.
  // /onboarding itself lives outside this route group, so this can
  // never redirect-loop against itself.
  const org = await withOrgContext(orgId, (tx) => tx.org.findUniqueOrThrow({ where: { id: orgId } }));
  if (!org.onboardedAt) {
    redirect("/onboarding");
  }

  const userEmail = await getUserEmail((await getCurrentSession()).userId);

  // "Getting started" checklist (Chatbase-style sidebar widget) — each
  // step's completion is a real query against existing data, not a
  // stored flag, so it can't drift from what's actually true. First-bot
  // links point at the org's first bot; onboarding (ADR 0012) guarantees
  // at least one exists here.
  const { firstBotId, hasKnowledge, hasAppearance, hasPublished, hasIntegration } = await withOrgContext(
    orgId,
    async (tx) => {
      const bots = await tx.bot.findMany({ select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 });
      const firstBotId = bots[0]?.id ?? null;
      const [knowledgeCount, appearanceCount, publishedCount, integrationCount] = await Promise.all([
        tx.knowledgeSource.count(),
        // getOrCreateDraft (lib/ai/botConfig.ts) seeds every new draft
        // with DEFAULT_APPEARANCE, not an empty object — comparing
        // against {} would mark this step "done" the moment the editor
        // is opened, before a business ever touches it.
        tx.botConfigVersion.count({
          where: { NOT: { appearance: { equals: DEFAULT_APPEARANCE as unknown as Prisma.InputJsonValue } } },
        }),
        tx.botConfigVersion.count({ where: { status: "published" } }),
        tx.integration.count(),
      ]);
      return {
        firstBotId,
        hasKnowledge: knowledgeCount > 0,
        hasAppearance: appearanceCount > 0,
        hasPublished: publishedCount > 0,
        hasIntegration: integrationCount > 0,
      };
    },
  );

  const gettingStartedSteps: GettingStartedStep[] = [
    { label: "Create your first bot", done: firstBotId !== null, href: "/bots" },
    {
      label: "Add knowledge to your bot",
      done: hasKnowledge,
      href: firstBotId ? `/bots/${firstBotId}/knowledge` : "/bots",
    },
    { label: "Customize its appearance", done: hasAppearance, href: firstBotId ? `/bots/${firstBotId}` : "/bots" },
    { label: "Publish your bot", done: hasPublished, href: firstBotId ? `/bots/${firstBotId}` : "/bots" },
    {
      label: "Connect an integration",
      done: hasIntegration,
      href: firstBotId ? `/bots/${firstBotId}/integrations` : "/bots",
    },
  ];

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar orgName={org.name} userEmail={userEmail} gettingStartedSteps={gettingStartedSteps} />
      <SidebarInset>
        <div className="flex h-row items-center border-b border-border px-4">
          <SidebarTrigger />
        </div>
        <main className="px-8 py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
