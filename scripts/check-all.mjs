// Runs all guardrail checks in one Node process instead of npm's
// previous `check:isolation && check:vertical && ...` chain, which spawned
// a fresh `node` process per check (one process start per check, each
// paying Node's own startup cost). Behavior is identical, not just
// faster: each check-*.mjs still runs its top-level logic unmodified via
// dynamic import and still calls `process.exit(1)` on failure, which
// still terminates the whole run immediately — the same short-circuit-
// on-first-failure semantics the `&&` chain had, just without the extra
// process spawns. Order matches the old chain in package.json.
//
// Deliberately does NOT touch the individual check-*.mjs files themselves
// (still runnable standalone via their own `check:<name>` npm scripts) —
// only adds this thin sequencer, so none of the existing, already-
// verified guardrail logic is at risk of a regression from this
// consolidation.
//
// The last 3 (2026-10-08) close a real, repeatedly-demonstrated gap: see
// each script's own header comment, and docs/changelog.md's design-
// drift-automation entry, for what each one actually catches and why
// check-design-tokens.mjs alone was never enough.

const CHECKS = [
  "./check-tenant-isolation.mjs",
  "./check-no-vertical-logic.mjs",
  "./check-no-client-secrets.mjs",
  "./check-design-tokens.mjs",
  "./check-no-raw-buttons.mjs",
  "./check-component-imports.mjs",
  "./check-file-length.mjs",
  "./check-doc-length.mjs",
  "./check-rls-coverage.mjs",
  "./check-shadcn-only-primitives.mjs",
  "./check-token-variant-mapping.mjs",
  "./check-variant-visual-coverage.mjs",
  "./check-token-contrast.mjs",
];

for (const check of CHECKS) {
  await import(check);
}
