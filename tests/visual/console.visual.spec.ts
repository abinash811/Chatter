import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedConversations, seedPendingAction, uniqueEmail, PASSWORD } from "../e2e/helpers";

// Visual regression layer (playwright.config.ts's toHaveScreenshot,
// see playwright.visual.config.ts for the known cross-environment
// caveat). Closes the "I manually eyeball a screenshot each time, with
// nothing automated behind it" gap from the 2026-09-25 "critique the
// automated setup" discussion. Separate from tests/e2e/'s functional
// specs — this only asserts pixels didn't unexpectedly move, not
// behavior.
//
// Note: the old "bots list — empty state" baseline is gone, not just
// renamed — ADR 0012's onboarding flow always creates a first bot, and
// no bot-delete feature exists yet, so that empty state is no longer
// reachable through any real user journey (see tests/e2e/bots-
// list.spec.ts's same note). Replaced with the onboarding screen and
// the settings page, both genuinely new.
//
// The sidebar (components/console/AppSidebar.tsx) shows the real org
// name and signed-in email on every console screen — both per-run-
// unique text (uniqueEmail()'s timestamp+random suffix), same
// instability class as a relative timestamp. sidebarMasks(page) must be
// spread into every console-shell screenshot's mask array or the
// baseline flakes on every re-run, not just the first.
function sidebarMasks(page: import("@playwright/test").Page) {
  return [page.getByTestId("sidebar-org-name"), page.getByTestId("sidebar-user-email")];
}

// Real flake found 2026-09-26: LoginForm/SignupForm's email field has
// `autoFocus`, and fixing the focus ring's real visibility earlier this
// session (it used to be invisible — see AuthShell's ring-accent bug)
// means the resting-state screenshot now depends on whether the browser
// has applied focus styling before the screenshot fires. Blur before
// capturing so the baseline is the deliberate resting state, not a race.
test("login page", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot("login.png");
});

test("signup page", async ({ page }) => {
  await page.goto("/signup");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot("signup.png");
});

test("onboarding screen", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[name="email"]', uniqueEmail("visual-onboarding"));
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/onboarding$/);
  // Same autoFocus-ring flake as login/signup — blur before capturing.
  // The mask alone doesn't cover this: a focus ring's box-shadow extends
  // past the element's own bounding box, so it pokes out around the mask.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot("onboarding.png", { mask: [page.locator("#orgName")] });
});

test("bots list — with a bot (Created column + avatar chip masked, both per-run-unique)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-table");
  await page.goto("/bots");

  // The avatar chip's shade (2026-10-03, hashToAvatarShade) is hashed
  // from the bot's id, which signUpAndCreateBot generates fresh each
  // run — same instability class as the Created timestamp, masked for
  // the same reason, not because the hashing itself is unstable.
  await expect(page).toHaveScreenshot("bots-table.png", {
    mask: [
      page.locator('[data-slot="table-body"] tr td:nth-child(3)'),
      page.locator('[data-slot="bot-avatar"]'),
      ...sidebarMasks(page),
    ],
  });
});

test("bots list — a published bot shows the success-colored badge", async ({ page }) => {
  // Real coverage gap found while adding scripts/check-variant-visual-
  // coverage.mjs (docs/changelog.md's 2026-10-08 design-drift-
  // automation entry): no existing visual baseline ever published a
  // bot, connected Shopify, or opened a conversation's Details tab, so
  // Badge's `success` variant — real call sites in BotTableRow.tsx,
  // integrations/page.tsx, ConversationDetailPanel.tsx — had zero
  // actual visual-regression coverage despite being genuinely rendered
  // in the app. This is the cheapest of the three real call sites to
  // reach in a test (no external Shopify connection or Details-tab
  // click needed), so it's the one that earns the manifest entry.
  await signUpAndCreateBot(page, "Support bot", "visual-published-badge");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Publish this bot?")).toBeVisible();
  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText("Published v1")).toBeVisible({ timeout: 20000 });

  await page.goto("/bots");
  // getByText does a case-insensitive substring match by default —
  // without scoping to the table, this matched the sidebar's own
  // per-run-unique email prefix ("visual-published-badge-..."), which
  // contains "published" too. Scope to the status badge itself.
  await expect(page.locator('[data-slot="table-body"]').getByText("Published", { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("bots-table-published.png", {
    mask: [
      page.locator('[data-slot="table-body"] tr td:nth-child(3)'),
      page.locator('[data-slot="bot-avatar"]'),
      ...sidebarMasks(page),
    ],
  });
});

test("bot editor page (embed snippet masked — it embeds a random public key)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-editor");
  await expect(page).toHaveScreenshot("bot-editor.png", { mask: [page.locator("pre"), ...sidebarMasks(page)] });
});

test("bot editor — Appearance tab (avatar + position selects)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-appearance");
  await page.click('button[role="tab"]:has-text("Appearance")');
  await expect(page).toHaveScreenshot("bot-editor-appearance.png", { mask: [page.locator("pre"), ...sidebarMasks(page)] });
});

test("bot editor — publish confirmation dialog (docs/design/principles.md #10)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-publish-dialog");
  await page.click('button:has-text("Publish")');
  await expect(page.getByText("Publish this bot?")).toBeVisible();

  await expect(page).toHaveScreenshot("bot-editor-publish-dialog.png", { mask: sidebarMasks(page) });
});

test("bot editor — test-your-bot preview sheet, not-published state", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-preview");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Not published yet")).toBeVisible();

  await expect(page).toHaveScreenshot("bot-editor-preview-sheet.png", { mask: sidebarMasks(page) });
});

test("leads page — empty state", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-leads");

  await page.click('a:has-text("Leads")');
  await expect(page).toHaveURL(/\/leads$/);
  // Real flake, found while adding the actions test below: without
  // waiting for the settled empty-state content, this can race the
  // Suspense boundary and capture loading.tsx's skeleton instead — same
  // "URL changed but content hasn't" class of race documented at the top
  // of tests/e2e/accessibility.spec.ts.
  await expect(page.getByText("No leads yet")).toBeVisible();
  await expect(page).toHaveScreenshot("leads-empty.png", { mask: sidebarMasks(page) });
});

test("actions page — empty state", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-actions");

  await page.click('a:has-text("Actions")');
  await expect(page).toHaveURL(/\/actions$/);
  await expect(page.getByText("No custom actions yet")).toBeVisible();
  await expect(page).toHaveScreenshot("actions-empty.png", { mask: sidebarMasks(page) });
});

test("knowledge base — empty state and Add Q&A dialog", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-knowledge");

  await page.click('a:has-text("Data sources")');
  await expect(page).toHaveURL(/\/knowledge$/);
  await expect(page.getByText("No knowledge yet")).toBeVisible();
  await expect(page).toHaveScreenshot("knowledge-empty.png", { mask: sidebarMasks(page) });

  // Add Q&A/Upload file/Add URL (ADR 0013) are each their own always-
  // visible OptionCard button now (2026-09-27, matches Chatbase's Data
  // sources page), not a menu item behind a shared "Add" trigger.
  await page.getByRole("button", { name: "Add Q&A", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add a question and answer" })).toBeVisible();
  // Same autoFocus-ring flake — Radix Dialog focuses its first focusable
  // field on open (correct, real a11y behavior); blur so the baseline
  // captures the resting state, not a race against when the ring paints.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot("knowledge-add-dialog.png", { mask: sidebarMasks(page) });
});

test("approvals page — empty state and a waiting request (ADR 0023)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-approvals");
  const botId = page.url().split("/bots/")[1];

  await page.click('a:has-text("Approvals")');
  await expect(page).toHaveURL(/\/approvals$/);
  await expect(page.getByText("Nothing waiting on you")).toBeVisible();
  await expect(page).toHaveScreenshot("approvals-empty.png", { mask: sidebarMasks(page) });

  await seedPendingAction(botId, {
    toolName: "request_order_cancellation",
    input: { orderNumber: "1001", reason: "Ordered the wrong size" },
  });
  await page.reload();
  await expect(page.getByText(/Cancel order/)).toBeVisible();
  // "Requested" is a relative timestamp ("just now") — same masking
  // rationale as conversations-list.png's Started column. 4th column,
  // not 3rd — ADR 0038 added a "Bot" column before Status.
  await expect(page).toHaveScreenshot("approvals-pending.png", {
    mask: [page.locator('[data-slot="table-body"] tr td:nth-child(4)'), ...sidebarMasks(page)],
  });
});

test("settings page", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-settings");
  await page.click('a:has-text("Settings")');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page).toHaveScreenshot("settings.png", { mask: [page.locator("#orgName"), ...sidebarMasks(page)] });
});

test("conversations list — with seeded conversations (Started column masked, it's a relative timestamp)", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Support bot", "visual-conversations");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId);

  await page.click('a:has-text("Conversations")');
  await expect(page).toHaveURL(/\/conversations$/);
  // ADR 0027's split-pane list — each row's relative timestamp
  // ("just now", "4m ago") is real wall-clock-relative text, same
  // masking rationale as bots-table.png's Created column.
  await expect(page).toHaveScreenshot("conversations-list.png", {
    mask: [page.locator(".text-xs.text-muted-foreground"), ...sidebarMasks(page)],
  });
});

test("conversation detail — full transcript with an inline tool call (ADR 0015)", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-conversation-detail");
  const botId = page.url().split("/bots/")[1];
  const { issueConversationId } = await seedConversations(botId);

  await page.goto(`/conversations/${issueConversationId}`);
  await expect(page).toHaveScreenshot("conversation-detail.png", {
    // Every relative timestamp — the list pane's rows, the thread's
    // "Visitor · 4m ago", the tool call's own timestamp — is real
    // wall-clock-relative text, same masking rationale as bots-table.
    // png's Created column.
    mask: [page.locator(".text-xs.text-muted-foreground"), ...sidebarMasks(page)],
  });
});

test("integrations page — Shopify connect row", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-integrations");
  await page.click('a:has-text("Integrations")');
  await expect(page).toHaveURL(/\/integrations$/);
  // Same Suspense-boundary race as leads/actions' empty-state tests
  // above — without waiting for real content, this can capture
  // loading.tsx's skeleton instead of the actual Shopify connect row.
  await expect(page.getByText("Shopify")).toBeVisible();
  await expect(page).toHaveScreenshot("integrations.png", { mask: sidebarMasks(page) });
});

test("console sidebar — icon-collapsed", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-sidebar");

  await page.click('[data-slot="sidebar-trigger"]');
  await page.waitForTimeout(250); // the collapse transition (app/globals.css) is 200ms
  await expect(page).toHaveScreenshot("sidebar-collapsed.png", { mask: sidebarMasks(page) });
});

test("design system page — Tokens section", async ({ page }) => {
  await signUpAndCreateBot(page, "Support bot", "visual-design-system");
  // Direct goto, same as the accessibility scan — not reached via the
  // sidebar (deliberately not in AppSidebar's main nav).
  await page.goto("/design-system", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
  await expect(page).toHaveScreenshot("design-system-tokens.png", { fullPage: true, mask: sidebarMasks(page) });
});
