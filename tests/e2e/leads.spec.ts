import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, createSecondBot, seedLead } from "./helpers";

// ADR 0038 (2026-10-04): /leads is org-wide now, not bot-scoped — same
// pattern as /conversations (global nav item, optional ?botId= filter,
// a "Bot" column per row). This file used to test a bot-scoped page.

test("leads page shows the empty state before any lead exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Leads Bot");
  await page.click('a:has-text("Leads")');
  await expect(page.getByText("No leads yet")).toBeVisible();
});

test("seeded leads appear in the list, most recent first, with their bot", async ({ page }) => {
  await signUpAndCreateBot(page, "Leads Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedLead(botId, { name: "Jane Doe", email: "jane@example.com", phone: "555-0100", note: "Wants a demo" });
  await seedLead(botId, { email: "anon@example.com" });

  await page.click('a:has-text("Leads")');
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page.getByRole("heading", { name: "Leads 2" })).toBeVisible();

  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(2);
  // Most recently created (anon@example.com, seeded second) sorts first.
  await expect(rows.nth(0)).toContainText("anon@example.com");
  await expect(rows.nth(1)).toContainText("Jane Doe");
  await expect(rows.nth(1)).toContainText("555-0100");
  await expect(rows.nth(1)).toContainText("Wants a demo");
  await expect(rows.nth(1)).toContainText("Leads Bot");
  // A lead with no name renders the empty-cell dash, not a blank cell.
  await expect(rows.nth(0)).toContainText("—");
});

test("the bot filter narrows the list to one bot's leads", async ({ page }) => {
  await signUpAndCreateBot(page, "Alpha Leads Bot", "leads-filter");
  const alphaId = page.url().match(/\/bots\/([^/]+)/)![1];
  await createSecondBot(page, "Beta Leads Bot");
  const betaId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedLead(alphaId, { name: "Alpha Lead" });
  await seedLead(betaId, { name: "Beta Lead" });

  await page.goto("/leads");
  await expect(page.locator("table tbody tr")).toHaveCount(2);

  await page.getByRole("combobox", { name: "Filter by bot" }).click();
  await page.getByRole("option", { name: "Alpha Leads Bot" }).click();

  await expect(page).toHaveURL(/botId=/);
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Alpha Lead");
});

test("a bot's leads are reachable from the console nav", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Leads Bot");
  await page.click('a:has-text("Leads")');
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page.getByRole("heading", { name: "Leads", exact: true })).toBeVisible();
});
