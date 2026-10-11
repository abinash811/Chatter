// Guardrail: every real console route (app/(console)/**/page.tsx) must
// have a row in BOTH of docs/design/audit.md's living tables — Depth/
// polish and Responsive & accessibility — named in scripts/audit-
// coverage-manifest.json.
//
// Why this exists: every real design bug recorded in docs/changelog.md
// was caught by a screenshot taken AFTER a screen shipped, never by a
// check run before. Asked directly why design quality kept slipping
// (2026-10-11), the honest answer was a discipline gap, not a tooling
// one — audit.md's own "Process note" already says "if a new screen
// ships without a row here, that's the gap to close," but nothing ever
// made that mechanically true. This check closes exactly that narrow
// slice, the same way check-register-assignment.mjs closed "a screen
// shipped with its register never decided": a screen can no longer
// ship with its audit.md row simply missing or never created.
//
// Deliberately does NOT check the row's *content* — whether the
// critique in it is any good, whether it's stale, whether a 🔲 cell
// should by now be ✅. That's a real judgment call a human or an agent
// has to make for real (.claude/rules/console-frontend.md item 8 +
// ship-checklist's item 13), and no script can substitute for actually
// looking at the screen. This only guarantees the row exists at all —
// the mechanical half of the gap, not the judgment half.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const REGISTER_MANIFEST_PATH = "scripts/register-manifest.json";
const AUDIT_MANIFEST_PATH = "scripts/audit-coverage-manifest.json";
const AUDIT_DOC_PATH = "docs/design/audit.md";

const registerManifest = JSON.parse(readFileSync(REGISTER_MANIFEST_PATH, "utf8"));
const auditManifest = JSON.parse(readFileSync(AUDIT_MANIFEST_PATH, "utf8"));
const auditDoc = readFileSync(AUDIT_DOC_PATH, "utf8");

const exempt = new Set(Object.keys(auditManifest._exempt ?? {}));

let routes;
try {
  routes = execSync("git ls-files 'app/(console)/**/page.tsx'", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  routes = [];
}

// Split the doc into its two living tables by section header, so a
// name match is scoped to the right table and can't be satisfied by a
// mention anywhere else in the file (a changelog-style prose mention,
// the "open findings" section, etc).
function extractSection(doc, headerText, nextHeaderPrefix = "## ") {
  const startIdx = doc.indexOf(`## ${headerText}`);
  if (startIdx === -1) return "";
  const afterHeader = doc.slice(startIdx + headerText.length + 3);
  const endIdx = afterHeader.indexOf(`\n${nextHeaderPrefix}`);
  return endIdx === -1 ? afterHeader : afterHeader.slice(0, endIdx);
}

const depthPolishSection = extractSection(auditDoc, "Depth/polish (principles.md #5/#9)");
const accessibilitySection = extractSection(auditDoc, "Responsive & accessibility");

function hasRow(section, name) {
  // Row format is "| Name | ..." — escape the name for regex safety
  // (none of today's names have special chars, but don't assume).
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowPattern = new RegExp(`^\\|\\s*${escaped}\\s*\\|`, "m");
  return rowPattern.test(section);
}

let failed = false;

for (const route of routes) {
  if (Object.prototype.hasOwnProperty.call(registerManifest, route) === false) continue; // not a real route per the register manifest's own scope (shouldn't happen, same glob)
  if (exempt.has(route)) continue;

  const names = auditManifest[route];
  if (!names) {
    console.error(`FAIL: ${route} has no entry in ${AUDIT_MANIFEST_PATH} — add one (the row name it should appear under in both of docs/design/audit.md's tables), or list it under "_exempt" with a real reason.`);
    failed = true;
    continue;
  }

  const [depthPolishName, accessibilityName] = names;
  if (!hasRow(depthPolishSection, depthPolishName)) {
    console.error(`FAIL: ${route} — "${depthPolishName}" has no row in docs/design/audit.md's "Depth/polish" table.`);
    failed = true;
  }
  if (!hasRow(accessibilitySection, accessibilityName)) {
    console.error(`FAIL: ${route} — "${accessibilityName}" has no row in docs/design/audit.md's "Responsive & accessibility" table.`);
    failed = true;
  }
}

for (const key of Object.keys(auditManifest)) {
  if (key.startsWith("_")) continue;
  if (!routes.includes(key)) {
    console.error(`FAIL: ${AUDIT_MANIFEST_PATH} has an entry for "${key}", which no longer exists as a route — remove the stale entry.`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nSee docs/design/audit.md's own \"Process note\": a new screen can't ship without a row there. " +
      "This only checks the row exists — the real critique (.claude/rules/console-frontend.md item 8) still has to actually happen.",
  );
  process.exit(1);
}

console.log(`ok: every console route (${routes.length - exempt.size}) has a docs/design/audit.md row in both living tables`);
