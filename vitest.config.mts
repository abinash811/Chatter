import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Vitest, not Jest — current practice for a Next.js/TS project in 2026
// (native ESM/TS, ~5-10x faster, same describe/it/expect API). See
// docs/research/current-practices.md. Split from tests/e2e/'s Playwright
// suite: this covers fast, isolated unit/component tests (lib/ai/'s
// engine logic, schemas, utils) — Playwright stays the real-browser
// full-flow layer. Neither replaces the other.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.d.ts"],
      // Real thresholds checked via `npm run test:unit:coverage`
      // (2026-09-27), not invented: current numbers are ~68.5%
      // statements/lines, 65.5% branches, 62.6% functions — set a few
      // points below that as a real regression floor, not a target
      // retroactively demanding tests for files intentionally covered
      // by tests/e2e/ instead (lib/auth.ts, lib/db.ts, lib/ai/
      // botConfig.ts, etc. sit at 0% here on purpose — see this file's
      // own header comment on the unit/e2e split). This only fails CI
      // if coverage actually regresses from where it already is.
      thresholds: {
        statements: 65,
        lines: 65,
        functions: 60,
        branches: 62,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});
