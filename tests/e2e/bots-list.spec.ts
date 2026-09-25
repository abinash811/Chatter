import { test, expect } from "@playwright/test";

// The Table rebuild (components/console/BotsTable.tsx, real CARE Table,
// ADR 0008) is a client component only for its row-click handler — this
// is exactly the kind of thing worth a permanent regression spec rather
// than a one-off manual check.

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

const PASSWORD = "hunter2pass";

test("new bot appears in the table and its row navigates to the editor", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("botstable"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.fill('input[name="name"]', "Support bot");
  await Promise.all([page.waitForURL(/\/bots\/[^/]+$/), page.click('button:has-text("New bot")')]);

  await page.goto("/bots");
  const row = page.locator('[data-slot="table-row"]', { hasText: "Support bot" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Draft only")).toBeVisible();

  await row.click();
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
});

test("empty state shows before any bot exists", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("botsempty"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await expect(page.getByText("No bots yet")).toBeVisible();
  await expect(page.locator('[data-slot="table"]')).toHaveCount(0);
});
