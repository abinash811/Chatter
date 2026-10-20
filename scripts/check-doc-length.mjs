// Same idea as check-file-length.mjs, applied to docs/ — a living doc
// (one that gets appended to over time: changelog, conventions,
// business-logic, architecture, research notes, design docs) growing
// past the threshold is a signal to archive/split it, not a hard law.
//
// Exceptions:
// - docs/adr/** — an ADR is a one-time, immutable record of a single
//   decision. It doesn't get bigger over time the way a changelog or a
//   conventions doc does, so the unbounded-growth failure mode this
//   check exists for doesn't apply to it.
// - docs/changelog/** — frozen archive batches (docs/changelog.md's own
//   archival policy). Capping an archive's length would defeat the
//   point of archiving into it.
// - docs/design/preview/** — static HTML mockups, not prose; a big
//   mockup file isn't the "nobody will read this end-to-end" problem
//   this check is for.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const MAX_LINES = 500;

// Two patterns, not one: git's ls-files glob treats "docs/**/*.md" as
// "at least one directory below docs" — it silently excludes docs/*.md
// files directly in the top-level directory (business-logic.md,
// architecture.md, changelog.md itself, etc). Caught for real: a test
// file padded past 500 lines still reported "ok" with only the `**`
// pattern. "docs/*.md" covers the direct children the `**` pattern
// misses.
const files = execSync("git ls-files 'docs/*.md' 'docs/**/*.md'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith("docs/adr/"))
  .filter((file) => !file.startsWith("docs/changelog/"))
  .filter((file) => !file.startsWith("docs/design/preview/"));

let failed = false;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n").length;
  if (lines > MAX_LINES) {
    console.error(`FAIL: ${file} has ${lines} lines (max ${MAX_LINES}) — split or archive it`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nA living doc past this size stops being something anyone reads start-to-" +
      "end. Move its oldest/least-active content out (see docs/changelog.md's " +
      "own archival policy for the pattern) rather than letting it grow forever.",
  );
  process.exit(1);
}
console.log(`ok: no living doc over ${MAX_LINES} lines`);
