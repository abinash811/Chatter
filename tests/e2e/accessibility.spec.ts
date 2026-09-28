import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  signUpAndCreateBot,
  seedConversations,
  seedKnowledgeEntry,
  seedLead,
  seedCustomAction,
  seedPendingAction,
  uniqueEmail,
  PASSWORD,
} from "./helpers";

// A real, mechanical accessibility check — replaces "remember to do a
// screen-reader pass" with a test that fails on a real WCAG violation.
// docs/design/audit.md's "Responsive & accessibility" table records
// what's been checked; this is what actually checks it, on every push,
// not just when someone remembers to run it by hand.
// Real flake found 2026-09-27 expanding this file to more screens, and
// genuinely tricky to pin down — two *independent* timing races, not
// one, both around a Next.js client-side (soft) navigation:
//
// 1. Body content lags the URL change — `expect(page).toHaveURL(...)`
//    only confirms the URL changed, not that the destination screen has
//    rendered (the same "networkidle resolves before the transition
//    completes" class of race already documented in tests/e2e/
//    conversations.spec.ts). Fixed by waiting for one real, page-
//    specific piece of content before scanning — pass a locator for any
//    test that reaches its page via a link click, not `page.goto`.
// 2. `<title>` lags independently of body content, confirmed by testing:
//    waiting for the content locator alone still hit a real
//    "document-title" axe violation (~75% reproduction on one run) even
//    though the visible heading was already there — Next's internal
//    title-commit isn't synchronized with the body's. Every route in
//    this app has the same static title ("Chatter", app/layout.tsx, no
//    per-route override), so this is a transient render gap, not content
//    that's ever actually missing in the settled page — waiting for it
//    explicitly closes the gap instead of masking it.
async function assertNoSeriousViolations(
  page: import("@playwright/test").Page,
  waitFor?: import("@playwright/test").Locator,
) {
  if (waitFor) await expect(waitFor).toBeVisible();
  await page.waitForFunction(() => document.title.length > 0);
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

test("the test-your-bot preview sheet has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Preview Bot", "a11y-preview");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await assertNoSeriousViolations(page, page.getByText("Not published yet"));
});

// Expanded 2026-09-27 — only 4 of the app's screens had any automated
// a11y coverage; docs/design/audit.md's "Responsive & accessibility"
// table had Knowledge/Integrations/Settings/Conversations/Onboarding
// all blank. Same pattern as above: real content where a helper already
// seeds it (a populated table exercises more of the DOM than an empty
// state), not just the bare page shell.

test("onboarding screen has no serious/critical accessibility violations", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("a11y-onboarding"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);
  await assertNoSeriousViolations(page, page.getByText("Welcome to Chatter"));
});

test("settings page has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Settings Bot", "a11y-settings");
  await page.click('a:has-text("Settings")');
  await expect(page).toHaveURL(/\/settings$/);
  await assertNoSeriousViolations(page, page.getByText("Claude API key (optional)"));
});

test("knowledge page has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Knowledge Bot", "a11y-knowledge");
  const botId = page.url().split("/bots/")[1];
  await seedKnowledgeEntry(botId, "What are your hours?", "9 to 5, Monday to Friday.");
  await page.click('a:has-text("Knowledge")');
  await expect(page).toHaveURL(/\/knowledge$/);
  await assertNoSeriousViolations(page, page.getByText("What are your hours?"));
});

test("leads page has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Leads Bot", "a11y-leads");
  const botId = page.url().split("/bots/")[1];
  await seedLead(botId, { name: "Jane Doe", email: "jane@example.com" });
  await page.click('a:has-text("Leads")');
  await expect(page).toHaveURL(/\/leads$/);
  await assertNoSeriousViolations(page, page.getByText("jane@example.com"));
});

test("actions page has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Actions Bot", "a11y-actions");
  const botId = page.url().split("/bots/")[1];
  await seedCustomAction(botId, { name: "check_availability", description: "Check appointment availability." });
  await page.click('a:has-text("Actions")');
  await expect(page).toHaveURL(/\/actions$/);
  await assertNoSeriousViolations(page, page.getByText("check_availability"));
});

test("approvals page has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Approvals Bot", "a11y-approvals");
  const botId = page.url().split("/bots/")[1];
  await seedPendingAction(botId, { toolName: "request_order_cancellation", input: { orderNumber: "1001" } });
  await page.click('a:has-text("Approvals")');
  await expect(page).toHaveURL(/\/approvals$/);
  await assertNoSeriousViolations(page, page.getByText(/Cancel order/));
});

test("integrations page has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Integrations Bot", "a11y-integrations");
  await page.click('a:has-text("Integrations")');
  await expect(page).toHaveURL(/\/integrations$/);
  await assertNoSeriousViolations(page, page.getByRole("heading", { name: "Integrations", exact: true }));
});

test("conversations list has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Conversations Bot", "a11y-conversations");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);
  await page.click('a:has-text("Conversations")');
  await expect(page).toHaveURL(/\/conversations$/);
  await assertNoSeriousViolations(page, page.locator('[data-slot="table-body"] tr').first());
});

test("conversation detail has no serious/critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBot(page, "A11y Conversation Detail Bot", "a11y-conv-detail");
  const botId = page.url().split("/bots/")[1];
  const { issueConversationId } = await seedConversations(botId);
  await page.goto(`/conversations/${issueConversationId}`);
  await assertNoSeriousViolations(page);
});
