import { defineConfig } from "@playwright/test";
import { existsSync } from "fs";

// A persistent, CI-run regression suite — replacing the pattern of
// writing a throwaway Playwright script to verify something, running
// it once, then deleting it (which is what every feature in this
// project was actually verified with, until now). Nothing here was
// caught by tsc or the build; every one of these was only findable by
// actually driving the app in a browser — see each spec file's own
// comments for the real bug it caught.
//
// The sandbox this was built in needs an explicit chromium path
// (/opt/pw-browsers/chromium); CI and a normal local `npx playwright
// install` don't, so this only applies the override when that
// specific path exists rather than hardcoding it for every
// environment.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // each test creates real DB rows via signup — avoid cross-test races
  // CI's 2-vCPU runner genuinely stalls under 2 parallel workers once the
  // suite grew past ~85 specs (confirmed 2026-09-28 on PR #11: a save/
  // publish toast assertion missed even a generous 20s timeout, a
  // different test each run — not a deterministic bug, since the same
  // test passes instantly alone). A single retry is the standard fix for
  // this class of transient CI resource contention — it does not mask a
  // real regression, since a genuinely broken test fails identically on
  // the retry too. Local runs stay at 0 retries so a real bug still
  // fails loud on the first try during development.
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.APP_BASE_URL ?? "http://localhost:3000",
    launchOptions: existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {},
  },
  webServer: {
    command: "npm run start",
    url: process.env.APP_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
