import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

test("save draft shows a success toast with a working close button", async ({ page }) => {
  await signUpAndCreateBot(page, "Test Bot");
  await page.fill("#persona", "You are a friendly assistant.");
  await page.click('button:has-text("Save draft")');

  const toast = page.getByText("Draft saved.");
  // Same documented flake as the publish toast below: the
  // saveDraftAction round trip can take longer than Playwright's 5s
  // default under load — confirmed in CI 2026-09-28, where this exact
  // "Draft saved." wait timed out on 3 separate runs in this file, each
  // time on a different test, never the same one twice — real
  // environment slowness, not a broken save. A generous timeout on
  // every "Draft saved." wait in this file, not a longer one
  // everywhere, is the fix.
  await expect(toast).toBeVisible({ timeout: 20000 });

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
  // Real, documented flake in this container: the publishAction server
  // action round trip can take noticeably longer than Playwright's 5s
  // default under load (confirmed by hand: a manual run once took ~8s
  // for a result that normally lands in under 2s) — a generous timeout
  // here, not a longer one everywhere, is the fix; the assertion itself
  // is still real (this doesn't hide a genuine failure, just tolerates
  // real environment slowness).
  await expect(page.getByText("Published — visitors will see this version now.")).toBeVisible({ timeout: 20000 });
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

test("a tool's Switch (on the Tools tab) toggles and its state survives a save", async ({ page }) => {
  await signUpAndCreateBot(page, "Toggle Test Bot");
  await page.click('button[role="tab"]:has-text("Tools")');

  // Each tool is an OptionCard with a Switch (2026-09-27, matches
  // Chatbase's card-gallery pattern) — its hidden bubble <input
  // name="tool_..."> is what actually submits with the form.
  const toggle = page.getByRole("switch", { name: "Enable search_knowledge_base" });
  await toggle.click();
  await expect(toggle).toBeChecked();

  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20000 }); // see the comment in the first test above
  await page.reload();
  await page.click('button[role="tab"]:has-text("Tools")');
  await expect(page.getByRole("switch", { name: "Disable search_knowledge_base" })).toBeChecked();
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
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20000 }); // see the comment in the first test above
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
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20000 }); // see the comment in the first test above

  await page.reload();
  await page.click('button[role="tab"]:has-text("Appearance")');
  await expect(page.getByRole("combobox", { name: "Widget avatar" })).toHaveText("🤖");
  await expect(page.getByRole("combobox", { name: "Widget position" })).toHaveText("Bottom left");
});

test("model tier + temperature (Persona tab) save, survive a reload, and lock temperature for a non-Haiku model", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Model Tier Test Bot");

  // Default (Sonnet) doesn't support temperature — the SDK's own types
  // mark it deprecated for models released after Claude Opus 4.6 (ADR
  // 0026) — the slider should already be disabled at rest. Radix's
  // Slider root is a <span>, not a native form control, so it signals
  // disabled via aria-disabled/data-disabled, not the disabled property
  // toBeDisabled() checks for.
  await expect(page.locator('[data-slot="slider"]')).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("combobox", { name: "AI Model" }).click();
  await page.getByRole("option", { name: "Haiku" }).click();
  await expect(page.locator('[data-slot="slider"]')).not.toHaveAttribute("aria-disabled", "true");

  const thumb = page.locator('[data-slot="slider-thumb"]');
  await thumb.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("0.5", { exact: true })).toBeVisible();

  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20000 }); // see the comment in the first test above

  await page.reload();
  await expect(page.getByRole("combobox", { name: "AI Model" })).toHaveText("Haiku");
  await expect(page.getByText("0.5", { exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="slider"]')).not.toHaveAttribute("aria-disabled", "true");

  // Switching to a temperature-locked model re-disables the slider and
  // resets its displayed value — never leaves a stale enabled-looking
  // 0.5 next to a model that can't actually honor it.
  await page.getByRole("combobox", { name: "AI Model" }).click();
  await page.getByRole("option", { name: "Opus" }).click();
  await expect(page.locator('[data-slot="slider"]')).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("1.0", { exact: true })).toBeVisible();
});

test("suggested reply chips save, survive a reload, and skip blank rows", async ({ page }) => {
  await signUpAndCreateBot(page, "Suggested Replies Bot");
  await page.click('button[role="tab"]:has-text("Appearance")');

  await page.fill('input[name="suggestedReply_0"]', "What are your hours?");
  await page.fill('input[name="suggestedReply_1"]', "  "); // blank/whitespace row, should be dropped
  await page.fill('input[name="suggestedReply_2"]', "Track my order");

  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20000 }); // see the comment in the first test above

  await page.reload();
  await page.click('button[role="tab"]:has-text("Appearance")');
  await expect(page.locator('input[name="suggestedReply_0"]')).toHaveValue("What are your hours?");
  // The blank row was dropped, so "Track my order" shifts into slot 1.
  await expect(page.locator('input[name="suggestedReply_1"]')).toHaveValue("Track my order");
  await expect(page.locator('input[name="suggestedReply_2"]')).toHaveValue("");
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
