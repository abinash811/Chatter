import { withOrgContext } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { registerTool, type Tool } from "@/lib/ai/tools/registry";
import { createPendingAction } from "@/lib/pendingActions";

// Ecommerce vertical's third write-capable tool (docs/roadmap.md's "More
// write-capable action tools" — "issue a refund" was the named example),
// same human-approval pattern as cancelOrder.ts (ADR 0023): a real refund
// is a real money movement, so the model never issues it directly.
// `handle()` only validates the order and queues a PendingAction;
// `executeRefund` (called from the approvals console action) is what
// actually calls Shopify once a human approves.

interface ShopifyOrderLookup {
  id: number;
  financial_status: string;
  total_price: string;
}

interface ShopifyTransaction {
  id: number;
  kind: string;
  status: string;
  gateway: string;
}

async function lookupOrder(
  shopDomain: string,
  accessToken: string,
  orderNumber: string,
): Promise<ShopifyOrderLookup | null> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/2026-01/orders.json?name=${encodeURIComponent(orderNumber)}`,
    { headers: { "X-Shopify-Access-Token": accessToken } },
  );
  if (!res.ok) throw new Error(`Shopify order lookup failed (${res.status}).`);
  const data = (await res.json()) as { orders: ShopifyOrderLookup[] };
  return data.orders[0] ?? null;
}

export const requestRefundTool: Tool = {
  name: "request_refund",
  description:
    "Request a full refund of a customer's order by order number. This never issues the refund immediately — it queues the request for a team member to review and approve, since a real refund moves real money and can't be undone. Use this when a visitor asks for a refund.",
  inputSchema: {
    type: "object",
    properties: {
      orderNumber: { type: "string", description: "The order number the customer gave." },
      reason: { type: "string", description: "Why the visitor wants a refund, in their own words, if given." },
    },
    required: ["orderNumber"],
    additionalProperties: false,
  },

  async handle(orgId, botId, input, conversationId) {
    const orderNumber = input.orderNumber as string;
    const reason = input.reason as string | undefined;

    // ADR 0038: org-level, not per-bot.
    const integration = await withOrgContext(orgId, (tx) =>
      tx.integration.findUnique({ where: { orgId_provider: { orgId, provider: "shopify" } } }),
    );
    if (!integration) {
      return JSON.stringify({
        status: "handoff_required",
        reason: "No Shopify store connected yet.",
        collected: { orderNumber, reason },
      });
    }

    let order: ShopifyOrderLookup | null;
    try {
      order = await lookupOrder(integration.shopDomain!, decrypt(integration.accessToken), orderNumber);
    } catch (err) {
      return JSON.stringify({
        status: "handoff_required",
        reason: err instanceof Error ? err.message : "Shopify lookup failed.",
        collected: { orderNumber, reason },
      });
    }

    if (!order) {
      return JSON.stringify({ status: "not_found", orderNumber });
    }
    if (order.financial_status === "refunded") {
      return JSON.stringify({ status: "already_refunded", orderNumber });
    }

    await createPendingAction(orgId, botId, conversationId ?? "unknown", "request_refund", {
      orderNumber,
      reason,
    });

    return JSON.stringify({
      status: "pending_approval",
      orderNumber,
      message: "A team member will review this request before the refund is actually issued.",
    });
  },

  describeForInbox(input, output) {
    const orderNumber = input.orderNumber as string;
    const parsed = JSON.parse(output) as { status: string; reason?: string };
    switch (parsed.status) {
      case "pending_approval":
        return { summary: `Requested a refund for order #${orderNumber} — waiting on approval.`, isIssue: true };
      case "already_refunded":
        return { summary: `Order #${orderNumber} was already refunded.`, isIssue: false };
      case "not_found":
        return { summary: `Tried to refund order #${orderNumber} — no matching order found.`, isIssue: true };
      default: {
        const reason = (parsed.reason ?? "couldn't complete the request").replace(/\.$/, "");
        return {
          summary: `Tried to refund order #${orderNumber} — ${reason}. Handed off to a human.`,
          isIssue: true,
        };
      }
    }
  },
};

registerTool(requestRefundTool);

// The approved-execution step. Shopify's GraphQL Admin API, same caveat
// as executeOrderCancellation (cancelOrder.ts): shopify.dev and every
// mirror/community-forum domain tried are blocked by this environment's
// network egress policy (confirmed via repeated direct WebFetch
// attempts), so the mutation shape here is pieced together from
// WebSearch result summaries, not read from the primary source — the
// field names (orderId, refundLineItems{lineItemId,quantity},
// transactions{parentId,amount,kind,gateway}, notify) are consistent
// across multiple independent summaries, but this is unverified against
// a live store, same as orderCancel.
export async function executeRefund(
  orgId: string,
  input: { orderNumber: string; reason?: string },
): Promise<{ status: "executed" | "failed"; detail: string }> {
  // ADR 0038: org-level, not per-bot.
  const integration = await withOrgContext(orgId, (tx) =>
    tx.integration.findUnique({ where: { orgId_provider: { orgId, provider: "shopify" } } }),
  );
  if (!integration) return { status: "failed", detail: "No Shopify store connected." };

  const accessToken = decrypt(integration.accessToken);
  const shopDomain = integration.shopDomain!;

  let order: ShopifyOrderLookup | null;
  try {
    order = await lookupOrder(shopDomain, accessToken, input.orderNumber);
  } catch (err) {
    return { status: "failed", detail: err instanceof Error ? err.message : "Shopify lookup failed." };
  }
  if (!order) return { status: "failed", detail: `Order #${input.orderNumber} no longer found in Shopify.` };
  if (order.financial_status === "refunded") {
    return { status: "failed", detail: `Order #${input.orderNumber} was already refunded.` };
  }

  // The refund transaction needs a parent to refund through (the
  // original payment method) — find the order's successful sale/capture
  // transaction via the REST transactions endpoint.
  const txRes = await fetch(`https://${shopDomain}/admin/api/2026-01/orders/${order.id}/transactions.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!txRes.ok) return { status: "failed", detail: `Couldn't look up order #${input.orderNumber}'s payment transactions.` };
  const txData = (await txRes.json()) as { transactions: ShopifyTransaction[] };
  const parentTransaction = txData.transactions.find(
    (t) => (t.kind === "sale" || t.kind === "capture") && t.status === "success",
  );
  if (!parentTransaction) {
    return { status: "failed", detail: `No completed payment found on order #${input.orderNumber} to refund.` };
  }

  const mutation = `
    mutation refundCreate($input: RefundInput!) {
      refundCreate(input: $input) {
        refund { id }
        userErrors { field message }
      }
    }
  `;

  const res = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          orderId: `gid://shopify/Order/${order.id}`,
          notify: true,
          note: input.reason ?? "Requested via chat, approved by a team member.",
          transactions: [
            {
              orderId: `gid://shopify/Order/${order.id}`,
              parentId: `gid://shopify/OrderTransaction/${parentTransaction.id}`,
              amount: order.total_price,
              kind: "REFUND",
              gateway: parentTransaction.gateway,
            },
          ],
        },
      },
    }),
  });
  if (!res.ok) return { status: "failed", detail: `Shopify refund request failed (${res.status}).` };

  const data = (await res.json()) as {
    data?: { refundCreate?: { userErrors: { message: string }[] } };
    errors?: { message: string }[];
  };
  if (data.errors?.length) return { status: "failed", detail: data.errors.map((e) => e.message).join("; ") };
  const userErrors = data.data?.refundCreate?.userErrors ?? [];
  if (userErrors.length > 0) return { status: "failed", detail: userErrors.map((e) => e.message).join("; ") };

  return {
    status: "executed",
    detail: `Refund of ${order.total_price} submitted to Shopify for order #${input.orderNumber}.`,
  };
}
