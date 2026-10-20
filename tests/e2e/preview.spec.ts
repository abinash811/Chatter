import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// "Test your bot" preview (2026-09-27) — an in-console chat, PreviewSheet.tsx,
// wired to the real chat loop (lib/ai/chat.ts's sendMessage) via
// sendPreviewMessageAction. Every environment this suite runs in has a
// placeholder ANTHROPIC_API_KEY (same documented gap as the widget's own
// POST /api/chat route — see tests/e2e/knowledge.spec.ts's coverage
// note), so a real reply is never reachable here; what's verified for
// real is the UI contract and both graceful-degradation paths (not
// published yet, and the Claude API key not being configured), which are
// deterministic regardless of any real key.

test("preview shows a clear message instead of a chat when the bot isn't published", async ({ page }) => {
  await signUpAndCreateBot(page, "Unpublished Preview Bot");

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Test your bot")).toBeVisible();
  await expect(page.getByText("Not published yet")).toBeVisible();
  await expect(page.getByText("Publish this bot first, then come back to test it.")).toBeVisible();
  await expect(page.getByLabel("Message")).not.toBeVisible();
});

test("preview opens a working chat once the bot is published, and degrades gracefully without a real API key", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Published Preview Bot");

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText("Published v1")).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Send a message to see how your bot replies.")).toBeVisible();

  await page.getByLabel("Message").fill("Hi there");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  // The user's own message renders immediately, before any server round trip.
  await expect(page.getByText("Hi there")).toBeVisible();
  // No real ANTHROPIC_API_KEY in this environment (placeholder) — the
  // real, deterministic failure mode is an AuthenticationError from the
  // Anthropic SDK, which sendPreviewMessageAction turns into this plain-
  // language message rather than a raw error.
  await expect(page.getByText(/Claude API key isn't set up yet/)).toBeVisible();
});

test("pressing Enter sends a message, same as clicking Send", async ({ page }) => {
  await signUpAndCreateBot(page, "Enter Key Preview Bot");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText("Published v1")).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByLabel("Message").fill("Sent with Enter");
  await page.getByLabel("Message").press("Enter");

  await expect(page.getByText("Sent with Enter")).toBeVisible();
});
