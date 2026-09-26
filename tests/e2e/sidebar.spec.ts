import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// Chatbase-reference sidebar rebuild (2026-09-26): org header, a
// functional nav search filter, and the "Getting started" checklist
// widget, all backed by real data (no fabricated plan badge/docs link —
// see docs/north-star.md's sidebar-scope decision).
test.describe("console sidebar", () => {
  test("shows the org name and a working nav search filter", async ({ page }) => {
    await signUpAndCreateBot(page, "Sidebar Test Bot");

    // Org name is the signup email's default workspace name. The
    // shadcn Sidebar (components/ui/sidebar.tsx) renders plain <div>s,
    // not an <aside>, so it's selected by its own data-slot instead.
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar).toContainText("workspace");

    await expect(page.getByRole("link", { name: "Bots" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Conversations" })).toBeVisible();

    await page.getByPlaceholder("Search...").fill("conv");
    await expect(page.getByRole("link", { name: "Conversations" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bots" })).not.toBeVisible();
  });

  test("getting started widget reflects real progress and links to the right step", async ({ page }) => {
    await signUpAndCreateBot(page, "Sidebar Progress Bot");

    const widget = page.getByRole("button", { name: /Getting started/ });
    await expect(widget).toContainText("1/5 completed");

    await widget.click();
    const knowledgeStep = page.getByRole("link", { name: "Add knowledge to your bot" });
    await expect(knowledgeStep).toBeVisible();
    await knowledgeStep.click();
    await expect(page).toHaveURL(/\/bots\/[^/]+\/knowledge$/);
  });

  test("footer shows the signed-in user's email and logs out", async ({ page }) => {
    await signUpAndCreateBot(page, "Sidebar Logout Bot");
    await expect(page.locator('[data-slot="sidebar"]')).toContainText("@example.com");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
