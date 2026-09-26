import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// The Table rebuild (components/console/BotsTable.tsx, real CARE Table,
// ADR 0008) is a client component only for its row-click handler — this
// is exactly the kind of thing worth a permanent regression spec rather
// than a one-off manual check.
//
// Note: app/(console)/bots/page.tsx's "No bots yet" empty state is real
// code, but as of ADR 0012 there's no longer a real user journey that
// reaches it — onboarding always creates a first bot, and no bot-delete
// feature exists yet to empty the list back out. Not tested here for
// that reason; add it back once bot deletion (or a skippable
// onboarding path) makes the state reachable again.

test("new bot appears in the table and its row navigates to the editor", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "botstable");

  await page.goto("/bots");
  const row = page.locator('[data-slot="table-row"]', { hasText: "Support bot" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Draft only")).toBeVisible();

  await row.click();
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
});

test("a second bot can be created from the bots list once onboarding is done", async ({ page }) => {
  await signUpAndCreateBot(page, "First bot", "botssecond");

  await page.goto("/bots");
  await page.fill('input[name="name"]', "Second bot");
  await Promise.all([page.waitForURL(/\/bots\/[^/]+$/), page.click('button:has-text("New bot")')]);

  await page.goto("/bots");
  await expect(page.locator('[data-slot="table-row"]', { hasText: "First bot" })).toBeVisible();
  await expect(page.locator('[data-slot="table-row"]', { hasText: "Second bot" })).toBeVisible();
});
