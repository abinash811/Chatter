import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedLead } from "./helpers";

test("leads page shows the empty state before any lead exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Leads Bot");
  await page.click('a:has-text("Leads")');
  await expect(page.getByText("No leads yet")).toBeVisible();
});

test("seeded leads appear in the list, most recent first", async ({ page }) => {
  await signUpAndCreateBot(page, "Leads Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedLead(botId, { name: "Jane Doe", email: "jane@example.com", phone: "555-0100", note: "Wants a demo" });
  await seedLead(botId, { email: "anon@example.com" });

  await page.click('a:has-text("Leads")');
  await expect(page.getByRole("heading", { name: "Leads 2" })).toBeVisible();

  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(2);
  // Most recently created (anon@example.com, seeded second) sorts first.
  await expect(rows.nth(0)).toContainText("anon@example.com");
  await expect(rows.nth(1)).toContainText("Jane Doe");
  await expect(rows.nth(1)).toContainText("555-0100");
  await expect(rows.nth(1)).toContainText("Wants a demo");
  // A lead with no name renders the empty-cell dash, not a blank cell.
  await expect(rows.nth(0)).toContainText("—");
});

test("a bot's leads are reachable from the bot editor's sidebar nav", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Leads Bot");
  await page.click('a:has-text("Leads")');
  await expect(page).toHaveURL(/\/bots\/[^/]+\/leads$/);
  await expect(page.getByRole("heading", { name: "Leads", exact: true })).toBeVisible();
});
