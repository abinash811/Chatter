import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedConversations, createSecondBot } from "./helpers";

// ADR 0027: split-pane Activity layout (list left, Chat/Details panel
// right) — recreated from Chatbase's own real docs, not guessed. ADR
// 0015: the conversation inbox is dashboard-only for v1, no email/
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
  const list = page.locator('[data-slot="conversation-list"]');
  await expect(list.locator("> li")).toHaveCount(3);
  await expect(list.getByText("Issue", { exact: true })).toBeVisible();
  await expect(list.getByText("Paused", { exact: true })).toBeVisible();
});

test("has-an-issue filter narrows the list to just the issue conversation", async ({ page }) => {
  await signUpAndCreateBot(page, "Issue Filter Bot");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.goto("/conversations");
  await page.locator("#issues-only").click();
  await expect(page).toHaveURL(/issues=1/);
  const list = page.locator('[data-slot="conversation-list"]');
  await expect(list.locator("> li")).toHaveCount(1);
  await expect(list.getByText("Issue", { exact: true })).toBeVisible();
});

test("status filter narrows the list to just the paused conversation", async ({ page }) => {
  await signUpAndCreateBot(page, "Status Filter Bot");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.goto("/conversations");
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Paused" }).click();
  await expect(page).toHaveURL(/status=paused/);
  const list = page.locator('[data-slot="conversation-list"]');
  await expect(list.locator("> li")).toHaveCount(1);
  await expect(list.getByText("Paused", { exact: true })).toBeVisible();
});

test("bot filter narrows the list to only the selected bot's conversations", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot With Conversations");
  const botIdA = page.url().split("/bots/")[1];
  await seedConversations(botIdA);

  // A second bot in the same org, with no conversations of its own.
  await createSecondBot(page, "Bot Without Conversations");

  await page.goto("/conversations");
  await expect(page.locator('[data-slot="conversation-list"] > li')).toHaveCount(3);

  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.locator('[data-slot="select-item"]', { hasText: "Bot Without Conversations" }).click();
  await expect(page).toHaveURL(/botId=/);
  await expect(page.getByText("No conversations yet")).toBeVisible();
});

test("clicking a conversation opens the Chat tab with a plain-language tool call summary", async ({ page }) => {
  await signUpAndCreateBot(page, "Detail View Bot");
  const botId = page.url().split("/bots/")[1];
  const { issueConversationId } = await seedConversations(botId);

  await page.goto("/conversations");
  await page.getByText("Where is my order").click();
  await expect(page).toHaveURL(new RegExp(`/conversations/${issueConversationId}$`));

  const chatPanel = page.getByRole("tabpanel", { name: "Chat" });
  await expect(chatPanel.getByText("Where is my order #ORD1234?")).toBeVisible();
  await expect(chatPanel.getByText(/Handed off to a human/)).toBeVisible();

  // The raw toolName/JSON is real (guardrail #6 traceability) but tucked
  // behind a disclosure, not shown by default to a non-technical reviewer.
  await expect(chatPanel.getByText("check_order_status")).not.toBeVisible();
  await page.click("summary:has-text('Technical details')");
  await expect(chatPanel.getByText("check_order_status")).toBeVisible();
});

test("Details tab shows Source, Status, and honest Not analyzed/Not tracked states", async ({ page }) => {
  await signUpAndCreateBot(page, "Details Tab Bot");
  const botId = page.url().split("/bots/")[1];
  const { normalConversationId } = await seedConversations(botId);

  await page.goto(`/conversations/${normalConversationId}`);
  await page.getByRole("tab", { name: "Details" }).click();
  const detailsPanel = page.getByRole("tabpanel");
  await expect(detailsPanel.getByText("Anonymous")).toBeVisible();
  await expect(detailsPanel.getByText("Widget", { exact: true })).toBeVisible();
  await expect(detailsPanel.getByText("Ongoing")).toBeVisible();
  await expect(detailsPanel.getByText("Not analyzed")).toBeVisible();
  await expect(detailsPanel.getByText("Not tracked")).toBeVisible();
  await expect(detailsPanel.getByText(normalConversationId)).toBeVisible();
});

test("pausing and resuming a conversation flips its status live", async ({ page }) => {
  await signUpAndCreateBot(page, "Pause Resume Bot");
  const botId = page.url().split("/bots/")[1];
  const { normalConversationId } = await seedConversations(botId);

  await page.goto(`/conversations/${normalConversationId}`);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Conversation paused.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Conversation resumed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("bulk select shows checkboxes and a selection count", async ({ page }) => {
  await signUpAndCreateBot(page, "Bulk Select Bot");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.goto("/conversations");
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByText("Select", { exact: true }).click();

  const checkboxes = page.locator('[data-slot="conversation-list"] button[role="checkbox"]');
  await expect(checkboxes).toHaveCount(3);
  await checkboxes.first().click();
  await checkboxes.nth(1).click();
  await expect(page.getByText("2 selected")).toBeVisible();
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
