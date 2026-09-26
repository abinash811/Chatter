// Visibility report, not a gate — always exits 0. Every guardrail check
// (scripts/check-*.mjs) that carves out an exception is individually
// justified, but nothing showed the *collective* picture: how many
// files are currently trusted rather than mechanically enforced, and
// why. Run this whenever that picture is worth checking — it's not
// wired into check:all on purpose, since a growing exemption count
// isn't itself a failure, just something worth staying aware of.
//
// Two kinds of exemption exist:
//  1. A few named, stable files (ALLOWLIST in a handful of scripts) —
//     each has its own one-line reason below.
//  2. Every components/ui/*.tsx pulled verbatim from an upstream
//     registry (originally ADR 0008's CARE pulls; as of ADR 0017,
//     shadcn's own official registry via scripts/pull-shadcn-
//     component.mjs) — computed dynamically via the same helper the
//     checks themselves use (scripts/lib/careExemption.mjs), so this
//     report and the actual enforcement can never silently drift apart.

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { isVerbatimCareFile } from "./lib/careExemption.mjs";

const NAMED_ALLOWLIST = [
  { file: "app/globals.css", checks: ["design-tokens"], why: "the token definitions themselves" },
  { file: "tailwind.config.ts", checks: ["design-tokens"], why: "the token definitions themselves" },
  {
    file: "app/global-error.tsx",
    checks: ["design-tokens", "no-raw-buttons"],
    why: "replaces the entire root layout when triggered — can't assume the component library still works",
  },
  {
    file: "lib/db.ts",
    checks: ["tenant-isolation"],
    why: "the one file allowed to hold a raw PrismaClient — everything else must go through it",
  },
  {
    file: "lib/auth.ts",
    checks: ["tenant-isolation"],
    why: "identity resolution against RLS-exempt tables (BotPublicKey, UserOrgAccess) has to run before org context exists",
  },
];

const uiFiles = execSync("git ls-files 'components/ui/*.tsx'", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const careFiles = uiFiles.filter((f) => isVerbatimCareFile(f, readFileSync(f, "utf8")));

console.log("Named exemptions (stable, individually justified):\n");
for (const entry of NAMED_ALLOWLIST) {
  console.log(`  ${entry.file}`);
  console.log(`    checks: ${entry.checks.join(", ")}`);
  console.log(`    why: ${entry.why}\n`);
}

console.log(
  `Verbatim registry pulls (all shadcn's official source as of ADR 0017) — exempt from design-tokens, no-raw-buttons, and file-length together: ${careFiles.length} file(s)\n`,
);
for (const f of careFiles) console.log(`  ${f}`);

console.log(`\nTotal: ${NAMED_ALLOWLIST.length} named + ${careFiles.length} verbatim-pulled = ${NAMED_ALLOWLIST.length + careFiles.length} files with at least one guardrail exemption.`);
