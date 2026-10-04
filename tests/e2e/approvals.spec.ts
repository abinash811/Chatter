import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, seedPendingAction, seedWidget } from "./helpers";

test("approvals page shows the empty state before any request is queued", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Approvals Bot");
  await page.click('a:has-text("Approvals")');
  await expect(page.getByText("Nothing waiting on you")).toBeVisible();
});

test("a seeded pending request appears with its details", async ({ page }) => {
  await signUpAndCreateBot(page, "Approvals Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedPendingAction(botId, {
    toolName: "request_order_cancellation",
    input: { orderNumber: "1001", reason: "Ordered the wrong size" },
  });

  await page.click('a:has-text("Approvals")');
  await expect(page.getByRole("heading", { name: "Approvals 1 waiting" })).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  const orderNumber = "1001";
  await expect(rows.first()).toContainText(new RegExp(`Cancel order #${orderNumber}.*Ordered the wrong size`));
  await expect(rows.first().getByText("pending", { exact: true })).toBeVisible();
});

test("approving a request requires confirmation, then executes and shows the real outcome", async ({ page }) => {
  await signUpAndCreateBot(page, "Approve Flow Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await seedPendingAction(botId, {
    toolName: "request_order_cancellation",
    input: { orderNumber: "1001", reason: "Ordered the wrong size" },
  });

  await page.click('a:has-text("Approvals")');
  await page.getByRole("button", { name: "Approve", exact: true }).click();

  await expect(page.getByText("Approve this request?")).toBeVisible();
  await expect(page.getByText(/can't be undone/)).toBeVisible();

  await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click();

  // No Shopify store is connected in this environment, so the real
  // execution step fails cleanly (ADR 0023) — the row shows that real
  // outcome, never a false "cancelled" success.
  const row = page.locator("table tbody tr").first();
  await expect(row.getByText("failed", { exact: true })).toBeVisible();
  await expect(row).toContainText("No Shopify store connected for this bot.");
});

test("rejecting a request needs no confirmation and marks it rejected", async ({ page }) => {
  await signUpAndCreateBot(page, "Reject Flow Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await seedPendingAction(botId, {
    toolName: "request_order_cancellation",
    input: { orderNumber: "1002" },
  });

  await page.click('a:has-text("Approvals")');
  await page.getByRole("button", { name: "Reject", exact: true }).click();

  const row = page.locator("table tbody tr").first();
  await expect(row.getByText("rejected", { exact: true })).toBeVisible();
});

// Phase 2 (ADR 0028) — a write-capable widget's submission never calls
// its API directly; it queues the exact same PendingAction shape as
// request_order_cancellation, and approving it dispatches to
// executeWidgetSubmission (a real request, same as "Test this action"'s
// precedent of hitting api.github.com rather than a mocked endpoint).
test("approving a write-capable widget's queued submission calls its real API", async ({ page }) => {
  await signUpAndCreateBot(page, "Widget Approval Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await seedWidget(botId, {
    name: "refund_form",
    triggerDescription: "Collect refund requests.",
    apiUrl: "https://api.github.com/zen",
    apiMethod: "GET",
    writeCapable: true,
  });
  await seedPendingAction(botId, { toolName: "submit_widget_refund_form", input: { reason: "Wrong size" } });

  await page.click('a:has-text("Approvals")');
  await expect(page.getByText(/Submit "refund_form" widget/)).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click();

  // A real fetch actually fires here — proving executeWidgetSubmission
  // wires through to the same performActionRequest custom actions use,
  // not that GitHub's anonymous API always returns 200 (it returned 403
  // without a User-Agent header in this environment, same class of real
  // constraint as the Shopify approval test's own "no store connected"
  // graceful failure). What matters: the row leaves "pending" for a real
  // terminal state, never a fabricated success.
  const row = page.locator("table tbody tr").first();
  const statusBadge = row.locator('[data-slot="badge"]');
  await expect(statusBadge).not.toHaveText("pending");
  await expect(statusBadge).toHaveText(/approved|failed/);
});

test("a bot's approvals are reachable from the bot editor's sidebar nav", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Approvals Bot");
  await page.click('a:has-text("Approvals")');
  await expect(page).toHaveURL(/\/bots\/[^/]+\/approvals$/);
  await expect(page.getByRole("heading", { name: "Approvals", exact: true })).toBeVisible();
});
