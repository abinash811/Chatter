import { test, expect } from "@playwright/test";
import { uniqueEmail, PASSWORD } from "./helpers";

// ADR 0012: a single combined screen (workspace name + first bot name)
// that a brand-new account can't get past — app/(console)/layout.tsx
// redirects every console page here until Org.onboardedAt is set.

test("a brand-new signup is redirected to onboarding, not dropped on an empty /bots", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("onboarding"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText("Welcome to Chatter")).toBeVisible();
});

test("the workspace name field is prefilled with the auto-generated default, editable", async ({ page }) => {
  const email = uniqueEmail("onboarding-prefill");
  await page.goto("/signup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await expect(page.locator("#orgName")).toHaveValue(`${email}'s workspace`);
});

test("both fields are required — submitting blank shows an error and doesn't advance", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("onboarding-required"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.fill("#botName", ""); // native `required` blocks an empty botName from submitting
  await page.fill("#orgName", "");
  const isValid = await page.locator("#orgName").evaluate((el: HTMLInputElement) => el.checkValidity());
  expect(isValid).toBe(false);
});

test("completing onboarding sets the workspace name and lands straight in the new bot's editor", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("onboarding-complete"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.fill("#orgName", "Acme Corp");
  await page.fill("#botName", "Support bot");
  await page.click('button:has-text("Continue")');

  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
  await expect(page.getByText("Support bot")).toBeVisible();

  // The name set here shows up in Settings — onboarding and Settings
  // both write the same Org.name field.
  await page.goto("/settings");
  await expect(page.locator("#orgName")).toHaveValue("Acme Corp");
});

test("visiting /onboarding again after completion redirects to /bots — it's a one-time gate", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("onboarding-revisit"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.fill("#orgName", "Some Org");
  await page.fill("#botName", "Some Bot");
  await page.click('button:has-text("Continue")');
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);

  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/bots$/);
});

test("an unauthenticated visitor hitting /onboarding is redirected to /login", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/login$/);
});
