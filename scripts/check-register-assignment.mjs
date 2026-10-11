// Guardrail: every console route (every app/(console)/**/page.tsx) must
// have a register assignment (linear/notion/stripe) recorded in
// scripts/register-manifest.json — a new screen can't ship with no one
// having consciously decided which register it belongs to.
//
// Exists because docs/architecture.md §7 and .claude/rules/console-
// frontend.md item 3 state a real rule — Linear register for daily-
// driver screens, Notion for configuration surfaces, Stripe for
// anything touching business data/credentials — but nothing made that
// rule checkable before this: the assignment only ever lived as prose,
// so there was no way to tell a screen was never classified at all
// until someone happened to read the architecture doc and notice.
//
// Deliberately scoped to assignment coverage only, not density
// verification. A fuller version of this check — does the page's
// actual spacing/shadow/decoration level match its assigned register —
// was attempted first and shelled out: the one candidate mechanical
// signal in this codebase (the `h-row` page-header pattern) turned out
// to be used identically across all three registers for an unrelated
// reason (it's this app's universal page-header height token, not a
// density differentiator), and no other concrete, already-consistent
// per-register value exists in the real code to check against today.
// Picking real numeric density targets per register is a design
// decision for a human to make (CLAUDE.md's "explain the tradeoff,
// then ask" rule), not something to invent here — see register-
// manifest.json's own header for the same note, and docs/changelog.md
// for the investigation. This check is the honest, buildable slice:
// it closes the "a screen ships with its register never decided" gap,
// not the "does this screen's density match its register" gap, which
// stays real and open until that policy decision is made.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const MANIFEST_PATH = "scripts/register-manifest.json";
const VALID_REGISTERS = new Set(["linear", "notion", "stripe"]);

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

let routes;
try {
  routes = execSync("git ls-files 'app/(console)/**/page.tsx'", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  routes = [];
}

let failed = false;

for (const route of routes) {
  const register = manifest[route];
  if (register === undefined) {
    console.error(`FAIL: ${route} has no register assignment in ${MANIFEST_PATH} — add one (linear/notion/stripe, see docs/architecture.md §7).`);
    failed = true;
    continue;
  }
  if (!VALID_REGISTERS.has(register)) {
    console.error(`FAIL: ${route} is assigned "${register}" in ${MANIFEST_PATH} — must be one of: ${[...VALID_REGISTERS].join(", ")}.`);
    failed = true;
  }
}

for (const key of Object.keys(manifest)) {
  if (key.startsWith("_")) continue;
  if (!routes.includes(key)) {
    console.error(`FAIL: ${MANIFEST_PATH} assigns a register to "${key}", which no longer exists as a route — remove the stale entry.`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nSee .claude/rules/console-frontend.md item 3: Linear (daily-driver, dense, table-based) / " +
      "Notion (configuration/creative surfaces, calm) / Stripe (business data/credentials, restrained).",
  );
  process.exit(1);
}

console.log(`ok: every console route (${routes.length}) has a register assignment`);
