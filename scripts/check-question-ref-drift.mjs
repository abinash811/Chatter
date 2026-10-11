// Visibility report, not a gate — always exits 0. Every `docs/open-
// questions.md #N` citation across the live docs (excluding ADRs and
// changelog archives, which are immutable historical records by design
// — same exemption `check-doc-length.mjs` already uses), listed
// alongside whether N is a currently-live item number.
//
// Why this exists, not a hard gate: a 2026-10-11 docs sweep found
// several real stale citations this way (architecture.md and
// audit.md both claimed site crawling was "still open" under a #3
// that no longer exists — it shipped via ADR 0030) — but a mechanical
// pass/fail check on this is genuinely unsafe to build. open-
// questions.md's own numbers get reused for unrelated items once an
// old one resolves and is deleted, and several *correct* citations are
// explicitly commentary about that exact drift (e.g. design-system-
// standards.md's "`docs/open-questions.md` #1 today is an unrelated,
// separately-resolved hosting-model question") — a naive checker can't
// tell "accidentally stale" apart from "deliberately explaining the
// staleness," and failing the build on the second case would be noise
// that trains people to ignore the check. This report surfaces the
// raw list for a human (or an agent doing a sweep) to read with real
// judgment, the same role check-guardrail-exemptions.mjs already plays
// for guardrail exceptions.
//
// Run this whenever a docs staleness sweep is worth doing, or when
// resolving/renumbering an open-questions.md item — not wired into
// check:all on purpose, same reasoning as check-guardrail-exemptions.mjs.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const EXCLUDED_PREFIXES = ["docs/adr/", "docs/changelog/"];

const openQuestionsDoc = readFileSync("docs/open-questions.md", "utf8");
const liveNumbers = new Set(
  [...openQuestionsDoc.matchAll(/^\d+\.\s|^\s*\d+\.\s/gm)]
    .map((m) => parseInt(m[0], 10))
    .filter((n) => !Number.isNaN(n)),
);

let files;
try {
  files = execSync("git ls-files '*.md'", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
} catch {
  files = [];
}
files = files.filter((f) => !EXCLUDED_PREFIXES.some((p) => f.startsWith(p)));

const citationPattern = /open-questions\.md[^.\n]{0,25}?#(\d+)/g;
const rows = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(citationPattern)) {
    const n = parseInt(match[1], 10);
    rows.push({ file, n, live: liveNumbers.has(n) });
  }
}

console.log(`Live open-questions.md item numbers: ${[...liveNumbers].sort((a, b) => a - b).join(", ")}\n`);

const stale = rows.filter((r) => !r.live);
const ok = rows.filter((r) => r.live);

console.log(`${ok.length} citation(s) point at a currently-live number.`);
if (stale.length > 0) {
  console.log(`\n${stale.length} citation(s) point at a number NOT currently live — read each in context, this is not automatically wrong (could be deliberate "this used to be #N" commentary):`);
  for (const r of stale) {
    console.log(`  #${r.n} in ${r.file}`);
  }
} else {
  console.log("No citations point at a non-live number.");
}
