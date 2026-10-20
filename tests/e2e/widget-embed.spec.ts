import { test, expect } from "@playwright/test";
import { signUpAndCreateBot, getBotKey } from "./helpers";

// Nudges (ADR 0041) — the one e2e spec that actually loads the real,
// public `public/widget.js` via a `<script data-bot-key>` tag, the same
// way a business's own site would, rather than PreviewSheet.tsx's
// separate React reimplementation. `page.route` serves a minimal host
// page same-origin to the app server so the widget's own CORS-wildcard
// config-fetch and the test's sessionStorage checks both behave exactly
// like a real embed, without adding any new route to the app itself.

async function publishWithAutoOpen(page: import("@playwright/test").Page, seconds: string): Promise<void> {
  await page.click('button[role="tab"]:has-text("Appearance")');
  await page.fill("#autoOpenAfterSeconds", seconds);
  await page.click('button:has-text("Save draft")');
  await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText(/Published v\d+/)).toBeVisible({ timeout: 30000 });
}

function hostPageHtml(botKey: string): string {
  return `<!doctype html><html><head><title>Embed host</title></head>
<body>
<h1>A business's own site</h1>
<script src="/widget.js" data-bot-key="${botKey}"></script>
</body></html>`;
}

test("the embedded widget auto-opens itself after the configured delay, exactly once per session", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Nudge Embed Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await publishWithAutoOpen(page, "1");
  const botKey = await getBotKey(botId);

  await page.route("**/embed-host-test", (route) =>
    route.fulfill({ contentType: "text/html", body: hostPageHtml(botKey) }),
  );
  await page.goto("/embed-host-test");

  // CSS locators pierce open shadow DOM by default in Playwright, so
  // this reaches .window inside the widget's shadow root with no
  // special syntax.
  const chatWindow = page.locator("#chatter-widget-host .window");
  await expect(chatWindow).not.toHaveClass(/open/);

  await expect(chatWindow).toHaveClass(/open/, { timeout: 4000 });

  // Close it, then reload the exact same embed — same origin, same tab,
  // so sessionStorage persists exactly like a real second page view in
  // the same visit. The real behavior under test: it must NOT reopen
  // itself a second time in the same session.
  await page.locator("#chatter-widget-host .bubble").click();
  await expect(chatWindow).not.toHaveClass(/open/);

  await page.goto("/embed-host-test");
  const chatWindowAfterReload = page.locator("#chatter-widget-host .window");
  await page.waitForTimeout(2500); // past the 1s delay, with margin
  await expect(chatWindowAfterReload).not.toHaveClass(/open/);
});

test("the embedded widget never auto-opens when no delay is configured", async ({ page }) => {
  await signUpAndCreateBot(page, "No Nudge Embed Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  // No autoOpenAfterSeconds set — publish as-is (default appearance).
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.click('div[role="dialog"] button:has-text("Publish")');
  await expect(page.getByText(/Published v\d+/)).toBeVisible({ timeout: 30000 });
  const botKey = await getBotKey(botId);

  await page.route("**/embed-host-test", (route) =>
    route.fulfill({ contentType: "text/html", body: hostPageHtml(botKey) }),
  );
  await page.goto("/embed-host-test");

  const chatWindow = page.locator("#chatter-widget-host >>> .window");
  await page.waitForTimeout(2000);
  await expect(chatWindow).not.toHaveClass(/open/);
});

test("manually opening the bubble before the delay fires cancels the auto-open", async ({ page }) => {
  await signUpAndCreateBot(page, "Manual Open Beats Nudge Bot");
  const botId = page.url().match(/\/bots\/([^/]+)/)![1];
  await publishWithAutoOpen(page, "2");
  const botKey = await getBotKey(botId);

  await page.route("**/embed-host-test", (route) =>
    route.fulfill({ contentType: "text/html", body: hostPageHtml(botKey) }),
  );
  await page.goto("/embed-host-test");

  const chatWindow = page.locator("#chatter-widget-host >>> .window");
  await page.locator("#chatter-widget-host >>> .bubble").click();
  await expect(chatWindow).toHaveClass(/open/);
  await page.locator("#chatter-widget-host >>> .bubble").click();
  await expect(chatWindow).not.toHaveClass(/open/);

  // The 2s auto-open timer was already scheduled before the manual
  // toggle — it must stay cancelled, not force the window back open.
  await page.waitForTimeout(2500);
  await expect(chatWindow).not.toHaveClass(/open/);
});
