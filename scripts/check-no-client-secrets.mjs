// Guardrail #5: secrets never ship to widget/client code. Flags any
// "use client" component or anything under a future widget/ directory
// that references a secret-looking env var. Everything today is server
// components/actions (no "use client" files exist yet), so this
// currently passes trivially — it exists so the day someone adds the
// first client component, this check is already there rather than
// added after a leak.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const SECRET_PATTERN = /process\.env\.\w*(SECRET|API_KEY|TOKEN|PASSWORD|CLIENT_SECRET)\w*/;

const files = execSync("git ls-files '*.ts' '*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const isClientCode = /^["']use client["'];?/m.test(content) || file.startsWith("widget/");
  if (isClientCode && SECRET_PATTERN.test(content)) {
    console.error(`FAIL: ${file} is client-facing code but references a secret-looking env var.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("ok: no secrets referenced in client-facing code");
