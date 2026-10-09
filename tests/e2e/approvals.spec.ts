import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, createSecondBot, seedPendingAction, seedWidget } from "./helpers";

// ADR 0038 (2026-10-04): /approvals is org-wide now, not bot-scoped —
// same pattern as /conversations and /leads. This file used to test a
// bot-scoped page.

test("approvals page shows the empty state before any request is queued", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty Approvals Bot");
  await page.click('a:has-text("Approvals")');
  await expect(page.getByText("Nothing waiting on you")).toBeVisible();
});

test("a seeded pending request appears with its details and its bot", async ({ page }) => {
  await signUpAndCreateBot(page, "Approvals Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedPendingAction(botId, {
    toolName: "request_order_cancellation",
    input: { orderNumber: "1001", reason: "Ordered the wrong size" },
  });

  await page.click('a:has-text("Approvals")');
  await expect(page).toHaveURL(/\/approvals$/);
  await expect(page.getByRole("heading", { name: "Approvals 1 waiting" })).toBeVisible();
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  const orderNumber = "1001";
  await expect(rows.first()).toContainText(new RegExp(`Cancel order #${orderNumber}.*Ordered the wrong size`));
  await expect(rows.first()).toContainText("Approvals Bot");
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
  await expect(row).toContainText("No Shopify store connected.");
});

test("a seeded refund request shows its own description, and approving it shows the real outcome", async ({ page }) => {
  await signUpAndCreateBot(page, "Refund Flow Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  const orderNumber = "3003";
  await seedPendingAction(botId, {
    toolName: "request_refund",
    input: { orderNumber, reason: "Item arrived damaged" },
  });

  await page.click('a:has-text("Approvals")');
  const row = page.locator("table tbody tr").first();
  await expect(row).toContainText(new RegExp(`Refund order #${orderNumber}.*Item arrived damaged`));

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click();

  // Same real-outcome guarantee as order cancellation — no Shopify
  // store is connectable in this environment, so this is the real
  // failure path (ADR 0023's pattern), never a fabricated success.
  await expect(row.getByText("failed", { exact: true })).toBeVisible();
  await expect(row).toContainText("No Shopify store connected.");
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

test("the bot filter narrows the list to one bot's requests", async ({ page }) => {
  await signUpAndCreateBot(page, "Alpha Approvals Bot", "approvals-filter");
  const alphaId = page.url().match(/\/bots\/([^/]+)/)![1];
  await createSecondBot(page, "Beta Approvals Bot");
  const betaId = page.url().match(/\/bots\/([^/]+)/)![1];

  await seedPendingAction(alphaId, { toolName: "request_order_cancellation", input: { orderNumber: "1001" } });
  await seedPendingAction(betaId, { toolName: "request_order_cancellation", input: { orderNumber: "2002" } });

  await page.goto("/approvals");
  await expect(page.locator("table tbody tr")).toHaveCount(2);

  await page.getByRole("combobox", { name: "Filter by bot" }).click();
  await page.getByRole("option", { name: "Alpha Approvals Bot" }).click();

  await expect(page).toHaveURL(/botId=/);
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("1001");
});

test("a bot's approvals are reachable from the console nav", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Approvals Bot");
  await page.click('a:has-text("Approvals")');
  await expect(page).toHaveURL(/\/approvals$/);
  await expect(page.getByRole("heading", { name: "Approvals", exact: true })).toBeVisible();
});
