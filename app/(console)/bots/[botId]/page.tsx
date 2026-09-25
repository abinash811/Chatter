import { getCurrentSession } from "@/lib/auth";
import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { getOrCreateDraft, parseAppearance } from "@/lib/ai/botConfig";
import { listAllTools } from "@/lib/ai/tools/registry";
import "@/lib/ai/tools";
import { BotEditorForm } from "./BotEditorForm";

// Notion register (docs/architecture.md §7) for the tab content itself
// (calm, generous spacing, plain-language labels) — but the overall
// page shape now follows docs/design/principles.md #10 (persistent top
// bar + tabs + confirm-before-publish), the same pattern every future
// record-editing screen uses. This page is now just a thin data-fetch
// shell; BotEditorForm owns the whole visual composition, including the
// header, since the header's Save/Publish buttons need the client-side
// action state that lives there.
export default async function BotPage({ params }: { params: Promise<{ botId: string }> }) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const bot = await withOrgContext(session.orgId, (tx) =>
    tx.bot.findUniqueOrThrow({ where: { id: botId } }),
  );
  const draft = await getOrCreateDraft(session.orgId, botId);
  const publishedVersion = await withOrgContext(session.orgId, (tx) =>
    tx.botConfigVersion.findFirst({
      where: { botId, status: "published" },
      orderBy: { version: "desc" },
    }),
  );
  const publicKey = await getOrCreateBotPublicKey(session.orgId, botId);

  const enabledTools = new Set(draft.tools as string[]);
  const appearance = parseAppearance(draft.appearance);
  const embedSnippet = `<script src="${process.env.APP_BASE_URL}/widget.js" data-bot-key="${publicKey}"></script>`;

  return (
    <BotEditorForm
      botId={botId}
      botName={bot.name}
      publishedVersion={publishedVersion?.version ?? null}
      persona={draft.persona}
      guardrails={draft.guardrails}
      tools={listAllTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
        enabled: enabledTools.has(tool.name),
      }))}
      greeting={appearance.greeting}
      accentColor={appearance.accentColor}
      embedSnippet={embedSnippet}
    />
  );
}
