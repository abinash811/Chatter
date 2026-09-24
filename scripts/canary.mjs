// Browser-level canary: boots the app for real and drives it with a
// real browser, catching what a type-check or a unit test can't —
// broken hydration, a component that throws only in the browser, a
// route that 500s only once real request context (cookies, headers) is
// involved. Same principle as the RLS check: don't just read the code,
// run it.
//
// Requires the app running (either `npm run dev` or `next start` after
// `npm run build`) at APP_BASE_URL. This script starts and stops
// nothing itself — see .github/workflows/ci.yml or
// .githooks/pre-commit for how it's invoked with the server lifecycle
// already handled.

import { chromium } from "playwright";

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  let failed = false;

  // /login: unauthenticated entry point, must render for real.
  const loginResponse = await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  if (!loginResponse || loginResponse.status() !== 200) {
    console.error(`FAIL: /login returned ${loginResponse?.status()}`);
    failed = true;
  }
  const loginButton = await page.getByRole("button", { name: "Log in" }).count();
  if (loginButton === 0) {
    console.error("FAIL: /login did not render the login form");
    failed = true;
  } else {
    console.log("ok: /login renders and shows the login form");
  }

  // /bots: unauthenticated should redirect to /login, not 500.
  const botsResponse = await page.goto(`${BASE_URL}/bots`, { waitUntil: "networkidle" });
  if (!page.url().endsWith("/login")) {
    console.error(`FAIL: /bots (unauthenticated) did not redirect to /login — ended at ${page.url()}`);
    failed = true;
  } else {
    console.log("ok: /bots redirects to /login when unauthenticated");
  }

  if (consoleErrors.length > 0) {
    console.error("FAIL: browser console errors during canary run:");
    consoleErrors.forEach((e) => console.error(`  ${e}`));
    failed = true;
  } else {
    console.log("ok: no browser console errors");
  }

  await browser.close();

  if (failed) {
    console.error("\nCanary FAILED.");
    process.exit(1);
  }
  console.log("\nCanary passed.");
}

main();
