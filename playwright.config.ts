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
  retries: 0,
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
