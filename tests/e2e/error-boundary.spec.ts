import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

test("a real thrown error (nonexistent bot) shows the plain-language error boundary", async ({ page }) => {
  // Needs onboarding done first — app/(console)/layout.tsx's gate would
  // otherwise redirect /bots/nonexistent-bot-id to /onboarding before
  // the error boundary ever gets a chance to render.
  await signUpAndCreateBot(page, "Real Bot", "errbound");

  await page.goto("/bots/nonexistent-bot-id");
  await expect(page.getByText("Something went wrong")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
