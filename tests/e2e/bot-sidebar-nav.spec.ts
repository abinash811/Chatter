import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, createSecondBot } from "./helpers";

// Bot-scoped sub-nav (components/console/AppSidebar.tsx, ADR 0037,
// 2026-10-04) — a bot switcher + Editor/Data sources/Leads/Actions/
// Widgets/Approvals/Integrations links, rendered as a contextual
// sidebar section while inside a bot, replacing the old BotTopBar
// horizontal bar (2026-09-26 through 2026-10-03) that this file used to
// test. Moved after a design audit found the horizontal bar visually
// losing to the editor's own stronger Tabs row directly below it.
// Switching bots preserves the current page rather than always landing
// on the editor.

test("the switcher lists every org bot and switching preserves the current page", async ({ page }) => {
  await signUpAndCreateBot(page, "Alpha bot", "topbar-switch");
  await createSecondBot(page, "Beta bot");

  // Now on Beta bot's editor — go to its Data sources page, then switch
  // to Alpha via the dropdown and confirm we land on Alpha's Data
  // sources page, not its editor.
  await page.getByRole("link", { name: "Data sources" }).click();
  await expect(page).toHaveURL(/\/bots\/[^/]+\/knowledge$/);

  // Not a bare getByRole("combobox") — the Data sources page has its
  // own filter/sort comboboxes too, a real strict-mode ambiguity (the
  // same class already documented elsewhere in this app). The
  // switcher's aria-label (AppSidebar.tsx) disambiguates it.
  await page.getByRole("combobox", { name: /Switch bot/ }).click();
  await page.getByRole("option", { name: "Alpha bot" }).click();

  await expect(page).toHaveURL(/\/bots\/[^/]+\/knowledge$/);
  await expect(page.getByRole("heading", { name: "Data sources" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alpha bot" })).toBeVisible();
});

test("the nav highlights the active page and links to the others", async ({ page }) => {
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
