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
  await page.getByRole("button", { name: "Add widget", exact: true }).first().click();

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
  await page.getByRole("button", { name: "Add widget", exact: true }).first().click();

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

test("seeded collection-only widget shows 'Message only' in the On submit column", async ({ page }) => {
  // Deliberately doesn't say "Message" — the bot switcher/sr-only
  // heading render the bot's own name, and a name containing the
  // assertion text below causes a Playwright strict-mode collision.
  await signUpAndCreateBot(page, "Collection Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await seedWidget(botId, { name: "feedback_form", triggerDescription: "Collect feedback." });

  await page.click('a:has-text("Widgets")');
  await expect(page.getByText("Message only")).toBeVisible();
});

// Phase 2 (ADR 0028) — a Function: the widget's submit action calls a
// real API, gated behind the "Call an API" checkbox so a collection-
// only widget never shows method/URL/headers fields at all.
test("adding a widget with 'Call an API' configures a Function", async ({ page }) => {
  await signUpAndCreateBot(page, "Function Widget Bot");
  await page.click('a:has-text("Widgets")');
  await page.waitForURL(/\/widgets$/);
  await page.getByRole("button", { name: "Add widget", exact: true }).first().click();

  await page.fill("#name", "Booking Form");
  await page.fill("#triggerDescription", "Collect booking details once the visitor confirms.");
  await page.fill('input[name="field_name_0"]', "date");
  await page.fill('input[name="field_label_0"]', "Preferred date");

  await page.getByText("Call an API when this form is submitted").click();
  await page.fill("#apiUrl", "https://api.example.com/book");
  await page.getByRole("dialog").getByRole("button", { name: "Add widget" }).click();

  await expect(page.getByText("Widget added.")).toBeVisible();
  await expect(page.getByText("Calls API", { exact: true })).toBeVisible();
});

test("a widget's API call requires a method and URL when 'Call an API' is checked", async ({ page }) => {
  await signUpAndCreateBot(page, "Function Validation Bot");
  await page.click('a:has-text("Widgets")');
  await page.waitForURL(/\/widgets$/);
  await page.getByRole("button", { name: "Add widget", exact: true }).first().click();

  await page.fill("#name", "Broken Function Form");
  await page.fill("#triggerDescription", "desc");
  await page.fill('input[name="field_name_0"]', "email");
  await page.getByText("Call an API when this form is submitted").click();
  // Leave the URL blank.
  await page.getByRole("dialog").getByRole("button", { name: "Add widget" }).click();

  await expect(page.getByRole("dialog").getByText("Method and URL are required")).toBeVisible();
});

// Deterministic and network-free — the SSRF guard rejects the URL
// before any fetch is attempted, same guard actions.spec.ts's own test
// exercises (isBlockedActionUrl, shared by both features).
test("a widget's API URL pointed at internal infrastructure is rejected before saving (SSRF guard)", async ({ page }) => {
  await signUpAndCreateBot(page, "Widget SSRF Bot");
  await page.click('a:has-text("Widgets")');
  await page.waitForURL(/\/widgets$/);
  await page.getByRole("button", { name: "Add widget", exact: true }).first().click();

  await page.fill("#name", "Metadata Probe");
  await page.fill("#triggerDescription", "desc");
  await page.fill('input[name="field_name_0"]', "x");
  await page.getByText("Call an API when this form is submitted").click();
  await page.fill("#apiUrl", "https://169.254.169.254/latest/meta-data");
  await page.getByRole("dialog").getByRole("button", { name: "Add widget" }).click();

  await expect(page.getByRole("dialog").getByText(/URL isn't allowed/)).toBeVisible();
  await expect(page.getByText("No widgets yet")).toBeVisible();
});

test("a bot's widgets are reachable from the bot editor's sidebar nav", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Widgets Bot");
  await page.click('a:has-text("Widgets")');
  await expect(page).toHaveURL(/\/bots\/[^/]+\/widgets$/);
  await expect(page.getByRole("heading", { name: "Widgets", exact: true })).toBeVisible();
});
