import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedConversations, uniqueEmail, PASSWORD } from "../e2e/helpers";

// Visual regression layer (playwright.config.ts's toHaveScreenshot,
// see playwright.visual.config.ts for the known cross-environment
// caveat). Closes the "I manually eyeball a screenshot each time, with
// nothing automated behind it" gap from the 2026-09-25 "critique the
// automated setup" discussion. Separate from tests/e2e/'s functional
// specs — this only asserts pixels didn't unexpectedly move, not
// behavior.
//
// Note: the old "bots list — empty state" baseline is gone, not just
// renamed — ADR 0012's onboarding flow always creates a first bot, and
// no bot-delete feature exists yet, so that empty state is no longer
// reachable through any real user journey (see tests/e2e/bots-
// list.spec.ts's same note). Replaced with the onboarding screen and
// the settings page, both genuinely new.

test("login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login.png");
});

test("signup page", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveScreenshot("signup.png");
});

test("onboarding screen", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-onboarding"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page).toHaveScreenshot("onboarding.png", { mask: [page.locator("#orgName")] });
});

test("bots list — with a bot (Created column masked, it's a relative timestamp)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-table");
  await page.goto("/bots");

  await expect(page).toHaveScreenshot("bots-table.png", {
    mask: [page.locator('[data-slot="table-body"] tr td:nth-child(3)')],
  });
});

test("bot editor page (embed snippet masked — it embeds a random public key)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-editor");
  await expect(page).toHaveScreenshot("bot-editor.png", { mask: [page.locator("pre")] });
});

test("bot editor — publish confirmation dialog (docs/design/principles.md #10)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-publish-dialog");
  await page.click('button:has-text("Publish")');
  await expect(page.getByText("Publish this bot?")).toBeVisible();

  await expect(page).toHaveScreenshot("bot-editor-publish-dialog.png");
});

test("knowledge base — empty state and Add Q&A dialog", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-knowledge");

  await page.click('a:has-text("Knowledge")');
  await expect(page).toHaveURL(/\/knowledge$/);
  await expect(page).toHaveScreenshot("knowledge-empty.png");

  // Add Q&A/Upload file/Add URL (ADR 0013) now live behind one "Add"
  // DropdownMenu instead of a single button.
  await page.click('button:has-text("Add")');
  await page.click('div[role="menu"] >> text="Add Q&A"');
  await expect(page.getByRole("heading", { name: "Add a question and answer" })).toBeVisible();
  await expect(page).toHaveScreenshot("knowledge-add-dialog.png");
});

test("settings page", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-settings");
  await page.click('a:has-text("Settings")');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page).toHaveScreenshot("settings.png", { mask: [page.locator("#orgName")] });
});

test("conversations list — with seeded conversations (Started column masked, it's a relative timestamp)", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Support bot", "visual-conversations");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.click('a:has-text("Conversations")');
  await expect(page).toHaveURL(/\/conversations$/);
  await expect(page).toHaveScreenshot("conversations-list.png", {
    mask: [page.locator('[data-slot="table-body"] tr td:last-child')],
  });
});

test("conversation detail — full transcript with an inline tool call (ADR 0015)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-conversation-detail");
  const botId = page.url().split("/bots/")[1];
  const { issueConversationId } = await seedConversations(botId);

  await page.goto(`/conversations/${issueConversationId}`);
  await expect(page).toHaveScreenshot("conversation-detail.png", {
    // Every relative timestamp in the thread ("Visitor · 4m ago", the
    // tool call's own timestamp) and the header's "Started X ago" — all
    // real wall-clock-relative text, same masking rationale as bots-
    // table.png's Created column.
    mask: [page.locator(".text-xs.text-muted-foreground"), page.getByText(/^Started /)],
  });
});

test("console sidebar — icon-collapsed", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-sidebar");

  await page.click('[data-slot="sidebar-trigger"]');
  await page.waitForTimeout(250); // the collapse transition (app/globals.css) is 200ms
  await expect(page).toHaveScreenshot("sidebar-collapsed.png");
});
