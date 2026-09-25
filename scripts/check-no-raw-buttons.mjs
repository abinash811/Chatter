// Design-consistency guardrail, adopted from a sister project after
// Chatter's first /login page shipped as a bare unstyled form — see
// docs/design/README.md. Every clickable action goes through
// components/ui/button.tsx's <Button>, never a raw <button> tag, so
// variant/size/focus-ring styling can't silently drift per screen.

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { isVerbatimCareFile } from "./lib/careExemption.mjs";

// app/global-error.tsx is deliberately self-contained — it replaces the
// entire root layout when triggered, so it can't assume the component
// library (or anything else about the app's setup) still works.
// components/ui/button.tsx no longer needs a named entry here — it's a
// verbatim CARE pull now too (ADR 0008), already covered by
// isVerbatimCareFile below. (Found via scripts/check-guardrail-
// exemptions.mjs surfacing it as a redundant double-exemption.)
const ALLOWLIST = new Set(["app/global-error.tsx"]);
// ADR 0008: components/ui/*.tsx pulled verbatim from CARE (button.tsx
// included) are themselves primitives — they may define their own raw
// <button> internally (e.g. sidebar.tsx's trigger). App code (app/,
// hand-authored components) still must always go through <Button>.
// See scripts/lib/careExemption.mjs.

const files = execSync("git ls-files 'app/**/*.tsx' 'components/**/*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

let failed = false;

for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const content = readFileSync(file, "utf8");
  if (isVerbatimCareFile(file, content)) continue;
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (/<button\b/.test(line)) {
      console.error(`FAIL: ${file}:${i + 1} uses a raw <button> tag instead of <Button>:\n  ${line.trim()}`);
      failed = true;
    }
  });
}

if (failed) {
  console.error("\nUse <Button> from components/ui/button.tsx instead.");
  process.exit(1);
}
console.log("ok: no raw <button> tags outside components/ui/button.tsx");
