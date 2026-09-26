import { withOrgContext } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { registerIntegrationProvider, type IntegrationProvider } from "@/lib/integrations/provider";

// First concrete adapter for the generic connect/disconnect interface.
// Minimal scopes per docs/research/competitive-landscape.md's finding on
// how Zipchat's own Shopify app is scoped: read_products (knowledge base)
// + read_orders (check_order_status).
const SCOPES = "read_products,read_orders";

function encodeState(orgId: string, botId: string): string {
  // TODO: sign this once a secrets/signing utility exists — a bare
  // base64 payload is enough to establish the flow, not yet CSRF-hardened.
  return Buffer.from(JSON.stringify({ orgId, botId })).toString("base64url");
}

function decodeState(state: string): { orgId: string; botId: string } {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
}

export const shopifyProvider: IntegrationProvider = {
  name: "shopify",
  displayName: "Shopify",
  connectFields: [
    { name: "shopDomain", label: "Shop domain", placeholder: "my-store.myshopify.com" },
  ],

  getAuthorizeUrl(orgId, botId, input) {
    const redirectUri = `${process.env.APP_BASE_URL}/api/integrations/shopify/callback`;
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state: encodeState(orgId, botId),
    });
    return `https://${input.shopDomain}/admin/oauth/authorize?${params.toString()}`;
  },

  async handleCallback(params) {
    const { orgId, botId } = decodeState(params.get("state")!);
    const shop = params.get("shop")!;
    const code = params.get("code")!;

    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });
    if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status}`);
    const { access_token } = (await res.json()) as { access_token: string };
    const encryptedToken = encrypt(access_token);

    await withOrgContext(orgId, (tx) =>
      tx.integration.upsert({
        where: { botId_provider: { botId, provider: "shopify" } },
        create: { orgId, botId, provider: "shopify", shopDomain: shop, accessToken: encryptedToken },
        update: { shopDomain: shop, accessToken: encryptedToken },
      }),
    );

    return { orgId, botId };
  },

  async disconnect(orgId, botId) {
    // Shopify has no token-revocation endpoint for custom apps beyond
    // uninstalling — deleting our stored token is what actually matters
    // for guardrail #5 (no lingering secrets we don't need).
    await withOrgContext(orgId, (tx) =>
      tx.integration.delete({
        where: { botId_provider: { botId, provider: "shopify" } },
      }),
    );
  },
};

registerIntegrationProvider(shopifyProvider);
