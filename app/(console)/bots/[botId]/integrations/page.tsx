import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { listIntegrationProviders, getIntegrationProvider } from "@/lib/integrations/provider";
import "@/lib/integrations";
import { Button, Badge } from "@/components/ui";

// Generic across every platform (Shopify today, WooCommerce/FHIR/etc.
// later) — this screen renders whatever listIntegrationProviders()
// returns and whatever connectFields each one declares. Adding a new
// provider never touches this file.
export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await getCurrentSession();
  const { botId } = await params;

  const integrations = await withOrgContext(session.orgId, (tx) =>
    tx.integration.findMany({ where: { botId } }),
  );
  const connectedByProvider = new Map(integrations.map((i) => [i.provider, i]));

  async function connectAction(formData: FormData) {
    "use server";
    const session = await getCurrentSession();
    const providerName = formData.get("provider") as string;
    const provider = getIntegrationProvider(providerName);

    const input: Record<string, string> = {};
    for (const field of provider.connectFields) {
      input[field.name] = String(formData.get(field.name) ?? "");
    }

    redirect(provider.getAuthorizeUrl(session.orgId, botId, input));
  }

  async function disconnectAction(formData: FormData) {
    "use server";
    const session = await getCurrentSession();
    const providerName = formData.get("provider") as string;
    await getIntegrationProvider(providerName).disconnect(session.orgId, botId);
    redirect(`/bots/${botId}/integrations`);
  }

  return (
    <div>
      <h1 className="h-row flex items-center text-lg font-semibold">Integrations</h1>

      <div className="mt-4 divide-y divide-border border-y border-border">
        {listIntegrationProviders().map((provider) => {
          const connection = connectedByProvider.get(provider.name);
          return (
            <div key={provider.name} className="flex h-row items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{provider.displayName}</span>
                {connection && <Badge variant="default">Connected</Badge>}
              </div>

              {connection ? (
                <form action={disconnectAction}>
                  <input type="hidden" name="provider" value={provider.name} />
                  <Button variant="outline" size="sm" type="submit">
                    Disconnect
                  </Button>
                </form>
              ) : (
                <form action={connectAction} className="flex items-center gap-2">
                  <input type="hidden" name="provider" value={provider.name} />
                  {provider.connectFields.map((field) => (
                    <input
                      key={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      required
                      className="h-row-sm rounded border border-border bg-transparent px-2 text-sm"
                    />
                  ))}
                  <Button size="sm" type="submit">
                    Connect
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
