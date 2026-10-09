import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, createSecondBot, seedConversations } from "./helpers";

// The Table rebuild (components/console/BotsTable.tsx, real CARE Table,
// ADR 0008) is a client component only for its row-click handler — this
// is exactly the kind of thing worth a permanent regression spec rather
// than a one-off manual check.
//
// Note: app/(console)/bots/page.tsx's "No bots yet" empty state was
// unreachable through any real user journey until ADR 0018 (bot
// archiving) shipped — onboarding always creates a first bot, and there
// was no way to remove it. See "archiving the only bot" below for the
// journey that reaches it now.

test("new bot appears in the table and its row navigates to the editor", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Support bot", "botstable");

  await page.goto("/bots");
  const row = page.locator('[data-slot="table-row"]', {
    hasText: "Support bot",
  });
  await expect(row).toBeVisible();
  await expect(row.getByText("Draft only")).toBeVisible();

  await row.click();
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
});

// component-checklist.md item 1 audit (2026-09-27) caught this for
// real: nothing disabled "Create" while the create+redirect round-trip
// was in flight, so a double-click could create two bots.
test("Create button disables and relabels while the create request is in flight", async ({ page }) => {
  await signUpAndCreateBot(page, "First bot", "botspending");
  await page.goto("/bots");
  await page.getByRole("button", { name: "New bot", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("Second bot");

  await Promise.all([
    page.waitForRequest((req) => req.method() === "POST"),
    page.getByRole("button", { name: "Create", exact: true }).click(),
  ]);
  await expect(page.getByRole("button", { name: "Creating...", exact: true })).toBeDisabled();
  await expect(page).toHaveURL(/\/bots\/[^/]+$/);
});

test("a second bot can be created from the bots list once onboarding is done", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "First bot", "botssecond");
  await createSecondBot(page, "Second bot");

  await page.goto("/bots");
  await expect(
    page.locator('[data-slot="table-row"]', { hasText: "First bot" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="table-row"]', { hasText: "Second bot" }),
  ).toBeVisible();
});

test("search filters the list by name", async ({ page }) => {
  await signUpAndCreateBot(page, "Alpha bot", "botssearch");
  await createSecondBot(page, "Beta bot");

  await page.goto("/bots");
  await page.getByLabel("Search bots").fill("Alpha");
  await expect(
    page.locator('[data-slot="table-row"]', { hasText: "Alpha bot" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="table-row"]', { hasText: "Beta bot" }),
  ).not.toBeVisible();
});

test("renaming a bot updates the list", async ({ page }) => {
  await signUpAndCreateBot(page, "Old name", "botsrename");
  await page.goto("/bots");

  const row = page.locator('[data-slot="table-row"]', { hasText: "Old name" });
  await row.getByRole("button", { name: /Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("New name");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(
    page.locator('[data-slot="table-row"]', { hasText: "New name" }),
  ).toBeVisible();
});

test("duplicating a bot clones its config into a new bot and opens its editor", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Source bot", "botsduplicate");
  await page.goto("/bots");

  const row = page.locator('[data-slot="table-row"]', {
    hasText: "Source bot",
  });
  await row.getByRole("button", { name: /Actions for/ }).click();
  await Promise.all([
    page.waitForURL(/\/bots\/[^/]+$/),
    page.getByRole("menuitem", { name: "Duplicate" }).click(),
  ]);

  await page.goto("/bots");
  await expect(page.getByRole("link", { name: "Open Source bot", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Source bot (copy)", exact: true })).toBeVisible();
});

// ADR 0018 — archiving is the only removal path (no hard delete). This
// is also the journey that makes the "No bots yet" empty state reachable
// again, noted above.
test("archiving the only bot returns the list to its empty state", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Only bot", "botsarchive");
  await page.goto("/bots");

  const row = page.locator('[data-slot="table-row"]', { hasText: "Only bot" });
  await row.getByRole("button", { name: /Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();

  await expect(page.getByText("No bots yet")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create your first bot" }),
  ).toBeVisible();
});

// TanStack Table pilot (research-note/2026-09-28-table-library-
// evaluation.md, ADR pending): search + sort now persist to the URL via
// nuqs instead of plain useState — a refresh or shared link keeps what
// you were looking at, which a bare useState version never could.
test("sorting by name changes row order and survives a page reload (URL-persisted)", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Zebra bot", "botssort");
  await createSecondBot(page, "Alpha bot");

  await page.goto("/bots");
  const rows = page.locator('[data-slot="table-body"] [data-slot="table-row"]');
  // Default sort is newest-first — Alpha bot (created second) leads.
  await expect(rows.first()).toContainText("Alpha bot");

  await page.getByRole("button", { name: /^Sort by Name/ }).click();
  await expect(page).toHaveURL(/[?&]sort=name/);
  await expect(page).toHaveURL(/[?&]dir=asc/);
  await expect(rows.first()).toContainText("Alpha bot");
  await expect(rows.last()).toContainText("Zebra bot");

  // The sort survives a real reload, not just client-side state —
  // the whole reason for moving it to the URL via nuqs.
  await page.reload();
  await expect(rows.first()).toContainText("Alpha bot");
  await expect(rows.last()).toContainText("Zebra bot");
});

// component-checklist.md item 6 audit (2026-09-27): a zero-results
// search was a dead end with no way forward.
test("Clear search resets the empty search-results state", async ({ page }) => {
  await signUpAndCreateBot(page, "Alpha bot", "botsclearsearch");
  await page.goto("/bots");

  await page.getByLabel("Search bots").fill("zzz-no-match");
  await expect(page.getByRole("button", { name: "Clear search", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByLabel("Search bots")).toHaveValue("");
  await expect(page.locator('[data-slot="table-row"]', { hasText: "Alpha bot" })).toBeVisible();
});

// docs/design/audit.md's "Bots list — open findings": the page "feels
// thin for its hierarchy" — user picked an org-wide stat row (real
// data already in the schema, no fabricated numbers, guardrail #4)
// over a per-bot activity column (2026-10-09). This locks in the real
// counts, not just that some text renders.
test("the stat row under the header reflects real published/draft/conversation counts", async ({ page }) => {
  await signUpAndCreateBot(page, "Published Stat Bot", "botsstats");
  const botId = page.url().split("/bots/")[1];
  await seedConversations(botId); // 3 real conversations (normal/issue/paused)

  await page.goto("/bots");
  await expect(page.getByText("0 published · 1 draft · 3 conversations this week")).toBeVisible();

  await page.goto(`/bots/${botId}`);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText("Publish this bot?")).toBeHidden();

  await page.goto("/bots");
  await expect(page.getByText("1 published · 0 drafts · 3 conversations this week")).toBeVisible();
});
