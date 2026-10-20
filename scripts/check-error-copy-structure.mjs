// Guardrail: a generic failure message in the shape "Couldn't <X>.
// Please try again." must name a real reason in between — "Couldn't
// <X> — <reason>. Please try again." — not jump straight from what
// failed to what to do next with nothing in the middle.
//
// Exists because this was a real, repeated gap: `docs/design/audit.md`
// ("Bots list — open findings") documents that rename/archive's error
// toasts were fixed on 2026-09-27 to add a reason clause ("the change
// didn't save") instead of jumping straight to "Please try again" —
// but that fix was never rolled out anywhere else. A grep at the time
// this check was added found 21 more server-action error messages
// across actions/knowledge/widgets/conversations/approvals/settings
// still missing it. `docs/design/component-checklist.md` item 5 named
// "three-part errors" as a real structural rule with no mechanical
// check behind it — this is that check, scoped to the one concrete,
// recurring, already-named pattern (not a general prose-quality
// checker, which can't be done reliably with a regex).
//
// Deliberately narrow: only strings that literally start with
// "Couldn't" and end with "Please try again." are checked — that's
// the one established template this project actually uses for a
// generic failure toast (see app/(console)/bots/actions.ts's rename/
// archive messages, the precedent this check generalizes). A
// validation message ("A name is required.", "That URL isn't allowed
// — it must be a public https:// address.") is a different, legitimate
// category — the message itself already names the problem directly,
// there's no separate "reason" to add — so it's not required to match
// this template at all, only penalized if it tries to and gets the
// structure wrong.

import { readFileSync } from "fs";
import { execSync } from "child_process";

// Scoped to where user-facing copy actually originates — server
// actions (`actions.ts`) and `components/console/` (the one known
// client-side toast.error call site, BotsTable.tsx's duplicate
// failure) — not tests/ (which only ever quotes these strings back,
// never originates them) or scripts/ (this file's own comment, above,
// would otherwise false-positive on itself).
let files;
try {
  files = execSync("git ls-files 'app/**/actions.ts' 'components/console/**/*.tsx'", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  files = [];
}

const STRING_RE = /"((?:[^"\\]|\\.)*)"/g;
// A real reason clause: an em dash, then at least a few words, before
// the closing ". Please try again." — not just an em dash with
// nothing meaningful after it.
const WELL_FORMED_RE = /^Couldn't .+ — .{6,}\. Please try again\.$/;

let failed = false;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  let match;
  STRING_RE.lastIndex = 0;
  while ((match = STRING_RE.exec(content)) !== null) {
    const str = match[1];
    if (!str.startsWith("Couldn't") || !str.includes("Please try again")) continue;
    if (!WELL_FORMED_RE.test(str)) {
      const line = content.slice(0, match.index).split("\n").length;
      console.error(
        `FAIL: ${file}:${line} — a "Couldn't ... Please try again." message with no reason clause in between:\n` +
          `  "${str}"\n` +
          `  Add one: "Couldn't <do the thing> — <real reason>. Please try again."`,
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    "\nSee docs/design/component-checklist.md item 5 and docs/design/audit.md's 'Bots list — open findings' — " +
      "a generic reason ('the change didn't save', 'it wasn't removed') is fine when there's no more specific " +
      "cause available; jumping straight from what failed to 'try again' with nothing in between is the thing " +
      "this check blocks.",
  );
  process.exit(1);
}

console.log("ok: every generic failure message names a reason between what failed and what to do next");
