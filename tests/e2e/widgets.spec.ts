import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedWidget } from "./helpers";

// ADR 0028: in-chat interactive widgets — the console CRUD side.
// Runtime rendering in the actual chat (public/widget.js/PreviewSheet.tsx)
// needs a real model tool call, which needs a real ANTHROPIC_API_KEY (a
// placeholder in this environment) — same class of gap already
// documented for conversations.spec.ts/knowledge.spec.ts, so this file
// covers the console's own CRUD surface, not a live triggered form.

test("widgets page shows the empty state before any widget exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Widgets Bot");
  await page.click('a:has-text("Widgets")');
  await expect(page.getByText("No widgets yet")).toBeVisible();
});

test("seeded widgets appear in the list", async ({ page }) => {
  await signUpAndCreateBot(page, "Widgets Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedWidget(botId, { name: "booking_form", triggerDescription: "Collect booking details." });

  await page.click('a:has-text("Widgets")');
  await expect(page.getByRole("heading", { name: "Widgets 1" })).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("booking_form");
  await expect(rows.first()).toContainText("1 field");
});

test("adding a widget through the dialog creates it and shows it in the list", async ({ page }) => {
  await signUpAndCreateBot(page, "Compose Widget Bot");
  await page.click('a:has-text("Widgets")');
  await page.waitForURL(/\/widgets$/);
  await page.getByRole("button", { name: "Add widget", exact: true }).click();

  await expect(page.getByText("Add a widget")).toBeVisible();
  await page.fill("#name", "Lead Capture");
  await page.fill("#triggerDescription", "Collect the visitor's contact info once they ask for a callback.");
  await page.fill('input[name="field_name_0"]', "email");
  await page.fill('input[name="field_label_0"]', "Your email");
  await page.getByRole("dialog").getByRole("button", { name: "Add widget" }).click();

  await expect(page.getByText("Widget added.")).toBeVisible();
  // The typed name is slugified into the tool identifier (matches ADR 0022's slug pattern).
  await expect(page.getByText("lead_capture")).toBeVisible();
});

test("a widget with no fields is rejected before saving", async ({ page }) => {
  await signUpAndCreateBot(page, "No Fields Bot");
  await page.click('a:has-text("Widgets")');
  await page.waitForURL(/\/widgets$/);
  await page.getByRole("button", { name: "Add widget", exact: true }).click();

  await page.fill("#name", "Empty Form");
  await page.fill("#triggerDescription", "Should never save with no fields.");
  await page.getByRole("dialog").getByRole("button", { name: "Add widget" }).click();

  // Scoped to the dialog — a Sonner toast can carry the same server-
  // action error text at the same moment, and an unscoped getByText
  // resolves to both (Playwright strict-mode violation).
  await expect(page.getByRole("dialog").getByText("Add at least one field")).toBeVisible();
  await expect(page.getByText("No widgets yet")).toBeVisible();
});

test("toggling a widget's enabled switch and deleting it both work", async ({ page }) => {
  await signUpAndCreateBot(page, "Widget Row Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await seedWidget(botId, { name: "ping_form", triggerDescription: "A test widget." });

  await page.click('a:has-text("Widgets")');
  await page.waitForURL(/\/widgets$/);
  const toggle = page.getByRole("switch");
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();

  await page.click('button[aria-label="Delete"]');
  await expect(page.getByText("Delete this widget?")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No widgets yet")).toBeVisible();
});

test("a bot's widgets are reachable from the bot editor's top bar", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Widgets Bot");
  await page.click('a:has-text("Widgets")');
  await expect(page).toHaveURL(/\/bots\/[^/]+\/widgets$/);
  await expect(page.getByRole("heading", { name: "Widgets", exact: true })).toBeVisible();
});
