// docs/architecture.md §7: consistency comes from design tokens, not
// ad hoc styling. Flags raw hex colors and Tailwind's arbitrary color
// palette classes (bg-red-500, text-blue-600, etc.) outside the token
// definitions themselves (app/globals.css, tailwind.config.ts) — every
// other file should reference a token (bg-accent, text-muted-foreground)
// instead.
//
// ADR 0008 exception: components/ui/*.tsx pulled verbatim from CARE
// (scripts/pull-care-component.mjs, marked with a `@type registry:`
// header) are themselves part of the token/primitive layer now, not
// app code using ad hoc styling — CARE's real design vocabulary uses
// full numbered Tailwind scales directly (red-700, blue-400, etc.) for
// multi-shade hover/active states, not just single semantic aliases.
// Hand-authored app code still must reference a token, never a raw
// color — this exception is for verbatim-vendored files only, and
// re-pulling a component must never be used to sneak an unrelated
// hand edit past this check.

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { isVerbatimCareFile } from "./lib/careExemption.mjs";

// app/global-error.tsx is deliberately self-contained — see its own
// file header for why it can't reference the token system.
const ALLOWLIST = new Set(["app/globals.css", "tailwind.config.ts", "app/global-error.tsx"]);
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const ARBITRARY_TAILWIND_COLOR = /\b(?:bg|text|border|ring)-(?:red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|lime|amber|emerald|violet|fuchsia|rose|sky)-\d{2,3}\b/;

const files = execSync("git ls-files '*.ts' '*.tsx' '*.css'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;

for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const content = readFileSync(file, "utf8");
  if (isVerbatimCareFile(file, content)) continue;
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    // Explicit, narrow escape hatch — for business-configurable widget
    // color defaults (docs/architecture.md §7: the widget can't have
    // one fixed brand), not a way to sneak in console UI styling. Every
    // use of this must be a genuine per-business default value, not our
    // own product's chrome.
    if (line.includes("allow-raw-color")) return;
    if (HEX_COLOR.test(line) || ARBITRARY_TAILWIND_COLOR.test(line)) {
      console.error(`FAIL: ${file}:${i + 1} uses a raw color instead of a design token:\n  ${line.trim()}`);
      failed = true;
    }
  });
}

if (failed) {
  console.error("\nUse a token from app/globals.css (bg-accent, text-muted-foreground, etc.) instead.");
  process.exit(1);
}
console.log("ok: no raw colors outside the design-token definitions");
