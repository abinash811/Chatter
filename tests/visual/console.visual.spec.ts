import { test, expect } from "@playwright/test";

// Visual regression layer (playwright.config.ts's toHaveScreenshot,
// see playwright.visual.config.ts for the known cross-environment
// caveat). Closes the "I manually eyeball a screenshot each time, with
// nothing automated behind it" gap from the 2026-09-25 "critique the
// automated setup" discussion. Separate from tests/e2e/'s functional
// specs — this only asserts pixels didn't unexpectedly move, not
// behavior.

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

const PASSWORD = "hunter2pass";

test("login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login.png");
});

test("signup page", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveScreenshot("signup.png");
});

test("bots list — empty state", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-empty"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);
  await expect(page).toHaveScreenshot("bots-empty.png");
});

test("bots list — with a bot (Created column masked, it's a relative timestamp)", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-table"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.fill('input[name="name"]', "Support bot");
  await Promise.all([page.waitForURL(/\/bots\/[^/]+$/), page.click('button:has-text("New bot")')]);
  await page.goto("/bots");

  await expect(page).toHaveScreenshot("bots-table.png", {
    mask: [page.locator('[data-slot="table-body"] tr td:nth-child(3)')],
  });
});

test("bot editor page (embed snippet masked — it embeds a random public key)", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-editor"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.fill('input[name="name"]', "Support bot");
  await Promise.all([page.waitForURL(/\/bots\/[^/]+$/), page.click('button:has-text("New bot")')]);

  await expect(page).toHaveScreenshot("bot-editor.png", { mask: [page.locator("pre")] });
});

test("bot editor — publish confirmation dialog (docs/design/principles.md #10)", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-publish-dialog"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.fill('input[name="name"]', "Support bot");
  await Promise.all([page.waitForURL(/\/bots\/[^/]+$/), page.click('button:has-text("New bot")')]);
  await page.click('button:has-text("Publish")');
  await expect(page.getByText("Publish this bot?")).toBeVisible();

  await expect(page).toHaveScreenshot("bot-editor-publish-dialog.png");
});

test("console sidebar — icon-collapsed", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-sidebar"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/bots$/);

  await page.click('[data-slot="sidebar-trigger"]');
  await page.waitForTimeout(250); // the collapse transition (app/globals.css) is 200ms
  await expect(page).toHaveScreenshot("sidebar-collapsed.png");
});
