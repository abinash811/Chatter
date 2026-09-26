import { type Page, expect } from "@playwright/test";

// Shared across every e2e spec that needs a signed-up, onboarded user
// with a first bot — extracted here (ADR 0012's onboarding change is
// what motivated it) so a future flow change touches one file, not six.

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export const PASSWORD = "hunter2pass";

// Signs up, completes onboarding (org name left at its prefilled
// default — most specs don't care), and lands on the new bot's editor.
export async function signUpAndCreateBot(page: Page, botName: string, emailPrefix = "e2e"): Promise<void> {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail(emailPrefix));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.fill("#botName", botName);
  await page.click('button:has-text("Continue")');
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
}
