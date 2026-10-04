import { withOrgContext } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { registerIntegrationProvider, type IntegrationProvider } from "@/lib/integrations/provider";

// First concrete adapter for the generic connect/disconnect interface.
// Base scopes per docs/research/competitive-landscape.md's finding on
// how Zipchat's own Shopify app is scoped: read_products (knowledge base)
// + read_orders (check_order_status). write_orders added 2026-09-28
// (ADR 0023) for request_order_cancellation's approved-execution step —
// hard to reverse: a store connected before this change is still
// running on the old, narrower grant and must reconnect (redo OAuth)
// before order cancellation can work for them; there's no way to
// silently upgrade an existing token's scope.
const SCOPES = "read_products,read_orders,write_orders";

function encodeState(orgId: string): string {
  // TODO: sign this once a secrets/signing utility exists — a bare
  // base64 payload is enough to establish the flow, not yet CSRF-hardened.
  return Buffer.from(JSON.stringify({ orgId })).toString("base64url");
}

function decodeState(state: string): { orgId: string } {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
}

export const shopifyProvider: IntegrationProvider = {
  name: "shopify",
  displayName: "Shopify",
  connectFields: [
    { name: "shopDomain", label: "Shop domain", placeholder: "my-store.myshopify.com" },
  ],

  getAuthorizeUrl(orgId, input) {
    const redirectUri = `${process.env.APP_BASE_URL}/api/integrations/shopify/callback`;
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state: encodeState(orgId),
    });
    return `https://${input.shopDomain}/admin/oauth/authorize?${params.toString()}`;
  },

  async handleCallback(params) {
    const { orgId } = decodeState(params.get("state")!);
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

    // ADR 0038: org-level, not per-bot — one Shopify connection shared
    // by every bot in the org.
    await withOrgContext(orgId, (tx) =>
      tx.integration.upsert({
        where: { orgId_provider: { orgId, provider: "shopify" } },
        create: { orgId, provider: "shopify", shopDomain: shop, accessToken: encryptedToken },
        update: { shopDomain: shop, accessToken: encryptedToken },
      }),
    );

    return { orgId };
  },

  async disconnect(orgId) {
    // Shopify has no token-revocation endpoint for custom apps beyond
    // uninstalling — deleting our stored token is what actually matters
    // for guardrail #5 (no lingering secrets we don't need).
    await withOrgContext(orgId, (tx) =>
      tx.integration.delete({
        where: { orgId_provider: { orgId, provider: "shopify" } },
      }),
    );
  },
};

registerIntegrationProvider(shopifyProvider);
