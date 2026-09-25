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
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});
