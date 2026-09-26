import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

test("save draft shows a success toast with a working close button", async ({ page }) => {
  await signUpAndCreateBot(page, "Test Bot");
  await page.fill("#persona", "You are a friendly assistant.");
  await page.click('button:has-text("Save draft")');

  const toast = page.getByText("Draft saved.");
  await expect(toast).toBeVisible();

  await page.locator("[data-close-button]").first().click();
  await expect(toast).toBeHidden();
});

test("publish requires confirming in the dialog, then shows a success toast and updates the status badge", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Publish Test Bot");
  await expect(page.getByText("Never published")).toBeVisible();

  // Top-bar "Publish" only opens the confirmation dialog (docs/design/
  // principles.md #10) — it must not publish by itself.
  await page.click('button:has-text("Publish")');
  await expect(page.getByText("Publish this bot?")).toBeVisible();
  await expect(page.getByText("Never published")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText("Published — visitors will see this version now.")).toBeVisible();
  await expect(page.getByText("Publish this bot?")).toBeHidden();
  await expect(page.getByText("Published v1")).toBeVisible();
});

test("Cancel in the publish dialog leaves the bot unpublished", async ({ page }) => {
  await signUpAndCreateBot(page, "Cancel Publish Test Bot");
  await page.click('button:has-text("Publish")');
  await expect(page.getByText("Publish this bot?")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Cancel")');
  await expect(page.getByText("Publish this bot?")).toBeHidden();
  await expect(page.getByText("Never published")).toBeVisible();
});

test("a tool Checkbox (on the Tools tab) toggles and its state survives a save", async ({ page }) => {
  await signUpAndCreateBot(page, "Checkbox Test Bot");
  await page.click('button[role="tab"]:has-text("Tools")');

  const checkbox = page.locator('input[name="tool_search_knowledge_base"]');
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await page.reload();
  await page.click('button[role="tab"]:has-text("Tools")');
  await expect(page.locator('input[name="tool_search_knowledge_base"]')).toBeChecked();
});

// Regression check: passing lib/ai tool objects (which include a
// `handle` function) from the server component into this client
// component used to crash with "Functions cannot be passed directly to
// Client Components" — page.tsx now strips to serializable fields only.
test("bot editor renders without a server/client serialization error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await signUpAndCreateBot(page, "Serialization Test Bot");
  await expect(page.getByText("How should your bot introduce itself")).toBeVisible();
  expect(errors).toEqual([]);
});
