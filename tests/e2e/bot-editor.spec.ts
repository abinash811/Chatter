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
  // principles.md #10) — it must not publish by itself. An exact-name
  // role query, not `:has-text`, since the bot switcher (BotTopBar,
  // ADR-less 2026-09-26 top-bar change) is itself a <button> whose
  // visible text is the bot's own name — "Publish Test Bot" would
  // otherwise substring-match this selector too.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Publish this bot?")).toBeVisible();
  await expect(page.getByText("Never published")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText("Published — visitors will see this version now.")).toBeVisible();
  await expect(page.getByText("Publish this bot?")).toBeHidden();
  await expect(page.getByText("Published v1")).toBeVisible();
});

test("Cancel in the publish dialog leaves the bot unpublished", async ({ page }) => {
  await signUpAndCreateBot(page, "Cancel Publish Test Bot");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
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

test("persona template picker fills the persona textarea, replacing existing text", async ({ page }) => {
  await signUpAndCreateBot(page, "Persona Template Test Bot");
  await page.fill("#persona", "some text the picker should overwrite");

  await page.getByRole("combobox", { name: "Start from a template" }).click();
  await page.getByRole("option", { name: "Sales assistant" }).click();

  await expect(page.locator("#persona")).toHaveValue(/upbeat, helpful shopping assistant/);

  // Picking a template must not touch anything outside the persona
  // textarea (decoupled, per docs/open-questions.md's resolved scope) —
  // guardrails stays whatever it already was (empty for a fresh bot).
  await page.click('button[role="tab"]:has-text("Guardrails")');
  await expect(page.locator("#guardrails")).toHaveValue("");

  await page.click('button[role="tab"]:has-text("Persona")');
  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await page.reload();
  await expect(page.locator("#persona")).toHaveValue(/upbeat, helpful shopping assistant/);
});

test("avatar and position selects (Appearance tab) save and survive a reload", async ({ page }) => {
  await signUpAndCreateBot(page, "Appearance Test Bot");
  await page.click('button[role="tab"]:has-text("Appearance")');

  // Radix Select renders a hidden native <select> for form participation
  // when given a `name` — this confirms that actually works end-to-end
  // through the server action, not just that the UI looks right.
  await page.getByRole("combobox", { name: "Widget avatar" }).click();
  await page.getByRole("option", { name: "🤖" }).click();
  await page.getByRole("combobox", { name: "Widget position" }).click();
  await page.getByRole("option", { name: "Bottom left" }).click();

  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible();

  await page.reload();
  await page.click('button[role="tab"]:has-text("Appearance")');
  await expect(page.getByRole("combobox", { name: "Widget avatar" })).toHaveText("🤖");
  await expect(page.getByRole("combobox", { name: "Widget position" })).toHaveText("Bottom left");
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
