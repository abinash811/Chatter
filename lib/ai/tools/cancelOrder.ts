import { withOrgContext } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { registerTool, type Tool } from "@/lib/ai/tools/registry";
import { createPendingAction } from "@/lib/pendingActions";

// Ecommerce vertical's second write-capable tool, and the first one
// gated by human approval (ADR 0023) — cancelling a real order is
// irreversible on Shopify's side, so the model never does it directly.
// `handle()` only validates the request and queues a PendingAction;
// `executeOrderCancellation` (called from the approvals console action,
// never from here — see lib/pendingActions.ts's own header comment on
// why not) is what actually calls Shopify once a human approves.

interface ShopifyOrderLookup {
  id: number;
  cancelled_at: string | null;
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

export const requestOrderCancellationTool: Tool = {
  name: "request_order_cancellation",
  description:
    "Request cancellation of a customer's order by order number. This never cancels the order immediately — it queues the request for a team member to review and approve, since cancelling a real order can't be undone. Use this when a visitor asks to cancel an order.",
  inputSchema: {
    type: "object",
    properties: {
      orderNumber: { type: "string", description: "The order number the customer gave." },
      reason: { type: "string", description: "Why the visitor wants to cancel, in their own words, if given." },
    },
    required: ["orderNumber"],
    additionalProperties: false,
  },

  async handle(orgId, botId, input, conversationId) {
    const orderNumber = input.orderNumber as string;
    const reason = input.reason as string | undefined;

    const integration = await withOrgContext(orgId, (tx) =>
      tx.integration.findUnique({ where: { botId_provider: { botId, provider: "shopify" } } }),
    );
    if (!integration) {
      return JSON.stringify({
        status: "handoff_required",
        reason: "No Shopify store connected for this bot yet.",
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
    if (order.cancelled_at) {
      return JSON.stringify({ status: "already_cancelled", orderNumber });
    }

    // conversationId is always set by the real chat loop (lib/ai/
    // chat.ts) — the fallback only matters for a caller outside that
    // loop, which shouldn't be proposing a real cancellation anyway.
    await createPendingAction(orgId, botId, conversationId ?? "unknown", "request_order_cancellation", {
      orderNumber,
      reason,
    });

    return JSON.stringify({
      status: "pending_approval",
      orderNumber,
      message: "A team member will review this request before the order is actually cancelled.",
    });
  },

  describeForInbox(input, output) {
    const orderNumber = input.orderNumber as string;
    const parsed = JSON.parse(output) as { status: string; reason?: string };
    switch (parsed.status) {
      case "pending_approval":
        return { summary: `Requested cancellation of order #${orderNumber} — waiting on approval.`, isIssue: true };
      case "already_cancelled":
        return { summary: `Order #${orderNumber} was already cancelled.`, isIssue: false };
      case "not_found":
        return { summary: `Tried to cancel order #${orderNumber} — no matching order found.`, isIssue: true };
      default: {
        const reason = (parsed.reason ?? "couldn't complete the request").replace(/\.$/, "");
        return {
          summary: `Tried to cancel order #${orderNumber} — ${reason}. Handed off to a human.`,
          isIssue: true,
        };
      }
    }
  },
};

registerTool(requestOrderCancellationTool);

// The approved-execution step — Shopify's GraphQL Admin API, not the
// legacy REST endpoint (deprecated for new work since October 2024; see
// ADR 0023). Built from WebSearch-derived understanding of `orderCancel`
// since shopify.dev itself is blocked by this environment's network
// egress policy (confirmed via a direct WebFetch attempt) — the mutation
// shape (orderId/reason/refundMethod/restock/notifyCustomer/staffNote,
// an async job, orderCancelUserErrors) is real, but unverified against a
// live store, same caveat as every other Shopify call in this codebase
// (no store has ever been connected in this environment either).
export async function executeOrderCancellation(
  orgId: string,
  botId: string,
  input: { orderNumber: string; reason?: string },
): Promise<{ status: "executed" | "failed"; detail: string }> {
  const integration = await withOrgContext(orgId, (tx) =>
    tx.integration.findUnique({ where: { botId_provider: { botId, provider: "shopify" } } }),
  );
  if (!integration) return { status: "failed", detail: "No Shopify store connected for this bot." };

  const accessToken = decrypt(integration.accessToken);
  let order: ShopifyOrderLookup | null;
  try {
    order = await lookupOrder(integration.shopDomain!, accessToken, input.orderNumber);
  } catch (err) {
    return { status: "failed", detail: err instanceof Error ? err.message : "Shopify lookup failed." };
  }
  if (!order) return { status: "failed", detail: `Order #${input.orderNumber} no longer found in Shopify.` };
  if (order.cancelled_at) return { status: "failed", detail: `Order #${input.orderNumber} was already cancelled.` };

  const mutation = `
    mutation cancelOrder(
      $orderId: ID!
      $reason: OrderCancelReason!
      $refundMethod: OrderCancelRefundMethodInput!
      $restock: Boolean!
      $notifyCustomer: Boolean
      $staffNote: String
    ) {
      orderCancel(
        orderId: $orderId
        reason: $reason
        refundMethod: $refundMethod
        restock: $restock
        notifyCustomer: $notifyCustomer
        staffNote: $staffNote
      ) {
        job { id done }
        orderCancelUserErrors { field message code }
      }
    }
  `;

  const res = await fetch(`https://${integration.shopDomain}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: mutation,
      variables: {
        orderId: `gid://shopify/Order/${order.id}`,
        reason: "CUSTOMER",
        refundMethod: { originalPaymentMethodsRefund: true },
        restock: true,
        notifyCustomer: true,
        staffNote: input.reason ?? "Requested via chat, approved by a team member.",
      },
    }),
  });
  if (!res.ok) return { status: "failed", detail: `Shopify cancellation request failed (${res.status}).` };

  const data = (await res.json()) as {
    data?: { orderCancel?: { orderCancelUserErrors: { message: string }[] } };
    errors?: { message: string }[];
  };
  if (data.errors?.length) return { status: "failed", detail: data.errors.map((e) => e.message).join("; ") };
  const userErrors = data.data?.orderCancel?.orderCancelUserErrors ?? [];
  if (userErrors.length > 0) return { status: "failed", detail: userErrors.map((e) => e.message).join("; ") };

  return {
    status: "executed",
    detail: `Cancellation submitted to Shopify for order #${input.orderNumber} — Shopify processes it asynchronously.`,
  };
}
