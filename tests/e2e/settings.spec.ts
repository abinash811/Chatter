import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// ADR 0012: org name editing + optional BYOA (bring-your-own Anthropic
// API key). The actual encrypt/decrypt round-trip and the "never send
// the raw key back to the client" property are verified at the
// lib/crypto.ts unit-test level and were checked for real against a
// real Postgres instance while building this — see docs/business-
// logic.md's BYOA section. This suite covers the UI/action-wiring
// surface reachable without needing real embeddings/model API access.

test("settings shows the workspace name and reaches Settings from the sidebar", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot", "settings-nav");
  await page.click('a:has-text("Settings")');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText("Workspace", { exact: true })).toBeVisible();
  await expect(page.getByText("Claude API key (optional)")).toBeVisible();
});

test("no key set by default — shows the managed-key explanation, no Remove button", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot", "settings-nokey");
  await page.goto("/settings");

  await expect(page.getByText(/Leave this blank to use our managed key/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
});

test("saving an API key shows it's set, never echoes the raw key back, and can be removed", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot", "settings-byoa");
  await page.goto("/settings");

  await page.fill("#apiKey", "sk-ant-test-secret-value-should-never-appear-again");
  await page.click('button:has-text("Save")');
  await expect(page.getByText("Settings saved — now using your own API key.")).toBeVisible();

  await page.reload();
  await expect(page.getByText(/A key is set/)).toBeVisible();
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("sk-ant-test-secret-value-should-never-appear-again");

  await page.click('button:has-text("Remove")');
  await expect(page.getByText("Removed — back to our managed API key.")).toBeVisible();
  await expect(page.getByText(/Leave this blank to use our managed key/)).toBeVisible();
});

test("renaming the workspace here is reflected if you revisit settings", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot", "settings-rename");
  await page.goto("/settings");

  await page.fill("#orgName", "Renamed Workspace");
  await page.click('button:has-text("Save")');
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.reload();
  await expect(page.locator("#orgName")).toHaveValue("Renamed Workspace");
});

test("blank workspace name is rejected", async ({ page }) => {
  await signUpAndCreateBot(page, "Bot", "settings-blank");
  await page.goto("/settings");

  await page.fill("#orgName", "");
  // required attribute blocks native submission; confirm the browser
  // agrees this shouldn't submit rather than asserting a server error
  // we'd never actually reach.
  const isValid = await page.locator("#orgName").evaluate((el: HTMLInputElement) => el.checkValidity());
  expect(isValid).toBe(false);
});
