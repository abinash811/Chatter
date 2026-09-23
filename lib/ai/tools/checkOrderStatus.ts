import { withOrgContext } from "@/lib/db";
import { registerTool, type Tool } from "@/lib/ai/tools/registry";

// Ecommerce vertical template's first action tool. Per the interface/
// connector design rule (docs/architecture.md §2), what fulfills this
// call is swappable: today a direct Shopify Admin API request using the
// business's stored OAuth token (see the Integration model); later this
// could call Shopify's own Customer Accounts MCP server instead, without
// changing this tool's name/schema or anything upstream.
export const checkOrderStatusTool: Tool = {
  name: "check_order_status",
  description:
    "Look up the status of a customer's order by order number. Use this when a visitor asks where their order is or what its status is.",
  inputSchema: {
    type: "object",
    properties: {
      orderNumber: { type: "string", description: "The order number the customer gave." },
    },
    required: ["orderNumber"],
    additionalProperties: false,
  },

  async handle(orgId, botId, input) {
    const orderNumber = input.orderNumber as string;

    const integration = await withOrgContext(orgId, (tx) =>
      tx.integration.findUnique({
        where: { botId_provider: { botId, provider: "shopify" } },
      }),
    );

    // Guardrail #4: no real integration connected yet → collect info and
    // hand off, never fail silently or guess at an answer.
    if (!integration) {
      return JSON.stringify({
        status: "handoff_required",
        reason: "No Shopify store connected for this bot yet.",
        collected: { orderNumber },
      });
    }

    const res = await fetch(
      `https://${integration.shopDomain}/admin/api/2026-01/orders.json?name=${encodeURIComponent(orderNumber)}`,
      { headers: { "X-Shopify-Access-Token": integration.accessToken } },
    );

    if (!res.ok) {
      // A real integration exists but the call failed — still don't
      // hallucinate; hand off rather than guess.
      return JSON.stringify({
        status: "handoff_required",
        reason: `Shopify lookup failed (${res.status}).`,
        collected: { orderNumber },
      });
    }

    const data = (await res.json()) as { orders: unknown[] };
    if (data.orders.length === 0) {
      return JSON.stringify({ status: "not_found", orderNumber });
    }
    return JSON.stringify({ status: "found", order: data.orders[0] });
  },
};

registerTool(checkOrderStatusTool);
