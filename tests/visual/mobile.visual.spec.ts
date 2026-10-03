import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "../e2e/helpers";

// Narrow-viewport coverage — a real gap found 2026-09-26 (only 6 files
// in the app use any responsive Tailwind prefix, every other
// tests/visual/ baseline is a fixed 1280×800). Per-test viewport
// override, not a second global project: duplicating every existing
// baseline at mobile width would be 2x the maintenance for coverage
// this doesn't need everywhere, only on the screens most likely to
// actually break at narrow widths (a sidebar, a wide table).
test.use({ viewport: { width: 390, height: 844 } });

test("login page at mobile width", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login-mobile.png");
});

test("bots list at mobile width", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "mobile-bots");
  await page.goto("/bots");
  // Same per-run-unique sidebar text masked as console.visual.spec.ts's
  // sidebarMasks() — inlined rather than imported to keep this file
  // independent of that one's internals. The avatar chip is masked for
  // the same reason (2026-10-03): its shade is hashed from the bot's
  // id, which is freshly generated every run.
  await expect(page).toHaveScreenshot("bots-table-mobile.png", {
    mask: [
      page.locator('[data-slot="table-body"] tr td:nth-child(3)'),
      page.locator('[data-slot="bot-avatar"]'),
      page.getByTestId("sidebar-org-name"),
      page.getByTestId("sidebar-user-email"),
    ],
  });
});
