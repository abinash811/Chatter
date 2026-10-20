// Guardrail: a cva variant's color-bearing classes must match
// scripts/token-variant-manifest.json's recorded tokens exactly — any
// change to what a variant visually means must be a deliberate,
// reviewed edit to the manifest, not a silent one.
//
// Exists because this is the exact bug class that's recurred in this
// project more than any other (docs/design/audit.md's "System
// coverage" table): Badge's `default` variant used `bg-accent` when it
// should have been `bg-primary` (2026-09-27), then `bg-primary` when it
// should have been a neutral pill (2026-10-08) — both times, the
// variant's class string silently carried the wrong visual weight for
// months with nothing catching it until someone took a screenshot.
// check-design-tokens.mjs only blocks a *raw* color (a hex code, an
// arbitrary Tailwind scale class); it was never built to catch a
// *token* being reused for the wrong semantic job, because that's
// still a syntactically valid token reference. This check closes that
// specific gap for the components that have actually drifted.
//
// Deliberately scoped to the manifest's own file list, not every
// cva-driven component in components/ui/ — building a universal
// variant-token parser for all 26 primitives speculatively, before any
// of the others have shown this failure mode, would be exactly the
// kind of premature abstraction CLAUDE.md's engineering rules warn
// against. Extend the manifest (add a new top-level file key, same
// shape) if another component earns it the same way Badge did.

import { readFileSync } from "fs";

const MANIFEST_PATH = "scripts/token-variant-manifest.json";
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

// Matches a Tailwind color utility class that references a design
// token, including an opacity modifier (bg-success/10) and a state/
// breakpoint prefix (hover:bg-accent, dark:bg-input) — the prefix isn't
// captured, just the bg-/text-/border-/ring- utility itself, which is
// what the manifest records.
const TOKEN_CLASS_RE = /\b(?:bg|text|border|ring)-[a-z][a-z0-9-]*(?:\/\d{1,3})?\b/g;

// Finds `${groupName}: {` and returns the content of that object,
// found via real brace-depth counting rather than a fixed-indentation
// regex — robust to whatever indentation a given component's cva call
// happens to use, and to any further nested object inside a variant's
// own value (none exist today, but a fixed-indentation regex would
// silently truncate early if one were ever added, the same class of
// bug check-rls-coverage.mjs's own header comment documents for a
// brace-matching regex elsewhere in this codebase).
function extractBlock(content, groupName) {
  const marker = `${groupName}: {`;
  const start = content.indexOf(marker);
  if (start === -1) return null;
  let i = start + marker.length;
  let depth = 1;
  const blockStart = i;
  while (depth > 0 && i < content.length) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") depth--;
    i++;
  }
  return content.slice(blockStart, i - 1);
}

// Parses `key: "classes",` or `key:\n  "classes",` (button.tsx's own
// real shadcn source wraps a long string onto its own line) into
// [key, classString] pairs.
function parseEntries(block) {
  const entries = [];
  const re = /(\w[\w-]*):\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    entries.push([match[1], match[2]]);
  }
  return entries;
}

function tokensOf(classString) {
  return [...classString.matchAll(TOKEN_CLASS_RE)].map((m) => m[0]).sort();
}

let failed = false;

for (const [file, spec] of Object.entries(manifest)) {
  if (file.startsWith("_")) continue;
  const content = readFileSync(file, "utf8");
  const block = extractBlock(content, spec.variantGroup);
  if (block === null) {
    console.error(`FAIL: ${file} has no "${spec.variantGroup}: {" block — scripts/token-variant-manifest.json is stale for this file.`);
    failed = true;
    continue;
  }
  const actual = new Map(parseEntries(block));
  const manifestKeys = new Set(Object.keys(spec.variants));
  const actualKeys = new Set(actual.keys());

  for (const key of actualKeys) {
    if (!manifestKeys.has(key)) {
      console.error(
        `FAIL: ${file} has a "${key}" variant with no entry in ${MANIFEST_PATH} — ` +
          `add one (tokens + coveredBy) so a future change to its color classes is caught, not silent.`,
      );
      failed = true;
    }
  }
  for (const key of manifestKeys) {
    if (!actualKeys.has(key)) {
      console.error(`FAIL: ${MANIFEST_PATH} records a "${key}" variant for ${file} that no longer exists in code — remove the stale entry.`);
      failed = true;
      continue;
    }
    const expected = [...spec.variants[key].tokens].sort();
    const got = tokensOf(actual.get(key));
    const same = expected.length === got.length && expected.every((t, i) => t === got[i]);
    if (!same) {
      console.error(
        `FAIL: ${file}'s "${key}" variant's token classes changed:\n` +
          `  expected (${MANIFEST_PATH}): ${expected.join(", ") || "(none)"}\n` +
          `  actual (code):              ${got.join(", ") || "(none)"}\n` +
          `  If this is a deliberate semantic change, update the manifest's "tokens" in the same commit.`,
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    "\nSee docs/design/audit.md's 'System coverage' table — a token silently reused for the wrong meaning is the " +
      "single most-repeated real bug in this project's design history.",
  );
  process.exit(1);
}

const fileCount = Object.keys(manifest).filter((k) => !k.startsWith("_")).length;
console.log(`ok: every cva variant in ${fileCount} manifested component(s) matches its documented token mapping`);
