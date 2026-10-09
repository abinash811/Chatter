import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedCustomAction } from "./helpers";

test("actions page shows the empty state before any custom action exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Actions Bot");
  await page.click('a:has-text("Actions")');
  await expect(page.getByText("No custom actions yet")).toBeVisible();
});

test("seeded custom actions appear in the list", async ({ page }) => {
  await signUpAndCreateBot(page, "Actions Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedCustomAction(botId, {
    name: "check_availability",
    description: "Check appointment availability.",
    method: "POST",
    url: "https://api.example.com/availability",
  });

  await page.click('a:has-text("Actions")');
  await expect(page.getByRole("heading", { name: "Custom actions 1" })).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("check_availability");
  await expect(rows.first()).toContainText("POST");
  await expect(rows.first()).toContainText("https://api.example.com/availability");
});

test("adding a custom action through the dialog creates it and shows it in the list", async ({ page }) => {
  await signUpAndCreateBot(page, "Compose Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();

  await expect(page.getByText("Add a custom action")).toBeVisible();
  await page.fill("#name", "Book a table");
  await page.fill("#description", "Book a restaurant table for a visitor.");
  await page.fill("#url", "https://api.example.com/book");
  await page.getByRole("dialog").getByRole("button", { name: "Add action" }).click();

  await expect(page.getByText("Action added.")).toBeVisible();
  // The typed name is slugified into the tool identifier (ADR 0022).
  await expect(page.getByText("book_a_table")).toBeVisible();
});

test("a URL pointed at internal infrastructure is rejected before it's ever saved (SSRF guard)", async ({ page }) => {
  await signUpAndCreateBot(page, "Guarded Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();

  await page.fill("#name", "Metadata Probe");
  await page.fill("#description", "Should never be allowed.");
  await page.fill("#url", "https://169.254.169.254/latest/meta-data");
  await page.getByRole("dialog").getByRole("button", { name: "Add action" }).click();

  await expect(page.getByRole("dialog").getByText(/URL isn't allowed/)).toBeVisible();
  await expect(page.getByText("No custom actions yet")).toBeVisible();
});

test("toggling an action's enabled switch and deleting it both work", async ({ page }) => {
  await signUpAndCreateBot(page, "Actions Row Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await seedCustomAction(botId, { name: "ping", description: "A test action." });

  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  const toggle = page.getByRole("switch");
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();

  await page.click('button[aria-label="Delete"]');
  await expect(page.getByText("Delete this action?")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No custom actions yet")).toBeVisible();
});

test("Test button requires a method and URL before firing", async ({ page }) => {
  await signUpAndCreateBot(page, "Test Validation Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();

  await page.getByRole("button", { name: "Test", exact: true }).click();
  await expect(page.getByText("Fill in a method and URL first.")).toBeVisible();
});

// Deterministic and network-free — the SSRF guard rejects the URL before
// any fetch is attempted, same real guard the create-action path uses
// (isBlockedActionUrl), so this doesn't depend on this environment's
// egress policy the way testing a real successful call would.
test("Test button runs the same SSRF guard as saving does", async ({ page }) => {
  await signUpAndCreateBot(page, "Test SSRF Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();

  await page.fill("#url", "https://169.254.169.254/latest/meta-data");
  await page.getByRole("button", { name: "Test", exact: true }).click();

  await expect(page.getByText(/URL isn't allowed/)).toBeVisible();
});

test("picking a template pre-fills the form, and switching back to scratch clears it", async ({ page }) => {
  await signUpAndCreateBot(page, "Template Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("button", { name: "Use the Check appointment availability template" }).click();
  await expect(page.locator("#name")).toHaveValue("check_appointment_availability");
  await expect(page.locator('input[name="field_name_0"]')).toHaveValue("date");

  await dialog.getByRole("button", { name: "Use the Cancel appointment template" }).click();
  await expect(page.locator("#name")).toHaveValue("cancel_appointment");
  await expect(page.locator('input[name="field_name_0"]')).toHaveValue("appointment_id");

  await dialog.getByRole("button", { name: "Use the Reschedule appointment template" }).click();
  await expect(page.locator("#name")).toHaveValue("reschedule_appointment");
  await expect(page.locator('input[name="field_name_1"]')).toHaveValue("new_time");

  await dialog.getByRole("button", { name: "Use the start-from-scratch template" }).click();
  await expect(page.locator("#name")).toHaveValue("");
  await expect(page.locator('input[name="field_name_0"]')).toHaveValue("");
});

test("saving from the cancel-appointment template creates a working action", async ({ page }) => {
  await signUpAndCreateBot(page, "Template Save Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();

  await page.getByRole("dialog").getByRole("button", { name: "Use the Cancel appointment template" }).click();
  await page.fill("#url", "https://api.example.com/appointments/cancel");
  await page.getByRole("dialog").getByRole("button", { name: "Add action" }).click();

  await expect(page.getByText("Action added.")).toBeVisible();
  await expect(page.getByText("cancel_appointment")).toBeVisible();
});

test("saving from the check-availability template creates a GET action", async ({ page }) => {
  await signUpAndCreateBot(page, "Template Availability Bot");
  await page.click('a:has-text("Actions")');
  await page.waitForURL(/\/actions$/);
  await page.getByRole("button", { name: "Add action", exact: true }).first().click();

  await page.getByRole("dialog").getByRole("button", { name: "Use the Check appointment availability template" }).click();
  await page.fill("#url", "https://api.example.com/appointments/availability");
  await page.getByRole("dialog").getByRole("button", { name: "Add action" }).click();

  await expect(page.getByText("Action added.")).toBeVisible();
  const row = page.locator("table tbody tr").filter({ hasText: "check_appointment_availability" });
  await expect(row).toContainText("GET");
});

test("a bot's custom actions are reachable from the bot editor's sidebar nav", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Actions Bot");
  await page.click('a:has-text("Actions")');
  await expect(page).toHaveURL(/\/bots\/[^/]+\/actions$/);
  await expect(page.getByRole("heading", { name: "Custom actions", exact: true })).toBeVisible();
});
