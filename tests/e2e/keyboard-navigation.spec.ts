import { test, expect } from "@playwright/test";
import {
  signUpAndCreateBot,
  seedConversations,
  seedKnowledgeEntry,
  seedLead,
  seedCustomAction,
  seedWidget,
  seedPendingAction,
  keyboardWalk,
  uniqueEmail,
  PASSWORD,
} from "./helpers";

// docs/design/audit.md's "Responsive & accessibility" table tracked a
// real keyboard-only pass as 🔲 (never done) for every screen except
// Sidebar/Bots list/Login-signup — and even Sidebar's own 2026-10-03
// pass was a one-off MCP browser session, not a committed check. This
// file makes that pass real and repeatable: it tabs through each
// screen's real, populated content (same seed helpers accessibility.spec.ts
// already uses) and fails if a reachable control has no visible focus
// indicator, or if nothing is reachable at all. It does not replace
// accessibility.spec.ts's axe scan — axe checks WCAG rules in the DOM,
// this checks the actual tab order a sighted keyboard user experiences.
//
// Reaches each screen via page.goto(), not a sidebar-link click: a
// mouse click leaves the clicked <a> holding real DOM focus with no
// visible ring, which is *correct* native :focus-visible behavior for a
// mouse-focused element, not a bug — but keyboardWalk() (see helpers.ts)
// starts by inspecting whatever already has focus, so a click-based
// navigation produced a false "no focus indicator" failure on the very
// link that was just clicked. goto() leaves focus on <body>, the same
// neutral starting point a fresh page load gives a real keyboard user.
function assertRealFocusPass(walk: Awaited<ReturnType<typeof keyboardWalk>>, minReachable = 4) {
  expect(walk.length, "Tab is reaching fewer controls than expected — focus may be trapped or the page under-rendered").toBeGreaterThanOrEqual(
    minReachable,
  );
  const missing = walk.filter((step) => !step.hasFocusIndicator);
  expect(missing, `${missing.length} focused element(s) painted no visible focus indicator:\n${JSON.stringify(missing, null, 2)}`).toEqual([]);
}

test("login — real keyboard-only pass", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 15), 3);
});

test("signup — real keyboard-only pass", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 15), 3);
});

test("bot editor — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Editor Bot", "kbd-editor");
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("data sources — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Knowledge Bot", "kbd-knowledge");
  const botId = page.url().split("/bots/")[1];
  await seedKnowledgeEntry(botId, "What are your hours?", "9 to 5, Monday to Friday.");
  await page.goto(`/bots/${botId}/knowledge`);
  await expect(page.getByText("What are your hours?")).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("integrations — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Integrations Bot", "kbd-integrations");
  await page.goto("/integrations");
  await expect(page.getByRole("heading", { name: "Integrations", exact: true })).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("leads — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Leads Bot", "kbd-leads");
  const botId = page.url().split("/bots/")[1];
  await seedLead(botId, { name: "Jane Doe", email: "jane@example.com" });
  await page.goto("/leads");
  await expect(page.getByText("jane@example.com")).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("actions — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Actions Bot", "kbd-actions");
  const botId = page.url().split("/bots/")[1];
  await seedCustomAction(botId, { name: "check_availability", description: "Check appointment availability." });
  await page.goto(`/bots/${botId}/actions`);
  await expect(page.getByText("check_availability")).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("widgets — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Widgets Bot", "kbd-widgets");
  const botId = page.url().split("/bots/")[1];
  await seedWidget(botId, { name: "booking_form", triggerDescription: "Collect booking details." });
  await page.goto(`/bots/${botId}/widgets`);
  await expect(page.getByText("booking_form")).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("approvals — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Approvals Bot", "kbd-approvals");
  const botId = page.url().split("/bots/")[1];
  await seedPendingAction(botId, { toolName: "request_order_cancellation", input: { orderNumber: "1001" } });
  await page.goto("/approvals");
  await expect(page.getByText(/Cancel order/)).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("settings — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Settings Bot", "kbd-settings");
  await page.goto("/settings");
  await expect(page.getByText("Claude API key (optional)")).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("conversations list — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Conversations Bot", "kbd-conversations");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);
  await page.goto("/conversations");
  await expect(page.locator("ul > li").first()).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("conversation detail — real keyboard-only pass", async ({ page }) => {
  await signUpAndCreateBot(page, "Keyboard Conversation Detail Bot", "kbd-conv-detail");
  const botId = page.url().split("/bots/")[1];
  const { issueConversationId } = await seedConversations(botId);
  await page.goto(`/conversations/${issueConversationId}`);
  await expect(page.getByText(/Cancel order|Where is my order/).first()).toBeVisible();
  assertRealFocusPass(await keyboardWalk(page, 40));
});

test("onboarding — real keyboard-only pass", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("kbd-onboarding"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Welcome to Chatter" })).toBeVisible();
  // Onboarding has exactly 3 focusable controls (workspace name, bot
  // name, Continue) — no sidebar yet, no console chrome. A genuinely
  // smaller minimum than every other screen, not a weaker check.
  assertRealFocusPass(await keyboardWalk(page, 15), 3);
});
