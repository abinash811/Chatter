import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// "Load sample data" (2026-09-27 user directive) — lib/demoData.ts. One
// click populates a brand-new example bot with real persona/knowledge/
// leads/a custom action/conversations, so a non-technical user (or a
// demo audience) sees the product working without a live Claude/Voyage
// key. Each assertion below checks a different console screen actually
// received the seeded content, not just that the bot got created.

test("loading sample data creates a fully populated demo bot", async ({ page }) => {
  await signUpAndCreateBot(page, "My Real Bot");

  await page.goto("/bots");
  await page.getByRole("button", { name: "Load sample data" }).click();
  await page.waitForURL(/\/bots\/[^/]+$/);
  await expect(page.getByText("Published v1")).toBeVisible();

  await page.click('a:has-text("Knowledge")');
  await expect(page.getByRole("heading", { name: "Data sources 3" })).toBeVisible();

  await page.click('a:has-text("Leads")');
  await expect(page.getByRole("heading", { name: "Leads 2" })).toBeVisible();
  await expect(page.getByText("Priya Sharma")).toBeVisible();

  await page.click('a:has-text("Actions")');
  await expect(page.getByRole("heading", { name: "Custom actions 1" })).toBeVisible();
  await expect(page.getByText("check_appointment_availability")).toBeVisible();
  // Disabled by default — its URL is a placeholder, not a real endpoint.
  await expect(page.getByRole("switch")).not.toBeChecked();

  await page.click('a:has-text("Conversations")');
  await expect(page.getByRole("heading", { name: "Conversations 2" })).toBeVisible();
  await expect(page.getByText("Issue", { exact: true })).toBeVisible();
});

test("the bots list keeps a working original bot alongside the new demo bot", async ({ page }) => {
  await signUpAndCreateBot(page, "Keep This Bot");

  await page.goto("/bots");
  await page.getByRole("button", { name: "Load sample data" }).click();
  await page.waitForURL(/\/bots\/[^/]+$/);

  await page.goto("/bots");
  await expect(page.getByRole("heading", { name: "Bots 2" })).toBeVisible();
  await expect(page.getByText("Keep This Bot")).toBeVisible();
  await expect(page.getByText("Demo Support Bot (Sample)")).toBeVisible();
});
