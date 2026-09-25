// Single source of truth for "is this file a verbatim-pulled CARE
// primitive" (ADR 0008) — used by every guardrail script that exempts
// these files, instead of each one copy-pasting the same regex. Was
// duplicated across check-design-tokens.mjs, check-no-raw-buttons.mjs,
// and check-file-length.mjs before this; scripts/check-guardrail-
// exemptions.mjs (the visibility report over all of this) also imports
// it, so the report and the enforcement can never silently drift apart.
//
// These files are treated as part of the token/primitive layer, not
// app code — CARE's real design vocabulary uses raw Tailwind scales
// and its own <button>, and its registry items are one file each,
// matching upstream exactly so a re-pull stays a clean diff. Hand-
// authored app/component code is never exempt by this check.

const CARE_REGISTRY_HEADER = /@type registry:/;

export function isVerbatimCareFile(filePath, content) {
  return filePath.startsWith("components/ui/") && CARE_REGISTRY_HEADER.test(content.slice(0, 300));
}
