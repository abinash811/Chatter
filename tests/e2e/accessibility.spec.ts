import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signUpAndCreateBot } from "./helpers";

// A real, mechanical accessibility check — replaces "remember to do a
// screen-reader pass" with a test that fails on a real WCAG violation.
// docs/design/audit.md's "Responsive & accessibility" table records
// what's been checked; this is what actually checks it, on every push,
// not just when someone remembers to run it by hand.
async function assertNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test("login page has no serious/critical accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await assertNoSeriousViolations(page);
});

test("signup page has no serious/critical accessibility violations", async ({ page }) => {
  await page.goto("/signup");
  await assertNoSeriousViolations(page);
});

test("bots list has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Test Bot", "a11y-bots");
  await page.goto("/bots");
  await assertNoSeriousViolations(page);
});

test("bot editor has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Editor Bot", "a11y-editor");
  await assertNoSeriousViolations(page);
});
