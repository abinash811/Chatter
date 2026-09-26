import { test, expect } from "@playwright/test";

// Every assertion here caught a real bug when first written manually and
// thrown away — see CLAUDE.md's Current State history. Kept permanently
// now instead of re-discovering the same regressions later.

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

const PASSWORD = "hunter2pass";

test("unauthenticated /bots redirects to /login", async ({ page }) => {
  await page.goto("/bots");
  await expect(page).toHaveURL(/\/login$/);
});

test("signup creates a session and lands on /onboarding (a brand-new org is never onboarded yet)", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("signup"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("login with correct credentials works end to end", async ({ page }) => {
  const email = uniqueEmail("login");
  await page.goto("/signup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  // Still not onboarded — the gate applies on every request, not just
  // right after signup.
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("wrong password shows an inline error without clearing the email field", async ({ page }) => {
  const email = uniqueEmail("wrongpw");
  await page.goto("/signup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "wrongpassword");
  await page.click('button[type="submit"]');

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  // Regression check: the server-action round trip used to reset every
  // field, including email, forcing a full retype after any error.
  await expect(page.locator('input[name="email"]')).toHaveValue(email);
});

test("signup validates with Zod: mismatched passwords are rejected", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("mismatch"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', "different12345");
  await page.click('button[type="submit"]');
  await expect(page.getByText("don't match")).toBeVisible();
});

test("duplicate signup shows a clear error", async ({ page }) => {
  const email = uniqueEmail("dup");
  await page.goto("/signup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/signup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.getByText("already exists")).toBeVisible();
});
