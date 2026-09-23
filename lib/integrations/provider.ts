// Generic connect/disconnect surface — same interface/connector pattern
// as lib/ai/gateway.ts and lib/ai/tools/registry.ts. The console's
// "Integrations" screen (docs/architecture.md §2) drives entirely off
// this interface: one Connect/Disconnect button per provider a vertical
// template lists, never custom UI or logic per platform. Adding
// WooCommerce/FHIR/etc. later is a new adapter here, nothing upstream.

export interface IntegrationConnectField {
  name: string;
  label: string;
  placeholder?: string;
}

export interface IntegrationProvider {
  readonly name: string; // e.g. "shopify" — matches Integration.provider
  readonly displayName: string; // e.g. "Shopify" — shown on the connect button

  /**
   * What the generic console "Integrations" screen should collect from
   * the business owner before redirecting to getAuthorizeUrl. This is
   * what keeps that screen provider-agnostic — it renders these fields,
   * not anything Shopify-specific, so a future adapter with a totally
   * different input shape needs no UI changes.
   */
  readonly connectFields: IntegrationConnectField[];

  /**
   * Where to send the business owner to start the OAuth flow. `input` is
   * whatever this provider needs from the connect form (e.g. Shopify's
   * shop domain) — deliberately untyped here since it varies per
   * provider; each adapter documents its own shape.
   */
  getAuthorizeUrl(orgId: string, botId: string, input: Record<string, string>): string;

  /**
   * Exchanges the OAuth callback for a token and persists an Integration
   * row. Takes only the callback's query params — not orgId/botId — and
   * returns them, because `state` (set in getAuthorizeUrl) is the only
   * thing carrying that context through the redirect; requiring the
   * caller to also supply orgId/botId would mean the caller has to
   * decode state itself first, duplicating what this method already
   * has to do.
   */
  handleCallback(params: URLSearchParams): Promise<{ orgId: string; botId: string }>;

  /** Revokes access where the provider supports it and removes the Integration row. */
  disconnect(orgId: string, botId: string): Promise<void>;
}

const registry = new Map<string, IntegrationProvider>();

export function registerIntegrationProvider(provider: IntegrationProvider): void {
  registry.set(provider.name, provider);
}

export function getIntegrationProvider(name: string): IntegrationProvider {
  const provider = registry.get(name);
  if (!provider) throw new Error(`Unknown integration provider "${name}"`);
  return provider;
}

export function listIntegrationProviders(): IntegrationProvider[] {
  return [...registry.values()];
}
