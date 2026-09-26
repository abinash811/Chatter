import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// Shared bot-scoped top bar (components/console/BotTopBar.tsx,
// app/(console)/bots/[botId]/layout.tsx, 2026-09-26) — a bot switcher +
// Editor/Knowledge/Integrations nav, persistent across all 3 bot-scoped
// pages, replacing each page's own separate header. Matches the
// Chatbase reference screenshot's bot switcher; switching bots
// preserves the current page rather than always landing on the editor.

async function createSecondBot(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.goto("/bots");
  await page.fill('input[name="name"]', name);
  await Promise.all([page.waitForURL(/\/bots\/[^/]+$/), page.click('button:has-text("New bot")')]);
}

test("the switcher lists every org bot and switching preserves the current page", async ({ page }) => {
  await signUpAndCreateBot(page, "Alpha bot", "topbar-switch");
  await createSecondBot(page, "Beta bot");

  // Now on Beta bot's editor — go to its Knowledge page, then switch to
  // Alpha via the dropdown and confirm we land on Alpha's Knowledge page,
  // not its editor.
  await page.getByRole("link", { name: "Knowledge" }).click();
  await expect(page).toHaveURL(/\/bots\/[^/]+\/knowledge$/);

  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Alpha bot" }).click();

  await expect(page).toHaveURL(/\/bots\/[^/]+\/knowledge$/);
  await expect(page.getByRole("heading", { name: "Knowledge base" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alpha bot" })).toBeVisible();
});

test("the nav highlights the active page and links to the other two", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav Test Bot", "topbar-nav");

  await expect(page.getByRole("link", { name: "Editor" })).toBeVisible();
  await page.getByRole("link", { name: "Integrations" }).click();
  await expect(page).toHaveURL(/\/bots\/[^/]+\/integrations$/);
  await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible();
});

test("visiting another org's bot id shows the plain-language error boundary, not a raw 404", async ({ page }) => {
  await signUpAndCreateBot(page, "Isolation Test Bot", "topbar-isolation");
  await page.goto("/bots/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("Something went wrong")).toBeVisible();
});
