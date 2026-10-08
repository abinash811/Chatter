// Guardrail: every documented text/background token pair in
// scripts/contrast-pairs.json must pass WCAG AA (4.5:1) for normal
// text, computed for real from the actual oklch values in
// app/globals.css — in both the light (:root) and dark (.dark) themes.
//
// Exists because every contrast fix in this project's history so far
// (--muted-foreground/--destructive darkened 2026-10-02 ADR 0033,
// --accent darkened 2026-10-02, the --success-strong/--warning-strong/
// --alert-strong tokens added 2026-10-08) was found by hand: someone
// picked a tailwindcss/colors step, reasoned by analogy to a
// previously-fixed pair, and the result was only actually verified
// when it happened to render on a page axe's accessibility.spec.ts
// scans. A new token pair that never renders on a scanned page — or
// renders on one only in dark mode, which no automated check covers
// at all (docs/design/audit.md's "Dark mode 🟡" row) — could silently
// fail contrast with nothing catching it. This computes every
// documented pair directly from the token values themselves, with no
// dependency on which pages happen to be scanned or whether dark mode
// has ever been looked at.
//
// Alpha-blended pairs (a Badge's bg-X/10 tint) are composited over
// their real backdrop (`compositeOver`, almost always --background)
// using the same gamma-space "over" blend a browser actually performs
// for CSS opacity — not a linear-light blend, which would give a
// different, less accurate number.
//
// contrast-pairs.json deliberately excludes one pair that was in its
// first draft: --destructive-foreground on --destructive (modeled
// after Button's other variants' own foreground/background pairing).
// Running this check for the first time found it fails dark mode
// (2.63:1) — but a grep confirmed `--destructive-foreground` has zero
// real `text-destructive-foreground` call sites anywhere in the app:
// Button's real destructive variant (components/ui/button.tsx, real
// shadcn stock source) hardcodes `text-white` instead, never reads
// that token. Testing it would be testing a pairing nothing actually
// renders — same "only check what's real" discipline check-variant-
// visual-coverage.mjs's coveredBy:null applies to Badge variants.
// --destructive-foreground itself is dead and still real-contrast-
// wrong in dark mode; left as-is rather than fixed here, since fixing
// an unused token isn't this check's job — flagged for a future pass.

import { readFileSync } from "fs";
import { oklch, rgb, wcagContrast } from "culori";

const GLOBALS_CSS = "app/globals.css";
const PAIRS_PATH = "scripts/contrast-pairs.json";
const MIN_RATIO = 4.5; // WCAG AA, normal text

const pairs = JSON.parse(readFileSync(PAIRS_PATH, "utf8"));
const css = readFileSync(GLOBALS_CSS, "utf8");

// Same brace-depth extraction as check-token-variant-mapping.mjs —
// robust to indentation, doesn't assume a fixed closing-brace shape.
function extractBlock(content, marker) {
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

function parseTokens(block) {
  const tokens = new Map();
  const re = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

const lightBlock = extractBlock(css, ":root {");
const darkBlock = extractBlock(css, ".dark {");
if (!lightBlock || !darkBlock) {
  console.error(`FAIL: couldn't find ":root {" and ".dark {" blocks in ${GLOBALS_CSS} — this check's parser is stale.`);
  process.exit(1);
}

const THEMES = {
  light: parseTokens(lightBlock),
  dark: parseTokens(darkBlock),
};

function resolve(themeTokens, name) {
  const raw = themeTokens.get(name);
  if (!raw) return null;
  const parsed = oklch(raw);
  return parsed ? rgb(parsed) : null;
}

function composite(fgRgb, alpha, backdropRgb) {
  return {
    mode: "rgb",
    r: fgRgb.r * alpha + backdropRgb.r * (1 - alpha),
    g: fgRgb.g * alpha + backdropRgb.g * (1 - alpha),
    b: fgRgb.b * alpha + backdropRgb.b * (1 - alpha),
  };
}

let failed = false;

for (const themeName of Object.keys(THEMES)) {
  const tokens = THEMES[themeName];
  for (const pair of pairs) {
    const fgColor = resolve(tokens, pair.fg);
    let bgColor = resolve(tokens, pair.bg);

    if (!fgColor || !bgColor) {
      console.error(
        `FAIL: ${PAIRS_PATH}'s "${pair.label}" references an unknown token (--${pair.fg} or --${pair.bg}) ` +
          `in the ${themeName} theme — check app/globals.css.`,
      );
      failed = true;
      continue;
    }

    if (pair.bgOpacity != null) {
      const backdrop = resolve(tokens, pair.compositeOver ?? "background");
      if (!backdrop) {
        console.error(`FAIL: ${PAIRS_PATH}'s "${pair.label}" has no resolvable compositeOver token in the ${themeName} theme.`);
        failed = true;
        continue;
      }
      bgColor = composite(bgColor, pair.bgOpacity, backdrop);
    }

    const ratio = wcagContrast(fgColor, bgColor);
    const min = pair.minRatio ?? MIN_RATIO;
    if (ratio < min) {
      console.error(
        `FAIL: ${themeName} mode — "${pair.label}" (--${pair.fg} on --${pair.bg}${pair.bgOpacity != null ? `/${pair.bgOpacity * 100}` : ""}) ` +
          `is ${ratio.toFixed(2)}:1, below ${min}:1.`,
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error("\nDarken the foreground (or lighten the background) token and re-run — see --destructive's comment in app/globals.css for the pattern.");
  process.exit(1);
}

console.log(`ok: all ${pairs.length} documented token pairs pass WCAG AA contrast in both light and dark mode`);
