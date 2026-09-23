import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { getOrCreateDraft, saveDraft, publishDraft } from "@/lib/ai/botConfig";
import { listAllTools } from "@/lib/ai/tools/registry";
import "@/lib/ai/tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const enabledTools = new Set(draft.tools as string[]);

  async function saveDraftAction(formData: FormData) {
    "use server";
    const session = await getCurrentSession();
    await saveDraft(session.orgId, botId, {
      persona: String(formData.get("persona") ?? ""),
      guardrails: String(formData.get("guardrails") ?? ""),
      tools: listAllTools()
        .map((t) => t.name)
        .filter((name) => formData.get(`tool_${name}`) === "on"),
    });
    revalidatePath(`/bots/${botId}`);
  }

  async function publishAction() {
    "use server";
    const session = await getCurrentSession();
    await publishDraft(session.orgId, botId);
    revalidatePath(`/bots/${botId}`);
  }

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

      <form action={saveDraftAction} className="mt-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="persona">
            Persona
          </label>
          <p className="text-sm text-muted-foreground">
            How should your bot introduce itself and talk to visitors? Write it in your own words.
          </p>
          <textarea
            id="persona"
            name="persona"
            defaultValue={draft.persona}
            rows={5}
            className="w-full rounded border border-border bg-transparent p-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="guardrails">
            Guardrails
          </label>
          <p className="text-sm text-muted-foreground">
            Anything your bot should never do or say — e.g. never quote a final price, never
            give medical advice.
          </p>
          <textarea
            id="guardrails"
            name="guardrails"
            defaultValue={draft.guardrails}
            rows={4}
            className="w-full rounded border border-border bg-transparent p-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Tools</span>
          <div className="space-y-1">
            {listAllTools().map((tool) => (
              <label key={tool.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`tool_${tool.name}`}
                  defaultChecked={enabledTools.has(tool.name)}
                />
                {tool.name}
                <span className="text-muted-foreground">— {tool.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Save draft
          </Button>
        </div>
      </form>

      <form action={publishAction} className="mt-4">
        <Button type="submit">Publish</Button>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing makes this the version live visitors talk to. Conversations already in
          progress finish on the version they started with.
        </p>
      </form>
    </div>
  );
}
