import { test, expect } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

const PASSWORD = "hunter2pass";

// Each test signs up fresh (cheap, and keeps tests independent — no
// shared fixture state to leak between them).
async function signUpAndCreateBot(page: import("@playwright/test").Page, botName: string) {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("editor"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.fill('input[name="name"]', botName);
  await page.click('button:has-text("New bot")');
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
}

test("save draft shows a success toast with a working close button", async ({ page }) => {
  await signUpAndCreateBot(page, "Test Bot");
  await page.fill("#persona", "You are a friendly assistant.");
  await page.click('button:has-text("Save draft")');

  const toast = page.getByText("Draft saved.");
  await expect(toast).toBeVisible();

  await page.locator("[data-close-button]").first().click();
  await expect(toast).toBeHidden();
});

test("publish shows a success toast", async ({ page }) => {
  await signUpAndCreateBot(page, "Publish Test Bot");
  await page.click('button:has-text("Publish")');
  await expect(page.getByText("Published")).toBeVisible();
});

test("a tool Checkbox toggles and its state survives a save", async ({ page }) => {
  await signUpAndCreateBot(page, "Checkbox Test Bot");
  const checkbox = page.locator('input[name="tool_search_knowledge_base"]');
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await page.reload();
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
