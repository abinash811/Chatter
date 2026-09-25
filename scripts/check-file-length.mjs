// Design-system guardrail, adopted from a sister project: a file over
// ~300 lines is a signal to split it (a page growing into an
// orchestrator-plus-components, a lib file growing into several
// concerns) rather than a hard law — see docs/conventions.md. Flags
// app/ and components/ only; lib/, scripts/, and generated files aren't
// under this rule.
//
// ADR 0008 exception: components/ui/*.tsx pulled verbatim from CARE are
// one file per upstream registry item, same as CARE ships them —
// splitting one would diverge from their real source and break
// re-pulling it later. Hand-authored app/component files still follow
// the 300-line rule. See scripts/lib/careExemption.mjs.

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { isVerbatimCareFile } from "./lib/careExemption.mjs";

const MAX_LINES = 300;

const files = execSync("git ls-files 'app/**/*.tsx' 'app/**/*.ts' 'components/**/*.tsx' 'components/**/*.ts'", {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (isVerbatimCareFile(file, content)) continue;
  const lines = content.split("\n").length;
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
