#!/usr/bin/env node
// Pulls one component's real, current source from shadcn/ui's official
// GitHub repo (ADR 0014).
//
// Writes to components/ui/ ONLY with --write — components/ui/ is a
// shared barrel every existing (CARE-themed) screen already imports
// from, and ADR 0014's rollout is new-screens-first, not a blanket
// swap. Without --write, this prints to stdout so you can inspect the
// real source before deciding whether/where to place it (a scratch
// path, or components/ui/ once you're actually building the screen
// that needs it). Learned the hard way: an early version of this
// script wrote straight into components/ui/button.tsx and clobbered
// the live CARE version every shipped screen depends on before any
// rollout decision had been made for that specific component.
//
// Usage:
//   node scripts/pull-shadcn-component.mjs <name>                    # prints to stdout
//   node scripts/pull-shadcn-component.mjs <name> --write            # writes components/ui/<name>.tsx
//   node scripts/pull-shadcn-component.mjs <name> --from /path/to/local/shadcn-ui-checkout
//
// Why not `npx shadcn add <name>`: the CLI's `add` command resolves
// components against ui.shadcn.com's live registry API, which this
// sandboxed session's egress policy denies outright (confirmed via
// $HTTPS_PROXY/__agentproxy/status — "gateway answered 403 to CONNECT"
// for ui.shadcn.com). raw.githubusercontent.com IS reachable, and the
// new-york-v4 style's actual component source is checked into the repo
// as static .tsx files (not just generated at docs-site build time), at
// apps/v4/registry/new-york-v4/ui/<name>.tsx — this script fetches that
// directly. Same shape as scripts/pull-care-component.mjs's --from
// fallback, just without needing one first: raw.githubusercontent.com
// worked in this environment out of the box.
//
// shadcn's v4 registry source imports `cn` from a bare package named
// "cn" (a cross-framework registry convention) — this repo's own
// lib/utils.ts already exports the identical clsx+tailwind-merge `cn`
// helper shadcn expects, so the only real rewrite needed is that one
// import specifier, not the implementation.
//
// --from is for environments without network access to
// raw.githubusercontent.com — point it at a local
// `git clone https://github.com/shadcn-ui/ui` checkout.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const [, , name, ...rest] = process.argv;
if (!name) {
  console.error("Usage: node scripts/pull-shadcn-component.mjs <name> [--from <local-shadcn-ui-checkout>]");
  process.exit(1);
}

const fromIdx = rest.indexOf("--from");
const localRoot = fromIdx !== -1 ? rest[fromIdx + 1] : null;

const REGISTRY_PATH = "apps/v4/registry/new-york-v4/ui";

async function loadSource(componentName) {
  if (localRoot) {
    const p = path.join(localRoot, REGISTRY_PATH, `${componentName}.tsx`);
    if (!existsSync(p)) throw new Error(`No local source found for "${componentName}" at ${p}`);
    return readFile(p, "utf8");
  }
  const url = `https://raw.githubusercontent.com/shadcn-ui/ui/main/${REGISTRY_PATH}/${componentName}.tsx`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return res.text();
}

const source = await loadSource(name);
const rewritten = source.replace(/from "cn"/g, 'from "@/lib/utils"');

if (rest.includes("--write")) {
  const destPath = path.join("components/ui", `${name}.tsx`);
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, rewritten, "utf8");
  console.error(`Wrote ${destPath} (shadcn/ui new-york-v4, real source verified via raw.githubusercontent.com)`);
} else {
  process.stdout.write(rewritten);
}

console.error(
  "Check the file's own imports for anything beyond React/cn/class-variance-authority/radix-ui/lucide-react " +
    "(a sibling hook or util) — pull those the same way before wiring this into a screen.",
);
