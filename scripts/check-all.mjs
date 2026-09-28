// Runs all 10 guardrail checks in one Node process instead of npm's
// previous `check:isolation && check:vertical && ...` chain, which spawned
// a fresh `node` process per check (9 process starts, each paying Node's
// own startup cost). Behavior is identical, not just faster: each
// check-*.mjs still runs its top-level logic unmodified via dynamic
// import and still calls `process.exit(1)` on failure, which still
// terminates the whole run immediately — the same short-circuit-on-first-
// failure semantics the `&&` chain had, just without the extra process
// spawns. Order matches the old chain in package.json.
//
// Deliberately does NOT touch the 9 check-*.mjs files themselves (still
// runnable standalone via their own `check:<name>` npm scripts) — only
// adds this thin sequencer, so none of the existing, already-verified
// guardrail logic is at risk of a regression from this consolidation.

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
];

for (const check of CHECKS) {
  await import(check);
}
