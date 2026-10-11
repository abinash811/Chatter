// Guardrail: every file in components/ui/ must be a verified shadcn/ui
// pull (or a rebase of one with documented deltas) — never a primitive
// invented from scratch, however closely it imitates shadcn's style.
//
// User directive, 2026-09-28: "There shouldn't be any hand rolled in
// the product. Whole tool should use only shadcn." This check is the
// mechanical answer to "how do we make sure in future we don't miss
// this" — a new components/ui/ file that isn't in
// scripts/shadcn-manifest.json fails the build, the same way an
// unlisted design-token or a raw <button> already does.
//
// Why a manifest instead of sniffing for shadcn's own `@type registry:`
// JSDoc header (what an earlier version of this enforcement idea
// assumed): that header isn't actually present on every real shadcn
// source file — confirmed by pulling input/textarea/label/checkbox/
// badge/card/sonner for real and finding none of them carry it, only a
// subset (button, avatar, switch, ...) do. A marker that doesn't exist
// on legitimate real source would produce false failures, so the
// manifest — an explicit, human-verified list, same trust model as the
// NAMED_ALLOWLIST in check-guardrail-exemptions.mjs — is the honest
// mechanism.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const manifest = JSON.parse(readFileSync("scripts/shadcn-manifest.json", "utf8"));
const verified = new Set(manifest.files);

const uiFiles = execSync("git ls-files 'components/ui/*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;
for (const file of uiFiles) {
  const basename = file.replace("components/ui/", "");
  if (!verified.has(basename)) {
    console.error(
      `FAIL: ${file} is not in scripts/shadcn-manifest.json — every components/ui/ primitive must be a verified shadcn/ui pull.`,
    );
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nPull the real source first (node scripts/pull-shadcn-component.mjs <name>), rebase any deliberate " +
      "customizations onto it with a documented header comment (see components/ui/input.tsx or card.tsx for the " +
      "pattern), then add the filename to scripts/shadcn-manifest.json's \"files\" array.",
  );
  process.exit(1);
}

console.log(`ok: all ${uiFiles.length} components/ui/ primitives are verified shadcn/ui sources`);
