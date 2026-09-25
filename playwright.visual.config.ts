import { defineConfig } from "@playwright/test";
import { existsSync } from "fs";

// Separate from playwright.config.ts (tests/e2e/'s functional flows)
// deliberately — visual snapshots have a different lifecycle (baselines
// get regenerated with --update-snapshots, functional specs never
// should) and different settings (animations off, a fixed viewport,
// masking anything that's legitimately non-deterministic).
//
// Known risk, not hidden: a screenshot baseline is only trustworthy
// compared against a run in the *same* rendering environment it was
// generated in. These baselines were generated in this project's own
// sandboxed dev environment against the same Playwright/Chromium
// revision CI's `npx playwright install chromium --with-deps` installs
// (see .github/workflows/ci.yml) — not literally the same machine. If
// CI ever reports a diff that isn't a real visual regression when you
// look at the artifact, that's environment drift (font rasterization,
// GPU/software rendering path, etc.), not a bug in the app — the fix is
// to regenerate baselines from a CI run itself (`workflow_dispatch` a
// job running `npm run test:visual:update`, then commit the result),
// not to keep trusting a local machine's render forever.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      // No maxDiffPixelRatio/maxDiffPixels — deliberately. A ratio cap
      // is a real-page-size escape hatch: a small but meaningful
      // element (a 26px brand icon against a 1280x800 screenshot) can
      // change color entirely and still fall under a 2%-of-image
      // threshold, which is exactly what happened when this was first
      // set to 0.02 and verified against a real, intentional change
      // that should have failed and didn't. Playwright's default
      // per-pixel `threshold` (anti-aliasing tolerance) is enough on
      // its own; only animations are disabled here for determinism.
      animations: "disabled",
    },
  },
  use: {
    baseURL: process.env.APP_BASE_URL ?? "http://localhost:3000",
    launchOptions: existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {},
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run start",
    url: process.env.APP_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
