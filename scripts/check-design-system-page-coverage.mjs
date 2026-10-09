// Guardrail: every primitive in scripts/shadcn-manifest.json must be
// referenced somewhere under app/(console)/design-system/ — the live
// reference page can't silently fall behind the real primitive set the
// way a hand-written doc would.
//
// Scoped to *presence*, not completeness of every variant/state (that's
// a judgment call, same as every other "is this screen finished" check
// in this project — docs/design/component-checklist.md, not a script).
// A simple word-boundary text search for the component's real export
// name, same "not a real AST parse" tradeoff check-rls-coverage.mjs's
// own header comment already defends for this codebase's other
// guardrails — a false positive here just means a stale name coincides
// with real text, which hasn't happened yet and fails loud if it ever
// does (the check would then report 0 missing when one is really
// missing, so this is checked by hand against the manifest, not just
// trusted).
//
// Deliberately does NOT cover design tokens (color/type/spacing/
// elevation/motion) — TokensSection.tsx's own header comment names
// that as this page's one real, separately-acknowledged gap (a token
// added to app/globals.css with no matching swatch); building a second
// mechanical check for that would need to parse CSS custom properties
// against JSX swatch props, a bigger lift than this file's scope today.

import { readFileSync, readdirSync } from "fs";

const MANIFEST_PATH = "scripts/shadcn-manifest.json";
const PAGE_DIR = "app/(console)/design-system";

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

function toPascalCase(kebabFilename) {
  const base = kebabFilename.replace(/\.tsx$/, "");
  return base
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

const pageFiles = readdirSync(PAGE_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => `${PAGE_DIR}/${f}`);
const pageContent = pageFiles.map((f) => readFileSync(f, "utf8")).join("\n");

let failed = false;

for (const file of manifest.files) {
  const componentName = toPascalCase(file);
  const re = new RegExp(`\\b${componentName}\\b`);
  if (!re.test(pageContent)) {
    console.error(
      `FAIL: components/ui/${file}'s "${componentName}" is never referenced anywhere under ${PAGE_DIR}/ — ` +
        `add it to the Components section (or Tokens, if it's token-only).`,
    );
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nA primitive missing from the live reference page defeats its whole point — see docs/changelog.md's " +
      "2026-10-08 /design-system entries for why this is checked, not just hoped for.",
  );
  process.exit(1);
}

console.log(`ok: all ${manifest.files.length} components/ui/ primitives are referenced on the /design-system reference page`);
