// Guardrail: every cva variant in scripts/token-variant-manifest.json
// that's actually used by real app code must list the tests/visual/
// spec file(s) that render it ("coveredBy"), and those files must
// exist. `coveredBy: null` is only valid for a variant with zero real
// call sites — verified here against a real grep, not just trusted.
//
// Exists because check-token-variant-mapping.mjs (this script's
// sibling) can only catch a variant's token classes *changing* — it
// can't catch a variant shipping with the wrong classes from day one,
// because there's nothing earlier to diff against. The actual gap this
// closes: when this check was added, `success` (Badge's new
// Published/Connected/Ongoing/test-pass variant, 2026-10-08) had real
// call sites in 3 files and zero tests/visual/ coverage — none of the
// 19 existing baselines happened to publish a bot, connect Shopify, or
// open a conversation's Details tab. A screen could ship a real status
// color with nobody ever actually looking at a rendered pixel of it.

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const MANIFEST_PATH = "scripts/token-variant-manifest.json";
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

// Not a real JSX/AST parse (same tradeoff check-rls-coverage.mjs's own
// header comment makes for schema.prisma), but a plain "is this quoted
// string anywhere in the file" grep was too coarse: "default" and
// "alert" are both real, unrelated prop values elsewhere in this exact
// codebase (Button's own "default" variant in AddActionDialog.tsx's
// template picker, components/ui/alert.tsx's `role="alert"`) and
// produced false FAILs when this check was first written. Two
// deliberately narrow heuristics instead, matched against this
// codebase's two real call-site shapes:
//  1. the variant string appears within a short window right after a
//     `<Badge` tag (every direct `<Badge variant="x">` /
//     `<Badge variant={cond ? "x" : "y"}>` call site in this app today)
//  2. the variant string appears inside a `Record<..., "x" | ...>` type
//     annotation in a file that also renders `<Badge` somewhere
//     (ApprovalsTable.tsx's STATUS_VARIANT indirection — the one real
//     call site that doesn't put the literal string next to the tag)
const BADGE_WINDOW = 400;

function hasRealCallSite(variant) {
  let files;
  try {
    files = execSync("git ls-files 'app/**/*.tsx' 'components/console/**/*.tsx'", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return false;
  }

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.includes("<Badge")) continue;

    let idx = content.indexOf("<Badge");
    while (idx !== -1) {
      const window = content.slice(idx, idx + BADGE_WINDOW);
      if (window.includes(`"${variant}"`)) return true;
      idx = content.indexOf("<Badge", idx + 1);
    }

    const recordRe = new RegExp(`Record<[^>]*"${variant}"[^>]*>`, "s");
    if (recordRe.test(content)) return true;
  }
  return false;
}

let failed = false;

for (const [file, spec] of Object.entries(manifest)) {
  if (file.startsWith("_")) continue;
  for (const [variant, { coveredBy }] of Object.entries(spec.variants)) {
    const usedForReal = hasRealCallSite(variant);

    if (coveredBy === null) {
      if (usedForReal) {
        console.error(
          `FAIL: ${file}'s "${variant}" variant is marked coveredBy: null in ${MANIFEST_PATH}, but it has real ` +
            `call sites in app code — add a tests/visual/ spec that actually renders it and list the file(s), ` +
            `or this exemption is stale.`,
        );
        failed = true;
      }
      continue;
    }

    if (!Array.isArray(coveredBy) || coveredBy.length === 0) {
      console.error(
        `FAIL: ${file}'s "${variant}" variant has no visual coverage recorded in ${MANIFEST_PATH} — ` +
          `list the tests/visual/ spec file(s) that render it, or set coveredBy: null if it's genuinely unused.`,
      );
      failed = true;
      continue;
    }

    for (const specFile of coveredBy) {
      if (!existsSync(specFile)) {
        console.error(`FAIL: ${file}'s "${variant}" variant claims coverage from ${specFile}, which doesn't exist.`);
        failed = true;
      }
    }

    if (!usedForReal) {
      console.error(
        `FAIL: ${file}'s "${variant}" variant lists visual coverage in ${MANIFEST_PATH} but has no real call site ` +
          `in app code anymore — either it's dead code (remove the variant) or the manifest is stale.`,
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    "\nA status variant with no real screenshot behind it is exactly how 'success' shipped uncovered on 2026-10-08 " +
      "— see docs/changelog.md's design-drift-automation entry.",
  );
  process.exit(1);
}

console.log("ok: every real-call-sited cva variant in the manifest has recorded, real visual coverage");
