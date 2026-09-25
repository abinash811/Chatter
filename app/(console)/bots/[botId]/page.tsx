import { getCurrentSession } from "@/lib/auth";
import { withOrgContext, getOrCreateBotPublicKey } from "@/lib/db";
import { getOrCreateDraft, parseAppearance } from "@/lib/ai/botConfig";
import { listAllTools } from "@/lib/ai/tools/registry";
import "@/lib/ai/tools";
import { Badge } from "@/components/ui";
import { BotEditorForm } from "./BotEditorForm";

// Notion register (docs/architecture.md §7): calm, generous spacing —
// this is where a non-technical business owner writes their bot's
// persona/guardrails in their own words, not a dense power-user screen.
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
    <div className="max-w-xl">
      <div className="flex h-row items-center justify-between">
        <h1 className="text-lg font-semibold">{bot.name}</h1>
        <div className="flex items-center gap-2">
          {publishedVersion ? (
            <Badge variant="muted">Published v{publishedVersion.version}</Badge>
          ) : (
            <Badge variant="muted">Never published</Badge>
          )}
          <a href={`/bots/${botId}/integrations`} className="text-sm text-muted-foreground hover:underline">
            Integrations
          </a>
        </div>
      </div>

      <BotEditorForm
        botId={botId}
        persona={draft.persona}
        guardrails={draft.guardrails}
        tools={listAllTools().map((tool) => ({
          name: tool.name,
          description: tool.description,
          enabled: enabledTools.has(tool.name),
        }))}
        greeting={appearance.greeting}
        accentColor={appearance.accentColor}
      />

      <div className="mt-8 space-y-2 border-t border-border pt-6">
        <span className="text-sm font-medium">Embed on your site</span>
        <p className="text-sm text-muted-foreground">
          Paste this before the closing <code>&lt;/body&gt;</code> tag on any page.
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{embedSnippet}</pre>
      </div>
    </div>
  );
}
