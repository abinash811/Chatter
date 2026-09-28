import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedConversations, createSecondBot } from "./helpers";

// ADR 0015: the conversation inbox is dashboard-only for v1, no email/
// Slack channel. Conversations can't be created through the console UI
// (they're only written by the widget chat API, which needs a real
// ANTHROPIC_API_KEY — a placeholder in this environment, same class of
// gap documented for knowledge.spec.ts's embeddings call), so every spec
// here seeds via seedConversations (tests/e2e/helpers.ts) rather than
// driving a real chat turn. ADR 0016: "Issue" (not "Handoff") is the
// user-facing term, and tool calls show a plain-language summary by
// default — the raw toolName/JSON only appears once "Technical details"
// is expanded.

test("empty state before any conversation exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Inbox Bot");
  await page.goto("/conversations");
  await expect(page.getByText("No conversations yet")).toBeVisible();
});

test("seeded conversations appear in the list with the right issue indicator", async ({ page }) => {
  await signUpAndCreateBot(page, "Inbox Bot");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.goto("/conversations");
  await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();
  await expect(page.locator("table tbody tr")).toHaveCount(2);
  await expect(page.locator("table tbody").getByText("Issue", { exact: true })).toBeVisible();
});

test("has-an-issue filter narrows the list to just the issue conversation", async ({ page }) => {
  await signUpAndCreateBot(page, "Issue Filter Bot");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.goto("/conversations");
  await page.locator("#issues-only").click();
  await expect(page).toHaveURL(/issues=1/);
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  await expect(page.locator("table tbody").getByText("Issue", { exact: true })).toBeVisible();
});

test("bot filter narrows the list to only the selected bot's conversations", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot With Conversations");
  const botIdA = page.url().split("/bots/")[1];
  await seedConversations(botIdA);

  // A second bot in the same org, with no conversations of its own.
  await createSecondBot(page, "Bot Without Conversations");

  await page.goto("/conversations");
  await expect(page.locator("table tbody tr")).toHaveCount(2);

  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.locator('[data-slot="select-item"]', { hasText: "Bot Without Conversations" }).click();
  await expect(page).toHaveURL(/botId=/);
  await expect(page.getByText("No conversations yet")).toBeVisible();
});

test("clicking a conversation row opens the full transcript with a plain-language tool call summary", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Detail View Bot");
  const botId = page.url().split("/bots/")[1];
  const { issueConversationId } = await seedConversations(botId);

  await page.goto("/conversations");
  await page.locator("#issues-only").click();
  await expect(page).toHaveURL(/issues=1/);
  await page.locator("table tbody tr").first().click();
  await expect(page).toHaveURL(new RegExp(`/conversations/${issueConversationId}$`));

  await expect(page.getByText("Where is my order #ORD1234?")).toBeVisible();
  await expect(page.getByText(/Handed off to a human/)).toBeVisible();
  await expect(page.getByText("Issue", { exact: true })).toBeVisible();

  // The raw toolName/JSON is real (guardrail #6 traceability) but tucked
  // behind a disclosure, not shown by default to a non-technical reviewer.
  await expect(page.getByText("check_order_status")).not.toBeVisible();
  await page.click("summary:has-text('Technical details')");
  await expect(page.getByText("check_order_status")).toBeVisible();
});

// docs/design/audit.md depth/polish pass, 2026-09-28: a plain onClick
// on the row (no tabIndex/role/onKeyDown) wasn't keyboard-reachable —
// the same gap BotTableRow.tsx already fixed, never applied here.
test("a conversation row is keyboard-reachable, not just clickable", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Nav Bot");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.goto("/conversations");
  const row = page.locator('tbody [data-slot="table-row"]').first();
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/conversations\/[^/]+$/);
});

test("a conversation from another org is not reachable by id (tenant isolation)", async ({ page, browser }) => {
  await signUpAndCreateBot(page, "Org A Bot");
  const botIdA = page.url().split("/bots/")[1];
  const { normalConversationId } = await seedConversations(botIdA);

  // A second, unrelated org signs up in a fresh context (own cookies).
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signUpAndCreateBot(otherPage, "Org B Bot");

  await otherPage.goto(`/conversations/${normalConversationId}`);
  await expect(otherPage.getByText("Something went wrong")).toBeVisible();

  await otherContext.close();
});
