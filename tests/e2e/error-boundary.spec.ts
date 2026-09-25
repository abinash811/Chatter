import { test, expect } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

test("a real thrown error (nonexistent bot) shows the plain-language error boundary", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("errbound"));
  await page.fill('input[name="password"]', "hunter2pass");
  await page.fill('input[name="confirmPassword"]', "hunter2pass");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.goto("/bots/nonexistent-bot-id");
  await expect(page.getByText("Something went wrong")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
