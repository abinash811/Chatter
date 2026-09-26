import { type Page, expect } from "@playwright/test";
import { withOrgContext, getOrgIdForBot } from "@/lib/db";

// Shared across every e2e spec that needs a signed-up, onboarded user
// with a first bot — extracted here (ADR 0012's onboarding change is
// what motivated it) so a future flow change touches one file, not six.

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export const PASSWORD = "hunter2pass";

// Signs up, completes onboarding (org name left at its prefilled
// default — most specs don't care), and lands on the new bot's editor.
export async function signUpAndCreateBot(page: Page, botName: string, emailPrefix = "e2e"): Promise<void> {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail(emailPrefix));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.fill("#botName", botName);
  await page.click('button:has-text("Continue")');
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
}

// ADR 0015: conversations are only ever created via the widget chat API
// (app/api/chat/route.ts), which requires a real ANTHROPIC_API_KEY —
// same placeholder-key gap documented for the knowledge base's
// embeddings call (tests/e2e/knowledge.spec.ts). Seeding directly via
// Prisma, scoped through the same RLS mechanism the app itself uses
// (withOrgContext from lib/db.ts — never a second PrismaClient here,
// see check-tenant-isolation.mjs), stands in for a real chat turn —
// same pattern as knowledge.spec.ts's directly-seeded entry.
// getOrgIdForBot (lib/db.ts) is how this resolves a bot's orgId before
// app.org_id can be set, the same bootstrapping problem the app itself
// solves via BotPublicKey, the one table exempt from RLS.
export async function seedConversations(
  botId: string,
): Promise<{ normalConversationId: string; issueConversationId: string }> {
  const orgId = await getOrgIdForBot(botId);
  const draft = await withOrgContext(orgId, (tx) => tx.botConfigVersion.findFirstOrThrow({ where: { botId } }));

  const normal = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId: draft.id } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.createMany({
      data: [
        { orgId, conversationId: normal.id, role: "user", content: "Do you sell blue widgets?" },
        { orgId, conversationId: normal.id, role: "assistant", content: "Yes, in stock at $19.99." },
      ],
    }),
  );

  const withIssue = await withOrgContext(orgId, (tx) =>
    tx.conversation.create({ data: { orgId, botId, configVersionId: draft.id } }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.message.createMany({
      data: [
        { orgId, conversationId: withIssue.id, role: "user", content: "Where is my order #ORD1234?" },
        {
          orgId,
          conversationId: withIssue.id,
          role: "assistant",
          content: "I've noted your order number and will connect you with a human.",
        },
      ],
    }),
  );
  await withOrgContext(orgId, (tx) =>
    tx.toolCallLog.create({
      data: {
        orgId,
        conversationId: withIssue.id,
        toolName: "check_order_status",
        input: { orderNumber: "ORD1234" },
        output: JSON.stringify({
          status: "handoff_required",
          reason: "No Shopify store connected for this bot yet.",
          collected: { orderNumber: "ORD1234" },
        }),
      },
    }),
  );

  return { normalConversationId: normal.id, issueConversationId: withIssue.id };
}
