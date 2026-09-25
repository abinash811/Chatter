// Design-system guardrail: app/ imports shared primitives from the
// barrel (components/ui/index.ts) only, never a specific file inside it
// — one import path, so it can't quietly diverge per page. See
// docs/conventions.md. components/ itself is exempt (that's where the
// barrel's own re-exports live).

import { readFileSync } from "fs";
import { execSync } from "child_process";

const files = execSync("git ls-files 'app/**/*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const DIRECT_IMPORT = /from ["']@\/components\/ui\/[^"']+["']/;

let failed = false;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (DIRECT_IMPORT.test(line)) {
      console.error(`FAIL: ${file}:${i + 1} imports directly from a components/ui file instead of the barrel:\n  ${line.trim()}`);
      failed = true;
    }
  });
}

if (failed) {
  console.error('\nImport from "@/components/ui" (the barrel) instead.');
  process.exit(1);
}
console.log("ok: app/ imports shared components through the barrel only");
