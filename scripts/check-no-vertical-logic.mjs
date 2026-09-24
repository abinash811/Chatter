// Guardrail #2: no vertical-specific logic in the core engine. Anything
// ecommerce/healthcare/automotive-specific belongs in a template
// (docs/adr/0001), never a branch in lib/ai/*, lib/db.ts, etc. This is
// exactly the mistake CLAUDE.md warns about: "if you find yourself
// writing `if industry == 'healthcare'` in core code, stop."
//
// Deliberately excludes lib/ai/tools/ and lib/integrations/ — a tool or
// integration *named* after a vertical concept (checkOrderStatus.ts,
// shopify.ts) is expected and fine; the violation is the *engine*
// branching on which vertical it's serving, not a vertical-specific tool
// existing.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const CORE_PATHS = ["lib/ai/gateway.ts", "lib/ai/chat.ts", "lib/ai/systemPrompt.ts", "lib/ai/botConfig.ts", "lib/db.ts", "lib/auth.ts"];
const VERTICAL_WORDS = /\b(ecommerce|healthcare|automotive|shopify|fhir|emr|hims)\b/i;

let failed = false;

for (const file of CORE_PATHS) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue; // file doesn't exist yet — nothing to check
  }
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (line.trim().startsWith("//")) return; // comments can reference verticals for explanation
    if (VERTICAL_WORDS.test(line)) {
      console.error(`FAIL: ${file}:${i + 1} references a specific vertical in core engine code:\n  ${line.trim()}`);
      failed = true;
    }
  });
}

if (failed) {
  console.error("\nVertical-specific behavior belongs in a template (docs/adr/0001), not the core engine.");
  process.exit(1);
}
console.log("ok: no vertical-specific logic in the core engine");
