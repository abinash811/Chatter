// Design-system guardrail, adopted from a sister project: a file over
// ~300 lines is a signal to split it (a page growing into an
// orchestrator-plus-components, a lib file growing into several
// concerns) rather than a hard law — see docs/conventions.md. Flags
// app/ and components/ only; lib/, scripts/, and generated files aren't
// under this rule.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const MAX_LINES = 300;

const files = execSync("git ls-files 'app/**/*.tsx' 'app/**/*.ts' 'components/**/*.tsx' 'components/**/*.ts'", {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n").length;
  if (lines > MAX_LINES) {
    console.error(`FAIL: ${file} has ${lines} lines (max ${MAX_LINES}) — split it`);
    failed = true;
  }
}

if (failed) {
  console.error("\nAn orchestrator page should import components, not contain all their JSX.");
  process.exit(1);
}
console.log(`ok: no app/ or components/ file over ${MAX_LINES} lines`);
