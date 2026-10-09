"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { DEFAULT_APPEARANCE } from "@/lib/ai/botConfig";
import { createDemoBot } from "@/lib/demoData";

export interface BotActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  name?: string;
}

// A "use server" file may only export async functions (Next.js) — the
// idle-state constant lives with each dialog component instead, same
// as knowledge/actions.ts's own note and BotEditorForm.tsx's idleState.
// Caught for real: exporting it from here 500'd every render of /bots.

// Same useActionState + toast pattern as bots/[botId]/actions.ts's
// saveDraftAction and knowledge/actions.ts's deleteEntryAction —
// errors caught here so the message stays plain-language, not a stack
// trace, per the framework's default error boundary.
export async function createBotAction(formData: FormData) {
  const session = await getCurrentSession();
  const name = String(formData.get("name") ?? "").trim() || "Untitled bot";
  const bot = await withOrgContext(session.orgId, (tx) =>
    tx.bot.create({ data: { orgId: session.orgId, name } }),
  );
  await getOrCreateBotPublicKey(session.orgId, bot.id);
  // ADR 0037: AppSidebar's bot sub-nav is fetched by the root
  // app/(console)/layout.tsx, which redirect() alone doesn't refetch —
  // real bug caught by e2e, not reasoned about in advance: a newly
  // created bot's sidebar sub-nav was missing entirely on first landing
  // (the root layout's own `bots` list was stale). "layout", not the
  // default "page" type — see node_modules/next/dist/docs/.../
  // revalidatePath.md's "Revalidating all data" example.
  revalidatePath("/", "layout");
  redirect(`/bots/${bot.id}`);
}

// "Load sample data" (2026-09-27 user directive) — creates a fully
// populated example bot (lib/demoData.ts) so a new or non-technical user
// sees every screen with real content instead of empty states, without
// needing a live ANTHROPIC_API_KEY/VOYAGE_API_KEY. Same redirect-on-
// success shape as createBotAction; no error state to carry since a
// failure here would be a genuine bug, not a bad input.
export async function loadSampleDataAction() {
  const session = await getCurrentSession();
  const botId = await createDemoBot(session.orgId);
  revalidatePath("/", "layout"); // same reason as createBotAction above
  redirect(`/bots/${botId}`);
}

export async function renameBotAction(
  botId: string,
  _prevState: BotActionState,
  formData: FormData,
): Promise<BotActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "A name is required.", name };
  }

  try {
    const session = await getCurrentSession();
    await withOrgContext(session.orgId, (tx) =>
      tx.bot.update({ where: { id: botId }, data: { name } }),
    );
    revalidatePath("/bots");
    // The sidebar's bot switcher/group label (AppSidebar.tsx, ADR 0037)
    // reads from the same root-layout `bots` fetch as the create
    // actions above — needs the same "layout" revalidation or it still
    // shows the old name until some other navigation happens to bust it.
    revalidatePath("/", "layout");
    return { status: "success", message: "Renamed." };
  } catch (err) {
    console.error("[renameBotAction]", err);
    // what + why + next (component-checklist.md item 5) — "why" here is
    // genuinely just "the save didn't go through"; there's no more
    // specific cause worth surfacing for a plain DB update like this.
    return {
      status: "error",
      message: "Couldn't rename that bot — the change didn't save. Please try again.",
      name,
    };
  }
}

// ADR 0018: archive, never delete — sets archivedAt instead of removing
// any row. Every bot-fetching query across the app filters
// archivedAt: null, so this alone is what makes the bot disappear from
// the list, the sidebar switcher (AppSidebar.tsx, ADR 0037), the
// conversations filter, and stop resolving via the widget's botKey
// (lib/db.ts's resolveBotPublicKey).
export async function archiveBotAction(
  botId: string,
  _prevState: BotActionState,
): Promise<BotActionState> {
  try {
    const session = await getCurrentSession();
    await withOrgContext(session.orgId, (tx) =>
      tx.bot.update({ where: { id: botId }, data: { archivedAt: new Date() } }),
    );
    revalidatePath("/bots");
    revalidatePath("/", "layout"); // same reason as renameBotAction above
    return { status: "success", message: "Bot archived." };
  } catch (err) {
    console.error("[archiveBotAction]", err);
    return {
      status: "error",
      message: "Couldn't archive that bot — the change didn't save. Please try again.",
    };
  }
}

// Clones persona/guardrails/tools/appearance into a brand-new bot and
// drops straight into its editor — deliberately does not copy
// conversations, knowledge base entries, or integrations. Those are
// data belonging to the *source* bot's own history/connections, not
// part of "what this bot is configured to do," which is what a
// duplicate is actually for (start a variant without re-typing
// persona/guardrails from scratch).
export async function duplicateBotAction(botId: string) {
  const session = await getCurrentSession();
  const { orgId } = session;

  const newBotId = await withOrgContext(orgId, async (tx) => {
    const source = await tx.bot.findFirstOrThrow({
      where: { id: botId, archivedAt: null },
    });
    const latestVersion = await tx.botConfigVersion.findFirst({
      where: { botId },
      orderBy: { version: "desc" },
    });

    const newBot = await tx.bot.create({
      data: { orgId, name: `${source.name} (copy)` },
    });
    await tx.botConfigVersion.create({
      data: {
        orgId,
        botId: newBot.id,
        version: 1,
        status: "draft",
        persona:
          latestVersion?.persona ??
          "You are a helpful assistant for this business.",
        guardrails: latestVersion?.guardrails ?? "",
        tools: latestVersion?.tools ?? [],
        appearance: (latestVersion?.appearance ??
          DEFAULT_APPEARANCE) as Prisma.InputJsonValue,
      },
    });
    return newBot.id;
  });

  await getOrCreateBotPublicKey(orgId, newBotId);
  revalidatePath("/", "layout"); // same reason as createBotAction above
  redirect(`/bots/${newBotId}`);
}
