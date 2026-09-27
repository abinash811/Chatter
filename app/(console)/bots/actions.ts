"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { DEFAULT_APPEARANCE } from "@/lib/ai/botConfig";

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
  redirect(`/bots/${bot.id}`);
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
    return { status: "success", message: "Renamed." };
  } catch (err) {
    console.error("[renameBotAction]", err);
    return {
      status: "error",
      message: "Couldn't rename that bot. Please try again.",
      name,
    };
  }
}

// ADR 0018: archive, never delete — sets archivedAt instead of removing
// any row. Every bot-fetching query across the app filters
// archivedAt: null, so this alone is what makes the bot disappear from
// the list, the top-bar switcher, the conversations filter, and stop
// resolving via the widget's botKey (lib/db.ts's resolveBotPublicKey).
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
    return { status: "success", message: "Bot archived." };
  } catch (err) {
    console.error("[archiveBotAction]", err);
    return {
      status: "error",
      message: "Couldn't archive that bot. Please try again.",
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
  redirect(`/bots/${newBotId}`);
}
